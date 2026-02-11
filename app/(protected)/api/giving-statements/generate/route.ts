import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant-context";
import { db } from "@/db";
import { giving, givingCategories, household, givingStatements, churches, members, givingItems } from "@/db/schema";
import { eq, and, gte, lte, inArray, asc } from "drizzle-orm";
import {
  generateGivingStatementPDF,
  generateStatementNumber,
  validateChurchTaxInfo,
} from "@/lib/pdf-generator";
import { canManageGivingStatements } from "@/lib/permissions-server";
import { checkCsrfToken } from "@/lib/csrf";
import { decryptChurch } from "@/lib/encryption";

export const dynamic = "force-dynamic";

/**
 * POST /api/giving-statements/generate
 * Generates giving statement PDF(s) for one or all households
 * 
 * Body:
 * - year: number (required)
 * - householdId: string (optional - if omitted, generates for all households)
 * - preview: boolean (optional - if true, doesn't save to DB, just returns PDF)
 */
export async function POST(request: Request) {
  try {
    const csrfError = await checkCsrfToken(request);
    if (csrfError) {
      return csrfError;
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.user.id;
    const churchId = await getTenantFromRequest(request);

    if (!churchId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await canManageGivingStatements(userId, churchId);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "You do not have permission to generate giving statements" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { year, householdId, preview = false, skipValidation = false } = body;

    if (!year || typeof year !== "number") {
      return NextResponse.json(
        { error: "Year is required and must be a number" },
        { status: 400 }
      );
    }

    // Get church information
    const churchData = await db
      .select()
      .from(churches)
      .where(eq(churches.id, churchId))
      .limit(1);

    if (!churchData || churchData.length === 0) {
      return NextResponse.json({ error: "Church not found" }, { status: 404 });
    }

    const church = decryptChurch(churchData[0]);

    // Validate church tax information (required for IRS compliance)
    const validation = validateChurchTaxInfo(church);
    if (!validation.valid && !skipValidation) {
      // Return a special response that requires user confirmation
      return NextResponse.json(
        {
          requiresConfirmation: true,
          missing: validation.missing,
          message: `The following fields are recommended for IRS-compliant statements: ${validation.missing.join(", ")}.`,
        },
        { status: 200 }
      );
    }

    // Set date range for the tax year
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // If householdId provided, generate for single household
    // Otherwise generate for all households with giving in this year
    const householdIds = householdId
      ? [householdId]
      : await db
          .selectDistinct({ id: household.id })
          .from(giving)
          .innerJoin(members, eq(giving.memberId, members.id))
          .innerJoin(household, eq(members.householdId, household.id))
          .where(
            and(
              eq(household.churchId, churchId),
              gte(giving.dateGiven, startDate),
              lte(giving.dateGiven, endDate)
            )
          )
          .then((rows) => rows.map((r) => r.id));

    if (householdIds.length === 0) {
      return NextResponse.json(
        {
          error: "No giving records found",
          details: `No households have giving records for ${year}`,
        },
        { status: 404 }
      );
    }

    // Generate statements for each household
    const results = [];
    const errors = [];

    for (const hId of householdIds) {
      try {
        // Get household data
        const householdData = await db
          .select()
          .from(household)
          .where(and(eq(household.id, hId), eq(household.churchId, churchId)))
          .limit(1);

        if (!householdData || householdData.length === 0) {
          errors.push({
            householdId: hId,
            error: "Household not found",
          });
          continue;
        }

        const householdInfo = householdData[0];

        // Get all giving records for members in this household
        const householdMembers = await db
          .select({ id: members.id })
          .from(members)
          .where(and(eq(members.householdId, hId), eq(members.churchId, churchId)));

        if (householdMembers.length === 0) {
          errors.push({
            householdId: hId,
            householdName: householdInfo.name,
            error: "No members found in household",
          });
          continue;
        }

        const memberIds = householdMembers.map((m) => m.id);

        // Get giving records for these members in the date range
        const givingRecordsRaw = await db
          .select({
            id: giving.id,
            dateGiven: giving.dateGiven,
          })
          .from(giving)
          .where(
            and(
              inArray(giving.memberId, memberIds),
              gte(giving.dateGiven, startDate),
              lte(giving.dateGiven, endDate)
            )
          )
          .orderBy(giving.dateGiven);

        if (givingRecordsRaw.length === 0) {
          errors.push({
            householdId: hId,
            householdName: householdInfo.name,
            error: "No giving records found for this period",
          });
          continue;
        }

        // Get all giving items for these records
        const givingIds = givingRecordsRaw.map((g) => g.id);
        const allItems = await db
          .select({
            givingId: givingItems.givingId,
            dateGiven: giving.dateGiven,
            categoryName: givingCategories.name,
            amount: givingItems.amount,
          })
          .from(givingItems)
          .innerJoin(giving, eq(givingItems.givingId, giving.id))
          .innerJoin(givingCategories, eq(givingItems.categoryId, givingCategories.id))
          .where(inArray(givingItems.givingId, givingIds))
          .orderBy(asc(giving.dateGiven), asc(givingCategories.displayOrder), asc(givingCategories.name));

        if (allItems.length === 0) {
          errors.push({
            householdId: hId,
            householdName: householdInfo.name,
            error: "No giving items found for this period",
          });
          continue;
        }

        // Calculate total
        const totalAmount = allItems.reduce(
          (sum, item) => sum + parseFloat(item.amount || "0"),
          0
        );

        // Generate statement number
        const statementNumber = generateStatementNumber(year, hId);

        // Format items for PDF (dateGiven is already a string in YYYY-MM-DD format)
        const items = allItems.map((item) => ({
          dateGiven: item.dateGiven,
          categoryName: item.categoryName || "General",
          amount: parseFloat(item.amount || "0"),
        }));

        // Generate PDF
        const pdfBuffer = await generateGivingStatementPDF({
          church: {
            name: church.name,
            address: church.address,
            city: church.city,
            state: church.state,
            zip: church.zip,
            phone: church.phone,
            email: church.email,
            taxId: church.taxId,
            is501c3: church.is501c3,
            taxStatementDisclaimer: church.taxStatementDisclaimer,
            goodsServicesProvided: church.goodsServicesProvided,
            goodsServicesStatement: church.goodsServicesStatement,
          },
          household: {
            name: householdInfo.name || "",
            address1: householdInfo.address1 || null,
            address2: householdInfo.address2 || null,
            city: householdInfo.city || null,
            state: householdInfo.state || null,
            zip: householdInfo.zip || null,
          },
          year,
          startDate,
          endDate,
          items,
          statementNumber,
        });

        // If preview mode, just return the PDF
        if (preview && householdIds.length === 1) {
          return new NextResponse(pdfBuffer as unknown as BodyInit, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `inline; filename="giving-statement-${year}-preview.pdf"`,
            },
          });
        }

        // Convert buffer to base64 for storage (in production, upload to S3/storage)
        const pdfBase64 = pdfBuffer.toString("base64");
        const pdfUrl = `data:application/pdf;base64,${pdfBase64}`;

        // Save to database if not preview
        if (!preview) {
          // Check if statement already exists for this household and year
          const existing = await db
            .select()
            .from(givingStatements)
            .where(
              and(
                eq(givingStatements.householdId, hId),
                eq(givingStatements.year, year),
                eq(givingStatements.previewOnly, false)
              )
            )
            .limit(1);

          if (existing && existing.length > 0) {
            // Update existing statement
            await db
              .update(givingStatements)
              .set({
                totalAmount: totalAmount.toFixed(2),
                statementNumber,
                generatedAt: new Date(),
                generatedBy: userId,
                pdfUrl,
                emailStatus: null,
                sentAt: null,
                sentBy: null,
              })
              .where(eq(givingStatements.id, existing[0].id));

            results.push({
              householdId: hId,
              householdName: householdInfo.name,
              statementId: existing[0].id,
              statementNumber,
              totalAmount,
              status: "updated",
            });
          } else {
            // Insert new statement
            const [newStatement] = await db
              .insert(givingStatements)
              .values({
                churchId,
                householdId: hId,
                year,
                startDate,
                endDate,
                totalAmount: totalAmount.toFixed(2),
                statementNumber,
                generatedAt: new Date(),
                generatedBy: userId,
                pdfUrl,
                previewOnly: false,
              })
              .returning();

            results.push({
              householdId: hId,
              householdName: householdInfo.name,
              statementId: newStatement.id,
              statementNumber,
              totalAmount,
              status: "created",
            });
          }
        } else {
          results.push({
            householdId: hId,
            householdName: householdInfo.name,
            statementNumber,
            totalAmount,
            status: "preview",
          });
        }
      } catch (error) {
        console.error(`Error generating statement for household ${hId}:`, error);
        errors.push({
          householdId: hId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      year,
      preview,
      generated: results.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error generating giving statements:", error);
    return NextResponse.json(
      {
        error: "Failed to generate giving statements",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
