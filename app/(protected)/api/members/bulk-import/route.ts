import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { members, household } from "@/db/schema";
import { requireAdmin } from "@/lib/api-helpers";
import { checkMemberLimit } from "@/lib/member-limits";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeText, sanitizeEmail } from "@/lib/sanitize";

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
    
    // Normalize header names for flexible matching
    const normalizeHeader = (header: string): string => {
      return header
        .trim()
        .replace(/\uFEFF/g, "") // Remove BOM
        .replace(/[_\s]+/g, " ") // Replace underscores and multiple spaces with single space
        .toLowerCase();
    };
    
    csvHeaders.forEach((header, index) => {
      const normalized = normalizeHeader(header);
      // Store both the normalized version and common variations
      headerMap[normalized] = index;
      // Also store without spaces for "FirstName" -> "firstname"
      headerMap[normalized.replace(/\s+/g, "")] = index;
    });

    // Validate required columns with flexible matching
    const requiredColumns = ["first name", "last name"];
    const findColumnIndex = (colName: string): number | undefined => {
      const normalized = normalizeHeader(colName);
      return headerMap[normalized] ?? headerMap[normalized.replace(/\s+/g, "")];
    };
    
    const missingColumns = requiredColumns.filter(
      (col) => findColumnIndex(col) === undefined,
    );

    if (missingColumns.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required columns: ${missingColumns.join(", ")}`,
          foundHeaders: csvHeaders,
          hint: "Required columns should be named 'First Name' or 'FirstName' (case-insensitive, spaces/underscores allowed)",
        },
        { status: 400 },
      );
    }

    // Calculate total members to be imported (excluding header row)
    const totalMembersToImport = lines.length - 1;

    // Check member limit before starting import
    const limitCheck = await checkMemberLimit(churchId, totalMembersToImport);
    if (!limitCheck.allowed) {
      const planName = limitCheck.plan === "premium" ? "Premium" : "Basic";
      const limitText = limitCheck.limit === Infinity ? "unlimited" : limitCheck.limit.toString();
      return NextResponse.json(
        {
          error: `Cannot import ${totalMembersToImport} members. Your ${planName} plan allows up to ${limitText} members, and you currently have ${limitCheck.currentCount} members. You can add up to ${limitCheck.remaining} more members. Upgrade to Premium for unlimited members.`,
        },
        { status: 403 },
      );
    }

    // Process data rows
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Track household groups created during this import
    // Maps household group value -> household ID
    const householdGroupMap = new Map<string, string>();

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);

        // Extract values using header map with flexible matching
        const getValue = (key: string): string | null => {
          const index = findColumnIndex(key);
          if (index === undefined || index >= values.length) return null;
          const value = values[index]?.trim();
          return value === "" ? null : value;
        };

        const firstNameRaw = getValue("first name");
        const lastNameRaw = getValue("last name");

        // Validate required fields
        if (!firstNameRaw || !lastNameRaw) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Missing required fields (First Name or Last Name)`,
          );
          continue;
        }

        // Sanitize names
        const firstName = sanitizeText(firstNameRaw);
        const lastName = sanitizeText(lastNameRaw);

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

        // Parse household alternate address dates
        let parsedAlternateAddressBegin: Date | null = null;
        let parsedAlternateAddressEnd: Date | null = null;

        const alternateAddressBeginStr = getValue("alternate address begin") || getValue("household alternate address begin");
        if (alternateAddressBeginStr) {
          try {
            parsedAlternateAddressBegin = new Date(alternateAddressBeginStr);
            if (isNaN(parsedAlternateAddressBegin.getTime())) {
              parsedAlternateAddressBegin = null;
            }
          } catch {
            // Invalid date, will be null
          }
        }

        const alternateAddressEndStr = getValue("alternate address end") || getValue("household alternate address end");
        if (alternateAddressEndStr) {
          try {
            parsedAlternateAddressEnd = new Date(alternateAddressEndStr);
            if (isNaN(parsedAlternateAddressEnd.getTime())) {
              parsedAlternateAddressEnd = null;
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
        const householdGroup = getValue("household group");

        // Helper to safely get string values (never return boolean)
        const getStringValue = (key: string): string | null => {
          const val = getValue(key);
          if (!val) return null;
          // Ensure we return a string, never a boolean
          const str = String(val).trim();
          return str || null;
        };

        // Check if we should use an existing household from a household group
        if (householdGroup && householdGroupMap.has(householdGroup)) {
          // Reuse existing household from this import session
          householdId = householdGroupMap.get(householdGroup)!;
        } else if (createNewHousehold) {
          // Validate and normalize household type
          const householdTypeRaw = getValue("household type");
          const validHouseholdTypes = ["family", "single", "other"];
          const householdType = householdTypeRaw && validHouseholdTypes.includes(householdTypeRaw.toLowerCase())
            ? householdTypeRaw.toLowerCase()
            : "single"; // Default to "single" instead of invalid "individual"

          // Create new household with all available fields
          const householdNameValue = getValue("household name");
          const householdName = (householdNameValue && typeof householdNameValue === "string" && householdNameValue.trim() !== "")
            ? householdNameValue.trim()
            : null;

          const [newHousehold] = await db
            .insert(household)
            .values({
              churchId,
              name: householdName,
              type: householdType as "family" | "single" | "other",
              isNonHousehold: getValue("is non household")?.toLowerCase() === "true" || false,
              personAssigned: getStringValue("person assigned") || null,
              ministryGroup: getStringValue("ministry group") || null,
              address1: getStringValue("household address1") || getStringValue("address1") || null,
              address2: getStringValue("household address2") || getStringValue("address2") || null,
              city: getStringValue("household city") || getStringValue("city") || null,
              state: getStringValue("household state") || getStringValue("state") || null,
              zip: getStringValue("household zip") || getStringValue("zip") || null,
              country: getStringValue("household country") || getStringValue("country") || null,
              alternateAddressBegin: parsedAlternateAddressBegin
                ? parsedAlternateAddressBegin.toISOString().split("T")[0]
                : null,
              alternateAddressEnd: parsedAlternateAddressEnd
                ? parsedAlternateAddressEnd.toISOString().split("T")[0]
                : null,
            })
            .returning();
          householdId = newHousehold.id;
          
          // Store in map if household group is provided
          if (householdGroup) {
            householdGroupMap.set(householdGroup, householdId);
          }
        } else if (householdIdStr) {
          // Check if household exists and belongs to church
          const [existingHousehold] = await db
            .select()
            .from(household)
            .where(and(eq(household.id, householdIdStr), eq(household.churchId, churchId)))
            .limit(1);

          if (!existingHousehold) {
            results.failed++;
            results.errors.push(
              `Row ${i + 1}: Household ID ${householdIdStr} not found`,
            );
            continue;
          }
          householdId = householdIdStr;
          
          // Store in map if household group is provided
          if (householdGroup) {
            householdGroupMap.set(householdGroup, householdId);
          }
        } else {
          // Auto-create a household for this member if none provided
          // Use member's name as household name, default to "single" type
          
          // Get household name - ensure it's always a string
          const householdNameValue = getStringValue("household name");
          // Build fallback name from member's name
          const memberName = [firstName, lastName].filter(Boolean).join(" ").trim();
          const householdName = householdNameValue || memberName || "New Household";
          
          // Ensure householdName is definitely a string (not boolean)
          const finalHouseholdName = typeof householdName === "string" 
            ? householdName 
            : String(householdName || memberName || "New Household");
          
          const householdTypeRaw = getValue("household type");
          const validHouseholdTypes = ["family", "single", "other"];
          const householdType = householdTypeRaw && validHouseholdTypes.includes(householdTypeRaw.toLowerCase())
            ? householdTypeRaw.toLowerCase()
            : "single";

          // Ensure all values are properly typed before insertion
          const householdData = {
            churchId,
            name: finalHouseholdName, // Guaranteed to be a string
            type: householdType as "family" | "single" | "other",
            isNonHousehold: getValue("is non household")?.toLowerCase() === "true" || false,
            personAssigned: getStringValue("person assigned") || null,
            ministryGroup: getStringValue("ministry group") || null,
            address1: getStringValue("household address1") || getStringValue("address1") || null,
            address2: getStringValue("household address2") || getStringValue("address2") || null,
            city: getStringValue("household city") || getStringValue("city") || null,
            state: getStringValue("household state") || getStringValue("state") || null,
            zip: getStringValue("household zip") || getStringValue("zip") || null,
            country: getStringValue("household country") || getStringValue("country") || null,
            alternateAddressBegin: parsedAlternateAddressBegin
              ? parsedAlternateAddressBegin.toISOString().split("T")[0]
              : null,
            alternateAddressEnd: parsedAlternateAddressEnd
              ? parsedAlternateAddressEnd.toISOString().split("T")[0]
              : null,
          };

          // Validate that name is definitely a string before inserting
          if (typeof householdData.name !== "string") {
            throw new Error(`Invalid household name type: ${typeof householdData.name}, value: ${JSON.stringify(householdData.name)}`);
          }

          // Final safety check - ensure name is a string (not boolean)
          const safeHouseholdData = {
            ...householdData,
            name: String(householdData.name || memberName || "New Household"),
          };

          const [newHousehold] = await db
            .insert(household)
            .values(safeHouseholdData)
            .returning();
          householdId = newHousehold.id;
          
          // Store in map if household group is provided
          if (householdGroup) {
            householdGroupMap.set(householdGroup, householdId);
          }
        }

        // Prepare member data with sanitization
        const email1Raw = getValue("email1") || getValue("email") || null;
        const email2Raw = getValue("email2") || null;
        const memberData = {
          firstName,
          middleName: getValue("middle name") ? sanitizeText(getValue("middle name")!) : undefined,
          lastName,
          suffix: getValue("suffix") ? sanitizeText(getValue("suffix")!) : undefined,
          preferredName: getValue("preferred name") ? sanitizeText(getValue("preferred name")!) : undefined,
          maidenName: getValue("maiden name") ? sanitizeText(getValue("maiden name")!) : undefined,
          title: getValue("title") ? sanitizeText(getValue("title")!) : undefined,
          sex: (() => {
            const sexValue = getValue("sex")?.toLowerCase();
            const validSexValues = ["male", "female", "other"];
            return validSexValues.includes(sexValue || "") ? sexValue as "male" | "female" | "other" : null;
          })(),
          dateOfBirth: parsedDateOfBirth
            ? parsedDateOfBirth.toISOString().split("T")[0]
            : null,
          email1: email1Raw ? sanitizeEmail(email1Raw) : undefined,
          email2: email2Raw ? sanitizeEmail(email2Raw) : undefined,
          phoneHome: getValue("phone home") ? sanitizeText(getValue("phone home")!) : undefined,
          phoneCell1: getValue("phone cell1") || getValue("phone") ? sanitizeText(getValue("phone cell1") || getValue("phone") || "") : undefined,
          phoneCell2: getValue("phone cell2") ? sanitizeText(getValue("phone cell2")!) : undefined,
          baptismDate: parsedBaptismDate
            ? parsedBaptismDate.toISOString().split("T")[0]
            : null,
          confirmationDate: parsedConfirmationDate
            ? parsedConfirmationDate.toISOString().split("T")[0]
            : null,
          receivedBy: (() => {
            const receivedByValue = getValue("received by")?.toLowerCase();
            const validReceivedByValues = ["adult_confirmation", "affirmation_of_faith", "baptism", "junior_confirmation", "transfer", "with_parents", "other_denomination", "unknown"];
            // Handle both underscore and space formats for CSV input
            const normalizedValue = receivedByValue?.replace(/\s+/g, "_");
            return normalizedValue && validReceivedByValues.includes(normalizedValue) 
              ? normalizedValue as "adult_confirmation" | "affirmation_of_faith" | "baptism" | "junior_confirmation" | "transfer" | "with_parents" | "other_denomination" | "unknown"
              : null;
          })(),
          dateReceived: parsedDateReceived
            ? parsedDateReceived.toISOString().split("T")[0]
            : null,
          removedBy: (() => {
            const removedByValue = getValue("removed by")?.toLowerCase();
            const validRemovedByValues = ["death", "excommunication", "inactivity", "moved_no_transfer", "released", "removed_by_request", "transfer", "other"];
            // Handle both underscore and space formats for CSV input
            const normalizedValue = removedByValue?.replace(/\s+/g, "_").replace(/\(no\s+transfer\)/gi, "_no_transfer");
            return normalizedValue && validRemovedByValues.includes(normalizedValue)
              ? normalizedValue as "death" | "excommunication" | "inactivity" | "moved_no_transfer" | "released" | "removed_by_request" | "transfer" | "other"
              : null;
          })(),
          dateRemoved: parsedDateRemoved
            ? parsedDateRemoved.toISOString().split("T")[0]
            : null,
          deceasedDate: parsedDeceasedDate
            ? parsedDeceasedDate.toISOString().split("T")[0]
            : null,
          membershipCode: getValue("membership code") ? sanitizeText(getValue("membership code")!) : undefined,
          envelopeNumber: getValue("envelope number") ? parseInt(getValue("envelope number")!) : null,
          participation: (() => {
            const status = getValue("participation") || getValue("membership status")?.toLowerCase();
            const validStatuses = ["active", "deceased", "homebound", "military", "inactive", "school"] as const;
            return validStatuses.includes(status as typeof validStatuses[number]) ? status as typeof validStatuses[number] : "active";
          })(),
          sequence: (() => {
            const sequenceValue = getValue("sequence")?.toLowerCase();
            const validSequenceValues = ["head_of_house", "spouse", "child"];
            // Handle both underscore and space formats for CSV input
            const normalizedValue = sequenceValue?.replace(/\s+/g, "_");
            return normalizedValue && validSequenceValues.includes(normalizedValue)
              ? normalizedValue as "head_of_house" | "spouse" | "child"
              : null;
          })(),
          householdId,
        };

        // Check for duplicate email if email1 is provided (within same church)
        if (memberData.email1) {
          const [existingMember] = await db
            .select()
            .from(members)
            .where(and(eq(members.email1, memberData.email1), eq(members.churchId, churchId)))
            .limit(1);

          if (existingMember) {
            results.failed++;
            results.errors.push(
              `Row ${i + 1}: Email ${memberData.email1} already exists`,
            );
            continue;
          }
        }

        // Insert member with churchId (within transaction context)
        await db.insert(members).values({
          ...memberData,
          churchId,
        });
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

