import { NextResponse } from "next/server";
import { eq, count, and } from "drizzle-orm";

import { db } from "@/db";
import { household, members } from "@/db/schema";
import { getAuthContext, handleAuthError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(100, pageSize)); // Max 100 per page
    const offset = (validPage - 1) * validPageSize;

    // Get total count (filtered by churchId)
    const [totalResult] = await db
      .select({ count: count() })
      .from(household)
      .where(eq(household.churchId, churchId));
    const total = totalResult.count;
    const totalPages = Math.ceil(total / validPageSize);

    // Get paginated households (filtered by churchId)
    const paginatedHouseholds = await db
      .select({
        id: household.id,
        name: household.name,
        type: household.type,
        address1: household.address1,
        city: household.city,
        state: household.state,
      })
      .from(household)
      .where(eq(household.churchId, churchId))
      .limit(validPageSize)
      .offset(offset);

    // For each household, get member count and first 3 member names for display
    const householdsWithMembers = await Promise.all(
      paginatedHouseholds.map(async (h) => {
        const [memberCountResult] = await db
          .select({ count: count() })
          .from(members)
          .where(and(eq(members.householdId, h.id), eq(members.churchId, churchId)));

        const householdMembers = await db
          .select({
            firstName: members.firstName,
            lastName: members.lastName,
          })
          .from(members)
          .where(and(eq(members.householdId, h.id), eq(members.churchId, churchId)))
          .limit(3); // Get first 3 members for display

        return {
          ...h,
          memberCount: memberCountResult.count,
          members: householdMembers,
        };
      }),
    );

    return NextResponse.json({
      households: householdsWithMembers,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError.status !== 500) return authError;
    
    console.error("Error fetching households:", error);
    return NextResponse.json(
      { error: "Failed to fetch households" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    const body = await request.json();

    // Insert new household
    const [newHousehold] = await db
      .insert(household)
      .values({
        churchId,
        name: body.name || null,
        type: body.type || null,
        isNonHousehold: body.isNonHousehold || false,
        personAssigned: body.personAssigned || null,
        ministryGroup: body.ministryGroup || null,
        address1: body.address1 || null,
        address2: body.address2 || null,
        city: body.city || null,
        state: body.state || null,
        zip: body.zip || null,
        country: body.country || null,
        alternateAddressBegin: body.alternateAddressBegin || null,
        alternateAddressEnd: body.alternateAddressEnd || null,
      })
      .returning();

    return NextResponse.json({ household: newHousehold }, { status: 201 });
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError.status !== 500) return authError;
    
    console.error("Error creating household:", error);
    return NextResponse.json(
      { error: "Failed to create household" },
      { status: 500 },
    );
  }
}

