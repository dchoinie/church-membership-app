import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and, gte, lte, inArray } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { giving, members, household } from "@/db/schema";

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
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get("householdId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format") || "csv";

    // Validate date parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 },
      );
    }

    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { error: "Start date must be before or equal to end date" },
        { status: 400 },
      );
    }

    // Build where conditions
    const conditions = [
      gte(giving.dateGiven, startDate),
      lte(giving.dateGiven, endDate),
    ];

    // If householdId is provided, filter by household
    let memberIds: string[] | undefined;
    if (householdId) {
      const householdMembers = await db
        .select({ id: members.id })
        .from(members)
        .where(eq(members.householdId, householdId));
      
      memberIds = householdMembers.map((m) => m.id);
      
      if (memberIds.length === 0) {
        // No members in household, return empty result
        if (format === "csv") {
          const csvHeaders = ["Household Name", "Envelope Number", "Member Name", "Date Given", "Amount", "Notes"];
          const csvContent = generateCsv([], csvHeaders);
          const filename = `giving-report-${new Date().toISOString().split("T")[0]}.csv`;
          return new NextResponse(csvContent, {
            headers: {
              "Content-Type": "text/csv",
              "Content-Disposition": `attachment; filename="${filename}"`,
            },
          });
        }
        return NextResponse.json({ giving: [] });
      }
      
      conditions.push(inArray(giving.memberId, memberIds));
    }

    // Get giving records with member and household info
    const queryBuilder = db
      .select({
        id: giving.id,
        memberId: giving.memberId,
        amount: giving.amount,
        dateGiven: giving.dateGiven,
        notes: giving.notes,
        member: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          envelopeNumber: members.envelopeNumber,
          householdId: members.householdId,
        },
        household: {
          id: household.id,
          name: household.name,
        },
      })
      .from(giving)
      .innerJoin(members, eq(giving.memberId, members.id))
      .leftJoin(household, eq(members.householdId, household.id))
      .where(and(...conditions))
      .orderBy(giving.dateGiven);

    const givingRecords = await queryBuilder;

    // Helper function to find head of household (oldest male)
    const findHeadOfHousehold = (
      members: Array<{
        id: string;
        firstName: string;
        lastName: string;
        sex: "male" | "female" | "other" | null;
        dateOfBirth: string | null;
      }>
    ): { id: string; firstName: string; lastName: string } => {
      // Filter for males
      const males = members.filter(m => m.sex === "male");
      
      if (males.length > 0) {
        // Sort males by dateOfBirth (oldest first)
        const sortedMales = males.sort((a, b) => {
          if (!a.dateOfBirth) return 1; // No date goes to end
          if (!b.dateOfBirth) return -1;
          return new Date(a.dateOfBirth).getTime() - new Date(b.dateOfBirth).getTime();
        });
        return {
          id: sortedMales[0].id,
          firstName: sortedMales[0].firstName,
          lastName: sortedMales[0].lastName,
        };
      }
      
      // No males found, use oldest member overall
      const sortedAll = members.sort((a, b) => {
        if (!a.dateOfBirth) return 1; // No date goes to end
        if (!b.dateOfBirth) return -1;
        return new Date(a.dateOfBirth).getTime() - new Date(b.dateOfBirth).getTime();
      });
      
      return {
        id: sortedAll[0].id,
        firstName: sortedAll[0].firstName,
        lastName: sortedAll[0].lastName,
      };
    };

    // For each giving record, find the head of household (oldest male)
    const recordsWithHeadOfHousehold = await Promise.all(
      givingRecords.map(async (record) => {
        // If the member has an envelope number, find all members with that envelope number
        if (record.member.envelopeNumber) {
          const householdMembers = await db
            .select({
              id: members.id,
              firstName: members.firstName,
              lastName: members.lastName,
              sex: members.sex,
              dateOfBirth: members.dateOfBirth,
            })
            .from(members)
            .where(eq(members.envelopeNumber, record.member.envelopeNumber));

          if (householdMembers.length > 0) {
            const headOfHousehold = findHeadOfHousehold(householdMembers);
            return {
              ...record,
              member: {
                ...record.member,
                id: headOfHousehold.id,
                firstName: headOfHousehold.firstName,
                lastName: headOfHousehold.lastName,
              },
            };
          }
        }

        // Fallback: use the record's member if no envelope number or household members found
        return record;
      })
    );

    // Get unique household IDs that need name generation
    const householdIdsNeedingNames = Array.from(
      new Set(
        recordsWithHeadOfHousehold
          .filter((r) => !r.household?.name && r.member.householdId)
          .map((r) => r.member.householdId!)
      )
    );

    // Fetch all household members for households needing names
    const householdMembersMap = new Map<string, Array<{ firstName: string; lastName: string }>>();
    if (householdIdsNeedingNames.length > 0) {
      const allHouseholdMembers = await db
        .select({
          householdId: members.householdId,
          firstName: members.firstName,
          lastName: members.lastName,
        })
        .from(members)
        .where(inArray(members.householdId, householdIdsNeedingNames));

      // Group by household ID
      for (const member of allHouseholdMembers) {
        if (member.householdId) {
          if (!householdMembersMap.has(member.householdId)) {
            householdMembersMap.set(member.householdId, []);
          }
          householdMembersMap.get(member.householdId)!.push({
            firstName: member.firstName,
            lastName: member.lastName,
          });
        }
      }
    }

    // Generate household display names
    const recordsWithHouseholdNames = recordsWithHeadOfHousehold.map((record) => {
      let householdName = record.household?.name || null;
      
      // If no household name, generate one from members
      if (!householdName && record.member.householdId) {
        const householdMembers = householdMembersMap.get(record.member.householdId) || [];
        
        if (householdMembers.length === 1) {
          householdName = `${householdMembers[0].firstName} ${householdMembers[0].lastName}`;
        } else if (householdMembers.length === 2) {
          householdName = `${householdMembers[0].firstName} & ${householdMembers[1].firstName} ${householdMembers[1].lastName}`;
        } else if (householdMembers.length > 2) {
          householdName = `${householdMembers[0].firstName} ${householdMembers[0].lastName} (+${householdMembers.length - 1})`;
        }
      }

      return {
        ...record,
        householdName,
      };
    });

    // Calculate total amount
    const totalAmount = recordsWithHouseholdNames.reduce((sum, record) => {
      const amount = parseFloat(record.amount || "0");
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    if (format === "json") {
      return NextResponse.json({ 
        giving: recordsWithHouseholdNames,
        totalAmount: totalAmount.toFixed(2),
      });
    }

    // Generate CSV
    const csvRows = recordsWithHouseholdNames.map((record) => ({
      "Household Name": record.householdName || "N/A",
      "Envelope Number": record.member.envelopeNumber?.toString() || "N/A",
      "Member Name": `${record.member.firstName} ${record.member.lastName}`,
      "Date Given": record.dateGiven || "",
      "Amount": record.amount || "0.00",
      "Notes": record.notes || "",
    }));

    // Add total row at the bottom
    csvRows.push({
      "Household Name": "",
      "Envelope Number": "",
      "Member Name": "",
      "Date Given": "",
      "Amount": totalAmount.toFixed(2),
      "Notes": "TOTAL",
    });

    const csvContent = generateCsv(csvRows);
    const filename = `giving-report-${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating giving report:", error);
    return NextResponse.json(
      { error: "Failed to generate giving report" },
      { status: 500 },
    );
  }
}

