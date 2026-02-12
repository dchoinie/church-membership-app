import { NextResponse } from "next/server";
import { eq, count, and, or, ilike, sql } from "drizzle-orm";

import { db } from "@/db";
import { household, members } from "@/db/schema";
import { getAuthContext, requirePermission } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeText } from "@/lib/sanitize"; // Now safe - sanitizeText is lightweight and doesn't require jsdom

/** Escape % and _ for safe use in ilike patterns */
function escapeIlikePattern(s: string): string {
  return s.replace(/[%_\\]/g, (m) => `\\${m}`);
}

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
    const q = searchParams.get("q")?.trim().slice(0, 200) || "";
    const type = searchParams.get("type")?.trim().toLowerCase() || "";
    const city = searchParams.get("city")?.trim().slice(0, 200) || "";
    const state = searchParams.get("state")?.trim().slice(0, 10) || "";
    const minMembersParam = searchParams.get("minMembers");
    const maxMembersParam = searchParams.get("maxMembers");

    const parsedMin = minMembersParam != null ? parseInt(minMembersParam, 10) : undefined;
    const parsedMax = maxMembersParam != null ? parseInt(maxMembersParam, 10) : undefined;
    const validMinMembers =
      parsedMin != null && !isNaN(parsedMin) && parsedMin >= 0 ? parsedMin : undefined;
    const validMaxMembers =
      parsedMax != null && !isNaN(parsedMax) && parsedMax >= 0 ? parsedMax : undefined;
    const hasMemberCountFilter = validMinMembers != null || validMaxMembers != null;

    const validType = ["single", "family", "other"].includes(type) ? type : undefined;

    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(100, pageSize)); // Max 100 per page
    const offset = (validPage - 1) * validPageSize;

    // Build where conditions
    const conditions: ReturnType<typeof eq>[] = [eq(household.churchId, churchId)];

    if (q) {
      const pattern = `%${escapeIlikePattern(q)}%`;
      conditions.push(
        or(
          ilike(household.name, pattern),
          ilike(household.address1, pattern),
          ilike(household.city, pattern),
          ilike(household.state, pattern),
          ilike(household.zip, pattern)
        )!
      );
    }
    if (validType) conditions.push(eq(household.type, validType as "single" | "family" | "other"));
    if (city) conditions.push(ilike(household.city, `%${escapeIlikePattern(city)}%`));
    if (state) conditions.push(eq(household.state, state));

    if (hasMemberCountFilter) {
      const minVal = validMinMembers ?? 0;
      const maxVal = validMaxMembers ?? 999999;
      conditions.push(
        sql`(SELECT count(*)::int FROM members WHERE members.household_id = household.id AND members.church_id = ${churchId}) BETWEEN ${minVal} AND ${maxVal}`
      );
    }

    const whereClause = and(...conditions);

    // Get total count (filtered)
    const [totalResult] = await db
      .select({ count: count() })
      .from(household)
      .where(whereClause);
    const total = totalResult.count;
    const totalPages = Math.ceil(total / validPageSize);

    // Get paginated households
    const paginatedHouseholds = await db
      .select({
        id: household.id,
        name: household.name,
        type: household.type,
        address1: household.address1,
        city: household.city,
        state: household.state,
        weddingAnniversaryDate: household.weddingAnniversaryDate,
      })
      .from(household)
      .where(whereClause)
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
        weddingAnniversaryDate: body.weddingAnniversaryDate || null,
      })
      .returning();

    return NextResponse.json({ household: newHousehold }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}

