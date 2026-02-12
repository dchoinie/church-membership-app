import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { members, household } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { decryptMember } from "@/lib/encryption";

// Helper function to escape CSV values
function escapeCsvValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

// Helper function to generate CSV content
function generateCsv(rows: Array<Record<string, string | null>>, headers?: string[]): string {
  if (rows.length === 0) {
    // If headers provided, return just headers
    if (headers && headers.length > 0) {
      return headers.map(escapeCsvValue).join(",");
    }
    return "";
  }
  
  const csvHeaders = headers || Object.keys(rows[0]);
  const headerRow = csvHeaders.map(escapeCsvValue).join(",");
  const dataRows = rows.map((row) =>
    csvHeaders.map((header) => escapeCsvValue(row[header])).join(",")
  );
  
  return [headerRow, ...dataRows].join("\n");
}

export async function GET(request: Request) {
  try {
    // Authenticate and get churchId
    const { churchId } = await getAuthContext(request);

    // Get all members for the church with household info
    const allMembers = await db
      .select({
        id: members.id,
        churchId: members.churchId,
        householdId: members.householdId,
        firstName: members.firstName,
        middleName: members.middleName,
        lastName: members.lastName,
        suffix: members.suffix,
        preferredName: members.preferredName,
        maidenName: members.maidenName,
        title: members.title,
        sex: members.sex,
        dateOfBirth: members.dateOfBirth,
        email1: members.email1,
        email2: members.email2,
        phoneHome: members.phoneHome,
        phoneCell1: members.phoneCell1,
        phoneCell2: members.phoneCell2,
        baptismDate: members.baptismDate,
        confirmationDate: members.confirmationDate,
        weddingAnniversaryDate: members.weddingAnniversaryDate,
        receivedBy: members.receivedBy,
        dateReceived: members.dateReceived,
        removedBy: members.removedBy,
        dateRemoved: members.dateRemoved,
        deceasedDate: members.deceasedDate,
        membershipCode: members.membershipCode,
        envelopeNumber: members.envelopeNumber,
        participation: members.participation,
        sequence: members.sequence,
        createdAt: members.createdAt,
        updatedAt: members.updatedAt,
        householdName: household.name,
      })
      .from(members)
      .leftJoin(household, eq(members.householdId, household.id))
      .where(eq(members.churchId, churchId))
      .orderBy(members.lastName, members.firstName);

    // Generate CSV rows with all fields (decrypt sensitive fields first)
    const csvRows = allMembers.map((member) => {
      const decrypted = decryptMember(member);
      return {
      "ID": decrypted.id || "",
      "Church ID": member.churchId || "",
      "Household ID": member.householdId || "",
      "Household Name": member.householdName || "",
      "First Name": member.firstName || "",
      "Middle Name": member.middleName || "",
      "Last Name": member.lastName || "",
      "Suffix": member.suffix || "",
      "Preferred Name": member.preferredName || "",
      "Maiden Name": member.maidenName || "",
      "Title": member.title || "",
      "Sex": member.sex || "",
      "Date of Birth": decrypted.dateOfBirth || "",
      "Email 1": member.email1 || "",
      "Email 2": member.email2 || "",
      "Phone Home": member.phoneHome || "",
      "Phone Cell 1": member.phoneCell1 || "",
      "Phone Cell 2": member.phoneCell2 || "",
      "Baptism Date": member.baptismDate || "",
      "Confirmation Date": member.confirmationDate || "",
      "Wedding Anniversary": member.weddingAnniversaryDate || "",
      "Received By": member.receivedBy || "",
      "Date Received": member.dateReceived || "",
      "Removed By": member.removedBy || "",
      "Date Removed": member.dateRemoved || "",
      "Deceased Date": member.deceasedDate || "",
      "Membership Code": member.membershipCode || "",
      "Envelope Number": member.envelopeNumber?.toString() || "",
      "Participation": member.participation || "",
      "Sequence": member.sequence || "",
      "Created At": member.createdAt?.toISOString() || "",
      "Updated At": member.updatedAt?.toISOString() || "",
      };
    });

    const csvContent = generateCsv(csvRows);
    
    // Generate filename with current date in YYYY-MM-DD format
    const currentDate = new Date().toISOString().split("T")[0];
    const filename = `members_export_${currentDate}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
