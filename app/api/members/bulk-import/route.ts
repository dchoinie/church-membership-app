import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { members, household } from "@/db/schema";

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
    const headers = parseCSVLine(lines[0]);
    const headerMap: Record<string, number> = {};
    headers.forEach((header, index) => {
      headerMap[header.trim().toLowerCase()] = index;
    });

    // Validate required columns
    const requiredColumns = ["first name", "last name"];
    const missingColumns = requiredColumns.filter(
      (col) => !headerMap[col.toLowerCase()],
    );

    if (missingColumns.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required columns: ${missingColumns.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Process data rows
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);

        // Extract values using header map
        const getValue = (key: string): string | null => {
          const index = headerMap[key.toLowerCase()];
          if (index === undefined || index >= values.length) return null;
          const value = values[index]?.trim();
          return value === "" ? null : value;
        };

        const firstName = getValue("first name");
        const lastName = getValue("last name");

        // Validate required fields
        if (!firstName || !lastName) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Missing required fields (First Name or Last Name)`,
          );
          continue;
        }

        // Parse dates
        let parsedDateOfBirth: Date | null = null;
        let parsedBaptismDate: Date | null = null;
        let parsedConfirmationDate: Date | null = null;
        let parsedDateReceived: Date | null = null;
        let parsedDateRemoved: Date | null = null;
        let parsedDeceasedDate: Date | null = null;

        const dateOfBirthStr = getValue("date of birth");
        if (dateOfBirthStr) {
          try {
            parsedDateOfBirth = new Date(dateOfBirthStr);
            if (isNaN(parsedDateOfBirth.getTime())) {
              parsedDateOfBirth = null;
            }
          } catch {
            // Invalid date, will be null
          }
        }

        const baptismDateStr = getValue("baptism date");
        if (baptismDateStr) {
          try {
            parsedBaptismDate = new Date(baptismDateStr);
            if (isNaN(parsedBaptismDate.getTime())) {
              parsedBaptismDate = null;
            }
          } catch {
            // Invalid date, will be null
          }
        }

        const confirmationDateStr = getValue("confirmation date");
        if (confirmationDateStr) {
          try {
            parsedConfirmationDate = new Date(confirmationDateStr);
            if (isNaN(parsedConfirmationDate.getTime())) {
              parsedConfirmationDate = null;
            }
          } catch {
            // Invalid date, will be null
          }
        }

        const dateReceivedStr = getValue("date received");
        if (dateReceivedStr) {
          try {
            parsedDateReceived = new Date(dateReceivedStr);
            if (isNaN(parsedDateReceived.getTime())) {
              parsedDateReceived = null;
            }
          } catch {
            // Invalid date, will be null
          }
        }

        const dateRemovedStr = getValue("date removed");
        if (dateRemovedStr) {
          try {
            parsedDateRemoved = new Date(dateRemovedStr);
            if (isNaN(parsedDateRemoved.getTime())) {
              parsedDateRemoved = null;
            }
          } catch {
            // Invalid date, will be null
          }
        }

        const deceasedDateStr = getValue("deceased date");
        if (deceasedDateStr) {
          try {
            parsedDeceasedDate = new Date(deceasedDateStr);
            if (isNaN(parsedDeceasedDate.getTime())) {
              parsedDeceasedDate = null;
            }
          } catch {
            // Invalid date, will be null
          }
        }

        // Handle household - check if household ID exists or create new household
        // All members must belong to a household
        let householdId: string | null = null;
        const householdIdStr = getValue("household id");
        const createNewHousehold = getValue("create new household")?.toLowerCase() === "true";

        if (createNewHousehold) {
          // Create new household
          const [newHousehold] = await db
            .insert(household)
            .values({
              name: getValue("household name") || null,
              type: getValue("household type") || "individual",
            })
            .returning();
          householdId = newHousehold.id;
        } else if (householdIdStr) {
          // Check if household exists
          const [existingHousehold] = await db
            .select()
            .from(household)
            .where(eq(household.id, householdIdStr))
            .limit(1);

          if (!existingHousehold) {
            results.failed++;
            results.errors.push(
              `Row ${i + 1}: Household ID ${householdIdStr} not found`,
            );
            continue;
          }
          householdId = householdIdStr;
        } else {
          // Household is required - fail this row
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Household is required. Please provide Household ID or set Create New Household to true`,
          );
          continue;
        }

        // Prepare member data
        const memberData = {
          firstName,
          middleName: getValue("middle name") || null,
          lastName,
          suffix: getValue("suffix") || null,
          preferredName: getValue("preferred name") || null,
          maidenName: getValue("maiden name") || null,
          title: getValue("title") || null,
          sex: getValue("sex") || null,
          dateOfBirth: parsedDateOfBirth
            ? parsedDateOfBirth.toISOString().split("T")[0]
            : null,
          email1: getValue("email1") || getValue("email") || null,
          email2: getValue("email2") || null,
          phoneHome: getValue("phone home") || null,
          phoneCell1: getValue("phone cell1") || getValue("phone") || null,
          phoneCell2: getValue("phone cell2") || null,
          baptismDate: parsedBaptismDate
            ? parsedBaptismDate.toISOString().split("T")[0]
            : null,
          confirmationDate: parsedConfirmationDate
            ? parsedConfirmationDate.toISOString().split("T")[0]
            : null,
          receivedBy: getValue("received by") || null,
          dateReceived: parsedDateReceived
            ? parsedDateReceived.toISOString().split("T")[0]
            : null,
          removedBy: getValue("removed by") || null,
          dateRemoved: parsedDateRemoved
            ? parsedDateRemoved.toISOString().split("T")[0]
            : null,
          deceasedDate: parsedDeceasedDate
            ? parsedDeceasedDate.toISOString().split("T")[0]
            : null,
          membershipCode: getValue("membership code") || null,
          envelopeNumber: getValue("envelope number") ? parseInt(getValue("envelope number")!) : null,
          participation: (() => {
            const status = getValue("participation") || getValue("membership status")?.toLowerCase();
            const validStatuses = ["active", "visitor", "inactive", "transferred", "deceased"];
            return validStatuses.includes(status || "") ? status : "active";
          })(),
          householdId,
        };

        // Check for duplicate email if email1 is provided
        if (memberData.email1) {
          const [existingMember] = await db
            .select()
            .from(members)
            .where(eq(members.email1, memberData.email1))
            .limit(1);

          if (existingMember) {
            results.failed++;
            results.errors.push(
              `Row ${i + 1}: Email ${memberData.email1} already exists`,
            );
            continue;
          }
        }

        // Insert member
        await db.insert(members).values(memberData);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Row ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error importing members:", error);
    return NextResponse.json(
      {
        error: "Failed to import members",
        details: error instanceof Error ? error.message : "Unknown error",
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

