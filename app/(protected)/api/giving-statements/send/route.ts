import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/db";
import { givingStatements, household, member, churches } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { canManageGivingStatements } from "@/lib/permissions";
import { sendGivingStatementEmail } from "@/lib/email";

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
    const session = await auth();
    const churchId = session?.user?.churchId;
    const userId = session?.user?.id;

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
        // Get primary contact email for household
        const contacts = await db
          .select({
            email: member.email,
            firstName: member.firstName,
            lastName: member.lastName,
          })
          .from(member)
          .where(
            and(
              eq(member.householdId, statement.householdId),
              eq(member.isPrimary, true)
            )
          )
          .limit(1);

        if (!contacts || contacts.length === 0 || !contacts[0].email) {
          errors.push({
            statementId: statement.id,
            householdName: statement.householdName,
            error: "No primary contact email found for household",
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

        const contact = contacts[0];
        const recipientEmail = contact.email;
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
