import { NextResponse } from "next/server";
import { eq, count, and } from "drizzle-orm";

import { db } from "@/db";
import { household, members } from "@/db/schema";
import { getAuthContext, requireAdmin } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeText } from "@/lib/sanitize";

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
    return createErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    const body = await request.json();

    // Sanitize input
    const sanitizedData = {
      name: body.name ? sanitizeText(body.name) : null,
      personAssigned: body.personAssigned ? sanitizeText(body.personAssigned) : null,
      ministryGroup: body.ministryGroup ? sanitizeText(body.ministryGroup) : null,
      address1: body.address1 ? sanitizeText(body.address1) : null,
      address2: body.address2 ? sanitizeText(body.address2) : null,
      city: body.city ? sanitizeText(body.city) : null,
      state: body.state ? sanitizeText(body.state) : null,
      zip: body.zip ? sanitizeText(body.zip) : null,
      country: body.country ? sanitizeText(body.country) : null,
    };

    // Insert new household
    const [newHousehold] = await db
      .insert(household)
      .values({
        churchId,
        name: sanitizedData.name,
        type: body.type || null,
        isNonHousehold: body.isNonHousehold || false,
        personAssigned: sanitizedData.personAssigned,
        ministryGroup: sanitizedData.ministryGroup,
        address1: sanitizedData.address1,
        address2: sanitizedData.address2,
        city: sanitizedData.city,
        state: sanitizedData.state,
        zip: sanitizedData.zip,
        country: sanitizedData.country,
        alternateAddressBegin: body.alternateAddressBegin || null,
        alternateAddressEnd: body.alternateAddressEnd || null,
      })
      .returning();

    return NextResponse.json({ household: newHousehold }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}

