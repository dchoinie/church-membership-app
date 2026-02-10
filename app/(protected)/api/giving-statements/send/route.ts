import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant-context";
import { db } from "@/db";
import { givingStatements, household, members, churches } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { canManageGivingStatements } from "@/lib/permissions-server";
import { sendGivingStatementEmail } from "@/lib/email";
import { checkCsrfToken } from "@/lib/csrf";

export const dynamic = "force-dynamic";

/**
 * POST /api/giving-statements/send
 * Sends giving statements via email to household(s)
 * 
 * Body:
 * - statementIds: string[] (array of statement IDs to send)
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
        { error: "You do not have permission to send giving statements" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { statementIds } = body;

    if (!statementIds || !Array.isArray(statementIds) || statementIds.length === 0) {
      return NextResponse.json(
        { error: "statementIds array is required" },
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

    const church = churchData[0];

    // Get statements to send
    const statements = await db
      .select({
        id: givingStatements.id,
        householdId: givingStatements.householdId,
        year: givingStatements.year,
        totalAmount: givingStatements.totalAmount,
        statementNumber: givingStatements.statementNumber,
        pdfUrl: givingStatements.pdfUrl,
        householdName: household.name,
      })
      .from(givingStatements)
      .innerJoin(household, eq(givingStatements.householdId, household.id))
      .where(
        and(
          eq(givingStatements.churchId, churchId),
          inArray(givingStatements.id, statementIds)
        )
      );

    if (!statements || statements.length === 0) {
      return NextResponse.json(
        { error: "No statements found" },
        { status: 404 }
      );
    }

    // Send emails for each statement
    const results = [];
    const errors = [];

    for (const statement of statements) {
      try {
        // Get head of household email (primary contact)
        const contacts = await db
          .select({
            email1: members.email1,
            firstName: members.firstName,
            lastName: members.lastName,
          })
          .from(members)
          .where(
            and(
              eq(members.householdId, statement.householdId),
              eq(members.churchId, churchId),
              eq(members.sequence, "head_of_house")
            )
          )
          .limit(1);

        // If no head of household found, try to get any member with email1
        let contact = contacts[0];
        if (!contact || !contact.email1) {
          const fallbackContacts = await db
            .select({
              email1: members.email1,
              firstName: members.firstName,
              lastName: members.lastName,
            })
            .from(members)
            .where(
              and(
                eq(members.householdId, statement.householdId),
                eq(members.churchId, churchId)
              )
            )
            .limit(1);
          
          contact = fallbackContacts.find(c => c.email1) || fallbackContacts[0];
        }

        if (!contact || !contact.email1) {
          errors.push({
            statementId: statement.id,
            householdName: statement.householdName,
            error: "No contact email found for household",
          });
          
          // Update status to failed
          await db
            .update(givingStatements)
            .set({
              emailStatus: "failed",
            })
            .where(eq(givingStatements.id, statement.id));
          
          continue;
        }

        const recipientEmail = contact.email1;
        const recipientName = `${contact.firstName} ${contact.lastName}`.trim();

        // Extract PDF buffer from data URL
        if (!statement.pdfUrl) {
          errors.push({
            statementId: statement.id,
            householdName: statement.householdName,
            error: "PDF not found for statement",
          });
          continue;
        }

        // Send email with PDF attachment
        const emailResult = await sendGivingStatementEmail({
          to: recipientEmail,
          recipientName,
          churchName: church.name,
          year: statement.year,
          totalAmount: parseFloat(statement.totalAmount || "0"),
          pdfUrl: statement.pdfUrl,
          statementNumber: statement.statementNumber,
        });

        if (emailResult.success) {
          // Update statement as sent
          await db
            .update(givingStatements)
            .set({
              sentAt: new Date(),
              sentBy: userId,
              emailStatus: "sent",
            })
            .where(eq(givingStatements.id, statement.id));

          results.push({
            statementId: statement.id,
            householdName: statement.householdName,
            email: recipientEmail,
            status: "sent",
          });
        } else {
          // Update status to failed
          await db
            .update(givingStatements)
            .set({
              emailStatus: "failed",
            })
            .where(eq(givingStatements.id, statement.id));

          errors.push({
            statementId: statement.id,
            householdName: statement.householdName,
            error: emailResult.error || "Failed to send email",
          });
        }
      } catch (error) {
        console.error(`Error sending statement ${statement.id}:`, error);
        errors.push({
          statementId: statement.id,
          householdName: statement.householdName,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        // Update status to failed
        await db
          .update(givingStatements)
          .set({
            emailStatus: "failed",
          })
          .where(eq(givingStatements.id, statement.id));
      }
    }

    return NextResponse.json({
      success: true,
      sent: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error sending giving statements:", error);
    return NextResponse.json(
      {
        error: "Failed to send giving statements",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
