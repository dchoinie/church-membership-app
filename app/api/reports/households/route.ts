import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { household, members } from "@/db/schema";

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all households with their members and envelope numbers
    const allHouseholds = await db
      .select({
        id: household.id,
        name: household.name,
        type: household.type,
      })
      .from(household);

    // For each household, get members with envelope numbers
    const householdsWithEnvelopes = await Promise.all(
      allHouseholds.map(async (h) => {
        const householdMembers = await db
          .select({
            id: members.id,
            firstName: members.firstName,
            lastName: members.lastName,
            envelopeNumber: members.envelopeNumber,
          })
          .from(members)
          .where(eq(members.householdId, h.id));

        // Get the envelope number (should be consistent per household)
        const envelopeNumber = householdMembers.find((m) => m.envelopeNumber !== null)?.envelopeNumber || null;

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

        return {
          id: h.id,
          name: displayName,
          type: h.type,
          envelopeNumber,
          memberCount: householdMembers.length,
        };
      }),
    );

    // Filter out households without envelope numbers and sort by envelope number
    const filteredHouseholds = householdsWithEnvelopes
      .filter((h) => h.envelopeNumber !== null)
      .sort((a, b) => (a.envelopeNumber || 0) - (b.envelopeNumber || 0));

    return NextResponse.json({ households: filteredHouseholds });
  } catch (error) {
    console.error("Error fetching households:", error);
    return NextResponse.json(
      { error: "Failed to fetch households" },
      { status: 500 },
    );
  }
}

