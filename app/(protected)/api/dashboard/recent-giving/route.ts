import { NextResponse } from "next/server";
import { eq, desc, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { giving, members, household, givingItems } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    // Get 5 most recent giving records with household name (filtered by churchId)
    const recentGiving = await db
      .select({
        id: giving.id,
        dateGiven: giving.dateGiven,
        householdId: household.id,
        householdName: household.name,
        memberFirstName: members.firstName,
        memberLastName: members.lastName,
      })
      .from(giving)
      .innerJoin(members, eq(giving.memberId, members.id))
      .leftJoin(household, eq(members.householdId, household.id))
      .where(eq(members.churchId, churchId))
      .orderBy(desc(giving.dateGiven), desc(giving.createdAt))
      .limit(5);

    // Get giving items for these records
    const givingIds = recentGiving.map((g) => g.id);
    const givingItemsData =
      givingIds.length > 0
        ? await db
            .select({
              givingId: givingItems.givingId,
              amount: givingItems.amount,
            })
            .from(givingItems)
            .where(inArray(givingItems.givingId, givingIds))
        : [];

    // Group items by giving ID and calculate totals
    const itemsByGivingId: Record<string, number> = {};
    givingItemsData.forEach((item) => {
      const amount = parseFloat(item.amount || "0");
      itemsByGivingId[item.givingId] = (itemsByGivingId[item.givingId] || 0) + amount;
    });

    // Format the response with household display name and amount
    const formattedGiving = recentGiving.map((record) => {
      // Use household name if available, otherwise use member name
      const displayName = record.householdName 
        ? record.householdName
        : `${record.memberFirstName} ${record.memberLastName}`;
      
      const totalAmount = itemsByGivingId[record.id] || 0;
      
      return {
        id: record.id,
        dateGiven: record.dateGiven,
        householdName: displayName,
        amount: Math.round(totalAmount * 100) / 100,
      };
    });

    return NextResponse.json({ giving: formattedGiving });
  } catch (error) {
    return createErrorResponse(error);
  }
}

