import { NextResponse } from "next/server";
import { eq, asc, and } from "drizzle-orm";

import { db } from "@/db";
import { members } from "@/db/schema";
import { getAuthContext, handleAuthError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    // Fetch all active members (filtered by churchId)
    const activeMembers = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
      })
      .from(members)
      .where(and(eq(members.participation, "active"), eq(members.churchId, churchId)))
      .orderBy(asc(members.lastName), asc(members.firstName));

    return NextResponse.json({ members: activeMembers });
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError.status !== 500) return authError;
    
    console.error("Error fetching active members:", error);
    return NextResponse.json(
      { error: "Failed to fetch active members" },
      { status: 500 },
    );
  }
}

