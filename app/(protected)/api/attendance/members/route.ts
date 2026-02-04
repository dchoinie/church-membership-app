import { NextResponse } from "next/server";
import { eq, asc, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { members } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);
    
    // Check if includeInactive query parameter is present
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Build the where condition based on includeInactive flag
    const participationFilter = includeInactive
      ? inArray(members.participation, ["active", "inactive"])
      : eq(members.participation, "active");

    // Fetch members (filtered by churchId and participation status)
    const memberList = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
      })
      .from(members)
      .where(and(participationFilter, eq(members.churchId, churchId)))
      .orderBy(asc(members.lastName), asc(members.firstName));

    return NextResponse.json({ members: memberList });
  } catch (error) {
    return createErrorResponse(error);
  }
}

