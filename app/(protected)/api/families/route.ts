import { NextResponse } from "next/server";
import { eq, count, and } from "drizzle-orm";

import { db } from "@/db";
import { household, members } from "@/db/schema";
import { getAuthContext, requirePermission } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeText } from "@/lib/sanitize";

export async function GET(request: Request) {
  try {
    console.log("[GET /api/families] Starting request");
    let churchId: string;
    try {
      const context = await getAuthContext(request);
      churchId = context.churchId;
      console.log("[GET /api/families] Got churchId:", churchId);
    } catch (authError: any) {
      console.error("[GET /api/families] Auth error:", {
        error: authError?.message || String(authError),
        stack: authError?.stack,
        name: authError?.name,
      });
      throw authError;
    }

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
    console.log("[GET /api/families] Processing", paginatedHouseholds.length, "households");
    const householdsWithMembers = await Promise.all(
      paginatedHouseholds.map(async (h) => {
        try {
          const memberCountResult = await db
            .select({ count: count() })
            .from(members)
            .where(and(eq(members.householdId, h.id), eq(members.churchId, churchId)));
          const [countRow] = memberCountResult;
          const memberCount = countRow?.count || 0;

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
            memberCount,
            members: householdMembers,
          };
        } catch (memberError: any) {
          console.error(`[GET /api/families] Error processing household ${h.id}:`, memberError);
          // Return household with zero members if query fails
          return {
            ...h,
            memberCount: 0,
            members: [],
          };
        }
      }),
    );
    console.log("[GET /api/families] Processed", householdsWithMembers.length, "households");

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
    console.error("[GET /api/families] Error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return createErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require members_edit permission
    const { churchId } = await requirePermission("members_edit", request);

    const body = await request.json();

    // Sanitize input
    const sanitizedData = {
      name: body.name ? sanitizeText(body.name) : undefined,
      personAssigned: body.personAssigned ? sanitizeText(body.personAssigned) : undefined,
      ministryGroup: body.ministryGroup ? sanitizeText(body.ministryGroup) : undefined,
      address1: body.address1 ? sanitizeText(body.address1) : undefined,
      address2: body.address2 ? sanitizeText(body.address2) : undefined,
      city: body.city ? sanitizeText(body.city) : undefined,
      state: body.state ? sanitizeText(body.state) : undefined,
      zip: body.zip ? sanitizeText(body.zip) : undefined,
      country: body.country ? sanitizeText(body.country) : undefined,
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

