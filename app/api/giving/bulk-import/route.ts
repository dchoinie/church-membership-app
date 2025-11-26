import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

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

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 },
      );
    }

    // Read file content
    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV file must have at least a header row and one data row" },
        { status: 400 },
      );
    }

    // Parse header row
    const csvHeaders = parseCSVLine(lines[0]);
    const headerMap: Record<string, number> = {};
    csvHeaders.forEach((header, index) => {
      headerMap[header.trim().toLowerCase()] = index;
    });

    // Validate required columns - need either envelopeNumber or memberId, plus amount and dateGiven
    const hasEnvelopeNumber = headerMap.hasOwnProperty("envelope number") || headerMap.hasOwnProperty("envelopenumber");
    const hasMemberId = headerMap.hasOwnProperty("member id") || headerMap.hasOwnProperty("memberid");
    const hasAmount = headerMap.hasOwnProperty("amount");
    const hasDateGiven = headerMap.hasOwnProperty("date given") || headerMap.hasOwnProperty("dategiven") || headerMap.hasOwnProperty("date");

    if (!hasAmount) {
      return NextResponse.json(
        { error: "Missing required column: amount" },
        { status: 400 },
      );
    }

    if (!hasDateGiven) {
      return NextResponse.json(
        { error: "Missing required column: dateGiven (or 'date given' or 'date')" },
        { status: 400 },
      );
    }

    if (!hasEnvelopeNumber && !hasMemberId) {
      return NextResponse.json(
        { error: "Missing required column: envelopeNumber (or 'envelope number') or memberId (or 'member id')" },
        { status: 400 },
      );
    }

    // Fetch all members with envelope numbers for lookup
    // Include sex and dateOfBirth for head of household determination
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

    // Process data rows
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    const recordsToInsert: Array<{
      memberId: string;
      amount: string;
      dateGiven: string;
      notes: string | null;
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);

        // Extract values using header map
        const getValue = (key: string, altKeys?: string[]): string | null => {
          const keys = [key, ...(altKeys || [])];
          for (const k of keys) {
            const index = headerMap[k.toLowerCase()];
            if (index !== undefined && index < values.length) {
              const value = values[index]?.trim();
              if (value !== "" && value !== null && value !== undefined) {
                return value;
              }
            }
          }
          return null;
        };

        // Get identifier (envelope number or member ID)
        const envelopeNumberStr = getValue("envelope number", ["envelopenumber"]);
        const memberIdStr = getValue("member id", ["memberid", "member_id"]);

        // Get required fields
        const amountStr = getValue("amount");
        const dateGivenStr = getValue("date given", ["dategiven", "date", "dategiven"]);
        const notesStr = getValue("notes", ["note"]);

        // Validate required fields
        if (!amountStr || !dateGivenStr) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Missing required fields (amount or dateGiven)`,
          );
          continue;
        }

        // Validate amount
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Invalid amount (must be a positive number)`,
          );
          continue;
        }

        // Validate date
        let dateGiven: string;
        try {
          const parsedDate = new Date(dateGivenStr);
          if (isNaN(parsedDate.getTime())) {
            results.failed++;
            results.errors.push(
              `Row ${i + 1}: Invalid date format (use YYYY-MM-DD)`,
            );
            continue;
          }
          // Format as YYYY-MM-DD
          dateGiven = parsedDate.toISOString().split("T")[0];
        } catch {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Invalid date format (use YYYY-MM-DD)`,
          );
          continue;
        }

        // Find head of household member
        let targetMemberId: string;

        if (envelopeNumberStr) {
          const envelopeNum = parseInt(envelopeNumberStr, 10);
          if (isNaN(envelopeNum)) {
            results.failed++;
            results.errors.push(
              `Row ${i + 1}: Invalid envelope number`,
            );
            continue;
          }
          const membersForEnvelope = membersByEnvelope.get(envelopeNum);
          if (!membersForEnvelope || membersForEnvelope.length === 0) {
            results.failed++;
            results.errors.push(
              `Row ${i + 1}: No members found for envelope number ${envelopeNum}`,
            );
            continue;
          }

          // Find head of household: oldest male member in the household
          // If no males, fallback to oldest member overall
          // If no dates, fallback to first member
          const findHeadOfHousehold = (members: typeof membersForEnvelope): string => {
            // Filter for males
            const males = members.filter(m => m.sex === "male");
            
            if (males.length > 0) {
              // Sort males by dateOfBirth (oldest first)
              const sortedMales = males.sort((a, b) => {
                if (!a.dateOfBirth) return 1; // No date goes to end
                if (!b.dateOfBirth) return -1;
                return new Date(a.dateOfBirth).getTime() - new Date(b.dateOfBirth).getTime();
              });
              return sortedMales[0].id;
            }
            
            // No males found, use oldest member overall
            const sortedAll = members.sort((a, b) => {
              if (!a.dateOfBirth) return 1; // No date goes to end
              if (!b.dateOfBirth) return -1;
              return new Date(a.dateOfBirth).getTime() - new Date(b.dateOfBirth).getTime();
            });
            
            return sortedAll[0].id;
          };

          targetMemberId = findHeadOfHousehold(membersForEnvelope);
        } else if (memberIdStr) {
          const member = membersById.get(memberIdStr);
          if (!member) {
            results.failed++;
            results.errors.push(
              `Row ${i + 1}: Member not found with ID ${memberIdStr}`,
            );
            continue;
          }
          targetMemberId = member.id;
        } else {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Must provide either envelopeNumber or memberId`,
          );
          continue;
        }

        // Create one record per envelope number (household level)
        recordsToInsert.push({
          memberId: targetMemberId,
          amount: amount.toString(),
          dateGiven,
          notes: notesStr || null,
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
    console.error("Error importing giving records:", error);
    return NextResponse.json(
      {
        error: "Failed to import giving records",
      },
      { status: 500 },
    );
  }
}

// Simple CSV parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // Field separator
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current);

  return result;
}

