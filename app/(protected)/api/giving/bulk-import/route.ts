import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { giving, members } from "@/db/schema";
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

    // Validate required columns - need either envelopeNumber or memberId, plus dateGiven
    // Check for new format (six amount columns) or old formats (single amount or three amounts)
    const hasEnvelopeNumber = headerMap.hasOwnProperty("envelope number") || headerMap.hasOwnProperty("envelopenumber");
    const hasMemberId = headerMap.hasOwnProperty("member id") || headerMap.hasOwnProperty("memberid");
    const hasAmount = headerMap.hasOwnProperty("amount");
    const hasGeneralFund = headerMap.hasOwnProperty("general fund") || headerMap.hasOwnProperty("generalfund");
    const hasCurrent = headerMap.hasOwnProperty("current");
    const hasMemorials = headerMap.hasOwnProperty("memorials");
    const hasDistrictSynod = headerMap.hasOwnProperty("district synod") || headerMap.hasOwnProperty("districtsynod");
    const hasMission = headerMap.hasOwnProperty("mission");
    const hasDebt = headerMap.hasOwnProperty("debt");
    const hasSchool = headerMap.hasOwnProperty("school");
    const hasMiscellaneous = headerMap.hasOwnProperty("miscellaneous");
    const hasDateGiven = headerMap.hasOwnProperty("date given") || headerMap.hasOwnProperty("dategiven") || headerMap.hasOwnProperty("date");

    // Must have at least one amount column (support old and new formats)
    const hasAnyAmount = hasAmount || hasGeneralFund || hasCurrent || hasMemorials || hasDistrictSynod || hasMission || hasDebt || hasSchool || hasMiscellaneous;
    if (!hasAnyAmount) {
      return NextResponse.json(
        { error: "Missing required column: at least one amount column is required" },
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

    // Fetch all members with envelope numbers for lookup (filtered by churchId)
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

    // Process data rows
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
        const dateGivenStr = getValue("date given", ["dategiven", "date", "dategiven"]);
        const notesStr = getValue("notes", ["note"]);

        // Get amount fields - support old formats (single amount or three amounts) and new format (six amounts)
        const amountStr = getValue("amount");
        const generalFundStr = getValue("general fund", ["generalfund"]);
        const currentStr = getValue("current");
        const memorialsStr = getValue("memorials");
        const districtSynodStr = getValue("district synod", ["districtsynod"]);
        const missionStr = getValue("mission");
        const debtStr = getValue("debt");
        const schoolStr = getValue("school");
        const miscellaneousStr = getValue("miscellaneous");

        // Validate required fields
        if (!dateGivenStr) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Missing required field (dateGiven)`,
          );
          continue;
        }

        // Parse amounts - support backward compatibility
        let currentAmount: number | null = null;
        let missionAmount: number | null = null;
        let memorialsAmount: number | null = null;
        let debtAmount: number | null = null;
        let schoolAmount: number | null = null;
        let miscellaneousAmount: number | null = null;

        const parseAmountField = (value: string | null, fieldName: string): number | null => {
          if (!value) return null;
          const amount = parseFloat(value);
          if (isNaN(amount) || amount < 0) {
            results.failed++;
            results.errors.push(
              `Row ${i + 1}: Invalid ${fieldName} amount (must be a non-negative number)`,
            );
            throw new Error("Invalid amount");
          }
          return amount > 0 ? amount : null;
        };

        try {
          // Old format 1: single "amount" column -> map to currentAmount
          if (amountStr) {
            currentAmount = parseAmountField(amountStr, "amount");
          }
          // Old format 2: "general fund" -> map to currentAmount
          else if (generalFundStr) {
            currentAmount = parseAmountField(generalFundStr, "general fund");
          }
          // New format: use current field directly
          else if (currentStr) {
            currentAmount = parseAmountField(currentStr, "current");
          }

          // Old format: "district synod" -> map to missionAmount
          if (districtSynodStr) {
            missionAmount = parseAmountField(districtSynodStr, "district synod");
          }
          // New format: use mission field directly
          else if (missionStr) {
            missionAmount = parseAmountField(missionStr, "mission");
          }

          // Memorials (same in both formats)
          if (memorialsStr) {
            memorialsAmount = parseAmountField(memorialsStr, "memorials");
          }

          // New fields
          if (debtStr) {
            debtAmount = parseAmountField(debtStr, "debt");
          }
          if (schoolStr) {
            schoolAmount = parseAmountField(schoolStr, "school");
          }
          if (miscellaneousStr) {
            miscellaneousAmount = parseAmountField(miscellaneousStr, "miscellaneous");
          }
        } catch {
          continue; // Error already added to results.errors
        }

        // Validate at least one amount is provided
        if (!currentAmount && !missionAmount && !memorialsAmount && !debtAmount && !schoolAmount && !miscellaneousAmount) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: At least one amount is required`,
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

          // Find head of household using sequence column
          const firstMember = membersForEnvelope[0];
          if (firstMember.householdId) {
            const [headOfHousehold] = await db
              .select({ id: members.id })
              .from(members)
              .where(
                and(
                  eq(members.householdId, firstMember.householdId),
                  eq(members.sequence, "head_of_house"),
                  eq(members.churchId, churchId)
                )
              )
              .limit(1);

            if (headOfHousehold) {
              targetMemberId = headOfHousehold.id;
            } else {
              // Fallback to first member if no head of house found
              targetMemberId = firstMember.id;
            }
          } else {
            // Fallback to first member if no household ID
            targetMemberId = firstMember.id;
          }
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
          currentAmount: currentAmount !== null ? currentAmount.toString() : null,
          missionAmount: missionAmount !== null ? missionAmount.toString() : null,
          memorialsAmount: memorialsAmount !== null ? memorialsAmount.toString() : null,
          debtAmount: debtAmount !== null ? debtAmount.toString() : null,
          schoolAmount: schoolAmount !== null ? schoolAmount.toString() : null,
          miscellaneousAmount: miscellaneousAmount !== null ? miscellaneousAmount.toString() : null,
          dateGiven,
          notes: notesStr ? sanitizeText(notesStr) : null,
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
          await tx.insert(giving).values(recordsToInsert);
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

