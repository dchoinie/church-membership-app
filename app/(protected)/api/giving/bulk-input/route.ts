import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { giving, members, givingItems, givingCategories } from "@/db/schema";
import { requireAdmin } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeText } from "@/lib/sanitize";

export async function POST(request: Request) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require admin role
    const { churchId } = await requireAdmin(request);

    const body = await request.json();
    const records = body.records || [];

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: "Records array is required and must not be empty" },
        { status: 400 },
      );
    }

    // Fetch all members with envelope numbers for lookup (filtered by churchId)
    type MemberForLookup = {
      id: string;
      householdId: string | null;
      envelopeNumber: number | null;
      sex: "male" | "female" | "other" | null;
      dateOfBirth: string | null;
    };
    
    const allMembers = await db
      .select({
        id: members.id,
        householdId: members.householdId,
        envelopeNumber: members.envelopeNumber,
        sex: members.sex,
        dateOfBirth: members.dateOfBirth,
      })
      .from(members)
      .where(eq(members.churchId, churchId));
    
    const membersByEnvelope = new Map<number, MemberForLookup[]>();
    const membersById = new Map<string, MemberForLookup>();

    allMembers.forEach((member) => {
      if (member.envelopeNumber !== null) {
        const existing = membersByEnvelope.get(member.envelopeNumber) || [];
        existing.push(member);
        membersByEnvelope.set(member.envelopeNumber, existing);
      }
      membersById.set(member.id, member);
    });

    // Helper function to find head of household using sequence column
    const findHeadOfHousehold = async (householdId: string | null): Promise<string | null> => {
      if (!householdId) return null;
      
      const [headOfHousehold] = await db
        .select({ id: members.id })
        .from(members)
        .where(
          and(
            eq(members.householdId, householdId),
            eq(members.sequence, "head_of_house"),
            eq(members.churchId, churchId)
          )
        )
        .limit(1);

      return headOfHousehold?.id || null;
    };

    // Get active categories for this church
    const categories = await db
      .select()
      .from(givingCategories)
      .where(and(
        eq(givingCategories.churchId, churchId),
        eq(givingCategories.isActive, true),
      ));

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    const recordsToInsert: Array<{
      memberId: string;
      dateGiven: string;
      notes: string | null;
      items: Array<{ categoryId: string; amount: string }>;
    }> = [];

    for (let i = 0; i < records.length; i++) {
      try {
        const record = records[i];

        // Validate required fields
        if (!record.envelopeNumber || !record.dateGiven) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Missing required fields (envelopeNumber and dateGiven)`,
          );
          continue;
        }

        // Validate envelope number
        const envelopeNum = parseInt(record.envelopeNumber, 10);
        if (isNaN(envelopeNum)) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Invalid envelope number`,
          );
          continue;
        }

        // Handle guest (envelope number 0) - find a guest member
        let targetMemberId: string;
        if (envelopeNum === 0) {
          const [guestMember] = await db
            .select({ id: members.id })
            .from(members)
            .where(and(eq(members.membershipCode, "GUEST"), eq(members.churchId, churchId)))
            .limit(1);

          if (!guestMember) {
            results.failed++;
            results.errors.push(
              `Row ${i + 1}: No guest member found. Please create a guest member through attendance records first.`,
            );
            continue;
          }

          targetMemberId = guestMember.id;
        } else {
          // Find members with this envelope number
          const membersForEnvelope = membersByEnvelope.get(envelopeNum);
          if (!membersForEnvelope || membersForEnvelope.length === 0) {
            results.failed++;
            results.errors.push(
              `Row ${i + 1}: No members found for envelope number ${envelopeNum}`,
            );
            continue;
          }

          // Find head of household using sequence column
          const firstMember = membersForEnvelope[0];
          targetMemberId = await findHeadOfHousehold(firstMember.householdId) || firstMember.id;
        }

        // Build items array from record.items
        if (!record.items || !Array.isArray(record.items) || record.items.length === 0) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: At least one giving item is required`,
          );
          continue;
        }

        const items: Array<{ categoryId: string; amount: string }> = [];
        for (const item of record.items) {
          if (!item.categoryId) {
            results.failed++;
            results.errors.push(
              `Row ${i + 1}: Invalid item - missing categoryId`,
            );
            continue;
          }

          // Verify category belongs to this church
          const category = categories.find(c => c.id === item.categoryId);
          if (!category) {
            results.failed++;
            results.errors.push(
              `Row ${i + 1}: Invalid categoryId ${item.categoryId}`,
            );
            continue;
          }

          const amount = typeof item.amount === "string" ? parseFloat(item.amount) : item.amount;
          if (isNaN(amount) || amount <= 0) {
            continue; // Skip zero/null amounts
          }

          items.push({
            categoryId: item.categoryId,
            amount: amount.toString(),
          });
        }

        // Validate at least one item with positive amount
        if (items.length === 0) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: At least one amount is required`,
          );
          continue;
        }

        // Validate date
        let dateGiven: string;
        try {
          const parsedDate = new Date(record.dateGiven);
          if (isNaN(parsedDate.getTime())) {
            results.failed++;
            results.errors.push(
              `Row ${i + 1}: Invalid date format (use YYYY-MM-DD)`,
            );
            continue;
          }
          dateGiven = parsedDate.toISOString().split("T")[0];
        } catch {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Invalid date format (use YYYY-MM-DD)`,
          );
          continue;
        }

        // Add to records to insert
        recordsToInsert.push({
          memberId: targetMemberId,
          dateGiven,
          notes: record.notes ? sanitizeText(record.notes) : null,
          items,
        });
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Row ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // Insert all records in a transaction
    if (recordsToInsert.length > 0) {
      try {
        await db.transaction(async (tx) => {
          for (const record of recordsToInsert) {
            // Insert giving record
            const [newGiving] = await tx.insert(giving).values({
              memberId: record.memberId,
              dateGiven: record.dateGiven,
              notes: record.notes,
            }).returning();

            // Insert giving items
            if (record.items.length > 0) {
              await tx.insert(givingItems).values(
                record.items.map(item => ({
                  givingId: newGiving.id,
                  categoryId: item.categoryId,
                  amount: item.amount,
                }))
              );
            }
          }
        });
        results.success = recordsToInsert.length;
      } catch (error) {
        results.failed += recordsToInsert.length;
        results.errors.push(
          `Database error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    return createErrorResponse(error);
  }
}

