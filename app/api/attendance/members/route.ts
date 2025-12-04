import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, asc } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { members } from "@/db/schema";

export async function GET() {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all active members
    const activeMembers = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
      })
      .from(members)
      .where(eq(members.participation, "active"))
      .orderBy(asc(members.lastName), asc(members.firstName));

    return NextResponse.json({ members: activeMembers });
  } catch (error) {
    console.error("Error fetching active members:", error);
    return NextResponse.json(
      { error: "Failed to fetch active members" },
      { status: 500 },
    );
  }
}

