import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and, inArray, count } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { members, household } from "@/db/schema";

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

const VALID_PARTICIPATION_STATUSES = [
  "active",
  "visitor",
  "inactive",
  "transferred",
  "deceased",
] as const;

function isValidParticipationStatus(
  status: string | null | undefined,
): status is typeof VALID_PARTICIPATION_STATUSES[number] {
  return status !== null && status !== undefined && VALID_PARTICIPATION_STATUSES.includes(status as any);
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
    const participationParam = searchParams.get("participation");
    const householdId = searchParams.get("householdId");
    const type = searchParams.get("type") || "member";
    const format = searchParams.get("format") || "csv";

    // Validate participation statuses
    let participationStatuses: string[] = [];
    if (participationParam) {
      participationStatuses = participationParam.split(",").map((s) => s.trim());
      const invalidStatuses = participationStatuses.filter(
        (s) => !isValidParticipationStatus(s),
      );
      if (invalidStatuses.length > 0) {
        return NextResponse.json(
          { error: `Invalid participation statuses: ${invalidStatuses.join(", ")}` },
          { status: 400 },
        );
      }
    } else {
      // If no participation filter, include all statuses
      participationStatuses = [...VALID_PARTICIPATION_STATUSES];
    }

    if (type === "household") {
      // Generate household report
      const conditions = [];
      
      if (householdId) {
        conditions.push(eq(household.id, householdId));
      }

      // Get all households
      const householdsQuery = db
        .select({
          id: household.id,
          name: household.name,
          type: household.type,
          address1: household.address1,
          address2: household.address2,
          city: household.city,
          state: household.state,
          zip: household.zip,
        })
        .from(household);

      const allHouseholds = conditions.length > 0
        ? await householdsQuery.where(and(...conditions))
        : await householdsQuery;

      // For each household, get members with matching participation statuses
      const householdsWithMembers = await Promise.all(
        allHouseholds.map(async (h) => {
          const memberConditions = [eq(members.householdId, h.id)];
          
          if (participationStatuses.length > 0) {
            memberConditions.push(inArray(members.participation, participationStatuses as any));
          }

          const householdMembers = await db
            .select({
              id: members.id,
              firstName: members.firstName,
              lastName: members.lastName,
              participation: members.participation,
            })
            .from(members)
            .where(and(...memberConditions));

          // Generate display name if household name is not set
          let displayName = h.name;
          if (!displayName && householdMembers.length > 0) {
            if (householdMembers.length === 1) {
              displayName = `${householdMembers[0].firstName} ${householdMembers[0].lastName}`;
            } else if (householdMembers.length === 2) {
              displayName = `${householdMembers[0].firstName} & ${householdMembers[1].firstName} ${householdMembers[1].lastName}`;
            } else {
              displayName = `${householdMembers[0].firstName} ${householdMembers[0].lastName} (+${householdMembers.length - 1})`;
            }
          }

          const participationStatusesList = Array.from(
            new Set(householdMembers.map((m) => m.participation)),
          ).join(", ");

          return {
            id: h.id,
            name: displayName,
            type: h.type,
            address: [h.address1, h.address2].filter(Boolean).join(" "),
            city: h.city,
            state: h.state,
            zip: h.zip,
            memberCount: householdMembers.length,
            participationStatuses: participationStatusesList,
          };
        }),
      );

      // Filter out households with no matching members
      const filteredHouseholds = householdsWithMembers.filter((h) => h.memberCount > 0);

      if (format === "json") {
        return NextResponse.json({ households: filteredHouseholds });
      }

      // Generate CSV
      const csvRows = filteredHouseholds.map((h) => ({
        "Household Name": h.name || "N/A",
        "Household ID": h.id,
        "Household Type": h.type || "N/A",
        "Address": h.address || "N/A",
        "City": h.city || "N/A",
        "State": h.state || "N/A",
        "ZIP": h.zip || "N/A",
        "Member Count": h.memberCount.toString(),
        "Participation Statuses": h.participationStatuses || "N/A",
      }));

      const csvContent = generateCsv(csvRows);
      const filename = `membership-household-report-${new Date().toISOString().split("T")[0]}.csv`;

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } else {
      // Generate member report
      const conditions = [];

      if (participationStatuses.length > 0) {
        conditions.push(inArray(members.participation, participationStatuses as any));
      }

      if (householdId) {
        conditions.push(eq(members.householdId, householdId));
      }

      // Get members with household info
      const queryBuilder = db
        .select({
          id: members.id,
          householdId: members.householdId,
          firstName: members.firstName,
          middleName: members.middleName,
          lastName: members.lastName,
          preferredName: members.preferredName,
          email1: members.email1,
          phoneHome: members.phoneHome,
          phoneCell1: members.phoneCell1,
          participation: members.participation,
          envelopeNumber: members.envelopeNumber,
          dateOfBirth: members.dateOfBirth,
          dateReceived: members.dateReceived,
          household: {
            id: household.id,
            name: household.name,
            address1: household.address1,
            address2: household.address2,
            city: household.city,
            state: household.state,
            zip: household.zip,
          },
        })
        .from(members)
        .leftJoin(household, eq(members.householdId, household.id))
        .orderBy(members.lastName, members.firstName);

      const allMembers = conditions.length > 0
        ? await queryBuilder.where(and(...conditions))
        : await queryBuilder;

      // Get unique household IDs that need name generation
      const householdIdsNeedingNames = Array.from(
        new Set(
          allMembers
            .filter((m) => !m.household?.name && m.householdId)
            .map((m) => m.householdId!)
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
      const membersWithHouseholdNames = allMembers.map((member) => {
        let householdName = member.household?.name || null;
        
        // If no household name, generate one from members
        if (!householdName && member.householdId) {
          const householdMembers = householdMembersMap.get(member.householdId) || [];
          
          if (householdMembers.length === 1) {
            householdName = `${householdMembers[0].firstName} ${householdMembers[0].lastName}`;
          } else if (householdMembers.length === 2) {
            householdName = `${householdMembers[0].firstName} & ${householdMembers[1].firstName} ${householdMembers[1].lastName}`;
          } else if (householdMembers.length > 2) {
            householdName = `${householdMembers[0].firstName} ${householdMembers[0].lastName} (+${householdMembers.length - 1})`;
          }
        }

        const address = [
          member.household?.address1,
          member.household?.address2,
        ]
          .filter(Boolean)
          .join(" ");

        return {
          ...member,
          householdName,
          address,
        };
      });

      if (format === "json") {
        return NextResponse.json({ members: membersWithHouseholdNames });
      }

      // Generate CSV
      const csvRows = membersWithHouseholdNames.map((member) => ({
        "Household Name": member.householdName || "N/A",
        "Household ID": member.householdId || "N/A",
        "First Name": member.firstName || "",
        "Last Name": member.lastName || "",
        "Preferred Name": member.preferredName || "",
        "Email": member.email1 || "N/A",
        "Phone": member.phoneCell1 || member.phoneHome || "N/A",
        "Participation Status": member.participation || "N/A",
        "Envelope Number": member.envelopeNumber?.toString() || "N/A",
        "Date of Birth": member.dateOfBirth || "N/A",
        "Date Received": member.dateReceived || "N/A",
        "Address": member.address || "N/A",
        "City": member.household?.city || "N/A",
        "State": member.household?.state || "N/A",
        "ZIP": member.household?.zip || "N/A",
      }));

      const csvContent = generateCsv(csvRows);
      const filename = `membership-member-report-${new Date().toISOString().split("T")[0]}.csv`;

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }
  } catch (error) {
    console.error("Error generating membership report:", error);
    return NextResponse.json(
      { error: "Failed to generate membership report" },
      { status: 500 },
    );
  }
}

