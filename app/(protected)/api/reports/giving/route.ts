import { NextResponse } from "next/server";
import { eq, and, gte, lte, inArray, asc } from "drizzle-orm";

import { db } from "@/db";
import { giving, members, household, givingItems, givingCategories } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";

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
    // Allow all authenticated users to view reports
    const { churchId } = await getAuthContext(request);

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

    // Build where conditions (always filter by churchId via member relationship)
    const conditions = [
      gte(giving.dateGiven, startDate),
      lte(giving.dateGiven, endDate),
      eq(members.churchId, churchId),
    ];

    // If householdId is provided, filter by household (and verify it belongs to church)
    let memberIds: string[] | undefined;
    if (householdId) {
      const householdMembers = await db
        .select({ id: members.id })
        .from(members)
        .where(and(eq(members.householdId, householdId), eq(members.churchId, churchId)));
      
      memberIds = householdMembers.map((m) => m.id);
      
      if (memberIds.length === 0) {
        // No members in household, return empty result
        if (format === "csv") {
          // Get categories for CSV headers
          const categoriesForHeaders = await db
            .select()
            .from(givingCategories)
            .where(and(
              eq(givingCategories.churchId, churchId),
              eq(givingCategories.isActive, true),
            ))
            .orderBy(asc(givingCategories.displayOrder), asc(givingCategories.name));
          
          const csvHeaders = [
            "Household Name",
            "Envelope Number",
            "Member Name",
            "Date Given",
            ...categoriesForHeaders.map(cat => cat.name),
            "Total",
            "Notes"
          ];
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

    const givingRecordsRaw = await queryBuilder;

    // Get all giving items for these records
    const givingIds = givingRecordsRaw.map(g => g.id);
    const allItems = givingIds.length > 0 ? await db
      .select({
        givingId: givingItems.givingId,
        categoryId: givingItems.categoryId,
        categoryName: givingCategories.name,
        amount: givingItems.amount,
      })
      .from(givingItems)
      .innerJoin(givingCategories, eq(givingItems.categoryId, givingCategories.id))
      .where(inArray(givingItems.givingId, givingIds))
      : [];

    // Group items by giving ID
    const itemsByGivingId: Record<string, Array<{ categoryId: string; categoryName: string; amount: string }>> = {};
    allItems.forEach(item => {
      if (!itemsByGivingId[item.givingId]) {
        itemsByGivingId[item.givingId] = [];
      }
      itemsByGivingId[item.givingId].push({
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        amount: item.amount,
      });
    });

    // Get active categories for CSV headers
    const categories = await db
      .select()
      .from(givingCategories)
      .where(and(
        eq(givingCategories.churchId, churchId),
        eq(givingCategories.isActive, true),
      ))
      .orderBy(asc(givingCategories.displayOrder), asc(givingCategories.name));

    // Add items to giving records
    const givingRecords = givingRecordsRaw.map(record => ({
      ...record,
      items: itemsByGivingId[record.id] || [],
    }));

    // For each giving record, find the head of household using sequence column
    const recordsWithHeadOfHousehold = await Promise.all(
      givingRecords.map(async (record) => {
        // Get household ID from the record's member
        const [recordMember] = await db
          .select({ householdId: members.householdId })
          .from(members)
          .where(eq(members.id, record.member.id))
          .limit(1);

        if (recordMember?.householdId) {
          const [headOfHousehold] = await db
            .select({
              id: members.id,
              firstName: members.firstName,
              lastName: members.lastName,
            })
            .from(members)
            .where(
              and(
                eq(members.householdId, recordMember.householdId),
                eq(members.sequence, "head_of_house"),
                eq(members.churchId, churchId)
              )
            )
            .limit(1);

          if (headOfHousehold) {
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

        // Fallback: use the record's member if no household ID or head of household not found
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

    // Calculate totals for each category and overall
    const categoryTotals: Record<string, number> = {};
    categories.forEach(cat => {
      categoryTotals[cat.id] = 0;
    });
    let grandTotal = 0;

    recordsWithHouseholdNames.forEach(record => {
      record.items.forEach(item => {
        const amount = parseFloat(item.amount || "0");
        if (!categoryTotals[item.categoryId]) {
          categoryTotals[item.categoryId] = 0;
        }
        categoryTotals[item.categoryId] += amount;
        grandTotal += amount;
      });
    });

    // Build totals object with category names
    const totals: Record<string, string> = {};
    categories.forEach(cat => {
      totals[cat.name] = (categoryTotals[cat.id] || 0).toFixed(2);
    });
    totals.total = grandTotal.toFixed(2);

    if (format === "json") {
      return NextResponse.json({ 
        giving: recordsWithHouseholdNames,
        totals,
      });
    }

    // Generate CSV with dynamic category columns
    const csvRows = recordsWithHouseholdNames.map((record) => {
      const row: Record<string, string> = {
        "Household Name": record.householdName || "N/A",
        "Envelope Number": record.member.envelopeNumber?.toString() || "N/A",
        "Member Name": `${record.member.firstName} ${record.member.lastName}`,
        "Date Given": record.dateGiven || "",
      };

      // Add category columns dynamically
      const categoryAmounts: Record<string, number> = {};
      let recordTotal = 0;
      record.items.forEach(item => {
        categoryAmounts[item.categoryName] = parseFloat(item.amount || "0");
        recordTotal += categoryAmounts[item.categoryName];
      });

      categories.forEach(cat => {
        row[cat.name] = (categoryAmounts[cat.name] || 0).toFixed(2);
      });

      row["Total"] = recordTotal.toFixed(2);
      row["Notes"] = record.notes || "";

      return row;
    });

    // Add total row at the bottom
    const totalRow: Record<string, string> = {
      "Household Name": "",
      "Envelope Number": "",
      "Member Name": "",
      "Date Given": "",
    };
    categories.forEach(cat => {
      totalRow[cat.name] = totals[cat.name] || "0.00";
    });
    totalRow["Total"] = totals.total;
    totalRow["Notes"] = "TOTAL";
    csvRows.push(totalRow);

    // Build CSV headers dynamically
    const csvHeaders = [
      "Household Name",
      "Envelope Number",
      "Member Name",
      "Date Given",
      ...categories.map(cat => cat.name),
      "Total",
      "Notes"
    ];

    const csvContent = generateCsv(csvRows, csvHeaders);
    const filename = `giving-report-${new Date().toISOString().split("T")[0]}.csv`;

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

