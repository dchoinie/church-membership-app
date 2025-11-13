import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { members, families } from "@/db/schema";

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
    const requiredColumns = ["first name", "last name", "membership date"];
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
        const membershipDate = getValue("membership date");

        // Validate required fields
        if (!firstName || !lastName || !membershipDate) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Missing required fields (First Name, Last Name, or Membership Date)`,
          );
          continue;
        }

        // Parse dates
        let parsedMembershipDate: Date;
        let parsedDateOfBirth: Date | null = null;
        let parsedBaptismDate: Date | null = null;

        try {
          parsedMembershipDate = new Date(membershipDate);
          if (isNaN(parsedMembershipDate.getTime())) {
            throw new Error("Invalid date");
          }
        } catch {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Invalid membership date format (use YYYY-MM-DD)`,
          );
          continue;
        }

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

        // Handle family - check if family ID exists or create new family
        let familyId: string | null = null;
        const familyIdStr = getValue("family id");
        const createNewFamily = getValue("create new family")?.toLowerCase() === "true";

        if (createNewFamily) {
          // Create new family
          const [newFamily] = await db
            .insert(families)
            .values({})
            .returning();
          familyId = newFamily.id;
        } else if (familyIdStr) {
          // Check if family exists
          const [existingFamily] = await db
            .select()
            .from(families)
            .where(eq(families.id, familyIdStr))
            .limit(1);

          if (!existingFamily) {
            results.failed++;
            results.errors.push(
              `Row ${i + 1}: Family ID ${familyIdStr} not found`,
            );
            continue;
          }
          familyId = familyIdStr;
        }

        // Prepare member data
        const memberData = {
          firstName,
          lastName,
          membershipDate: parsedMembershipDate.toISOString().split("T")[0],
          email: getValue("email") || null,
          phone: getValue("phone") || null,
          addressLine1: getValue("address line 1") || null,
          addressLine2: getValue("address line 2") || null,
          city: getValue("city") || null,
          state: getValue("state") || null,
          zipCode: getValue("zip code") || null,
          dateOfBirth: parsedDateOfBirth
            ? parsedDateOfBirth.toISOString().split("T")[0]
            : null,
          baptismDate: parsedBaptismDate
            ? parsedBaptismDate.toISOString().split("T")[0]
            : null,
          membershipStatus: (() => {
            const status = getValue("membership status")?.toLowerCase();
            const validStatuses = ["active", "inactive", "pending", "transferred", "deceased"];
            return validStatuses.includes(status || "") ? status : "active";
          })(),
          familyRole: (() => {
            const role = getValue("family role")?.toLowerCase();
            if (!role || role === "__none__") return null;
            const validRoles = ["father", "mother", "son", "daughter"];
            return validRoles.includes(role) ? role : null;
          })(),
          notes: getValue("notes") || null,
          photoUrl: getValue("photo url") || null,
          familyId,
        };

        // Check for duplicate email if email is provided
        if (memberData.email) {
          const [existingMember] = await db
            .select()
            .from(members)
            .where(eq(members.email, memberData.email))
            .limit(1);

          if (existingMember) {
            results.failed++;
            results.errors.push(
              `Row ${i + 1}: Email ${memberData.email} already exists`,
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

