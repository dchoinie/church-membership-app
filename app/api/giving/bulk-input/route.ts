import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { giving, members } from "@/db/schema";

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const records = body.records || [];

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: "Records array is required and must not be empty" },
        { status: 400 },
      );
    }

    // Fetch all members with envelope numbers for lookup
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
      .from(members);
    
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

    // Helper function to find head of household
    const findHeadOfHousehold = (members: typeof allMembers): string => {
      const males = members.filter(m => m.sex === "male");
      
      if (males.length > 0) {
        const sortedMales = males.sort((a, b) => {
          if (!a.dateOfBirth) return 1;
          if (!b.dateOfBirth) return -1;
          return new Date(a.dateOfBirth).getTime() - new Date(b.dateOfBirth).getTime();
        });
        return sortedMales[0].id;
      }
      
      const sortedAll = members.sort((a, b) => {
        if (!a.dateOfBirth) return 1;
        if (!b.dateOfBirth) return -1;
        return new Date(a.dateOfBirth).getTime() - new Date(b.dateOfBirth).getTime();
      });
      
      return sortedAll[0].id;
    };

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    const recordsToInsert: Array<{
      memberId: string;
      currentAmount: string | null;
      missionAmount: string | null;
      memorialsAmount: string | null;
      debtAmount: string | null;
      schoolAmount: string | null;
      miscellaneousAmount: string | null;
      dateGiven: string;
      notes: string | null;
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

        // Find members with this envelope number
        const membersForEnvelope = membersByEnvelope.get(envelopeNum);
        if (!membersForEnvelope || membersForEnvelope.length === 0) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: No members found for envelope number ${envelopeNum}`,
          );
          continue;
        }

        // Find head of household
        const targetMemberId = findHeadOfHousehold(membersForEnvelope);

        // Parse amounts
        const currentAmount = record.currentAmount ? parseFloat(record.currentAmount) : null;
        const missionAmount = record.missionAmount ? parseFloat(record.missionAmount) : null;
        const memorialsAmount = record.memorialsAmount ? parseFloat(record.memorialsAmount) : null;
        const debtAmount = record.debtAmount ? parseFloat(record.debtAmount) : null;
        const schoolAmount = record.schoolAmount ? parseFloat(record.schoolAmount) : null;
        const miscellaneousAmount = record.miscellaneousAmount ? parseFloat(record.miscellaneousAmount) : null;

        // Validate at least one amount is provided
        if (!currentAmount && !missionAmount && !memorialsAmount && !debtAmount && !schoolAmount && !miscellaneousAmount) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: At least one amount is required`,
          );
          continue;
        }

        // Validate amounts are non-negative
        if (currentAmount !== null && (isNaN(currentAmount) || currentAmount < 0)) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Invalid current amount (must be a non-negative number)`,
          );
          continue;
        }
        if (missionAmount !== null && (isNaN(missionAmount) || missionAmount < 0)) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Invalid mission amount (must be a non-negative number)`,
          );
          continue;
        }
        if (memorialsAmount !== null && (isNaN(memorialsAmount) || memorialsAmount < 0)) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Invalid memorials amount (must be a non-negative number)`,
          );
          continue;
        }
        if (debtAmount !== null && (isNaN(debtAmount) || debtAmount < 0)) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Invalid debt amount (must be a non-negative number)`,
          );
          continue;
        }
        if (schoolAmount !== null && (isNaN(schoolAmount) || schoolAmount < 0)) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Invalid school amount (must be a non-negative number)`,
          );
          continue;
        }
        if (miscellaneousAmount !== null && (isNaN(miscellaneousAmount) || miscellaneousAmount < 0)) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Invalid miscellaneous amount (must be a non-negative number)`,
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
          currentAmount: currentAmount !== null ? currentAmount.toString() : null,
          missionAmount: missionAmount !== null ? missionAmount.toString() : null,
          memorialsAmount: memorialsAmount !== null ? memorialsAmount.toString() : null,
          debtAmount: debtAmount !== null ? debtAmount.toString() : null,
          schoolAmount: schoolAmount !== null ? schoolAmount.toString() : null,
          miscellaneousAmount: miscellaneousAmount !== null ? miscellaneousAmount.toString() : null,
          dateGiven,
          notes: record.notes || null,
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
        await db.insert(giving).values(recordsToInsert);
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
    console.error("Error bulk inserting giving records:", error);
    return NextResponse.json(
      {
        error: "Failed to bulk insert giving records",
      },
      { status: 500 },
    );
  }
}

