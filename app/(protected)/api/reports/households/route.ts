import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { household, members } from "@/db/schema";
import { getAuthContext, handleAuthError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    // Get all households with their members and envelope numbers (filtered by churchId)
    const allHouseholds = await db
      .select({
        id: household.id,
        name: household.name,
        type: household.type,
      })
      .from(household)
      .where(eq(household.churchId, churchId));

    // For each household, get members with envelope numbers (filtered by churchId)
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
          .where(and(eq(members.householdId, h.id), eq(members.churchId, churchId)));

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

    // Sort households: those with envelope numbers first (sorted by envelope number), then those without (sorted by name)
    const sortedHouseholds = householdsWithEnvelopes.sort((a, b) => {
      // If both have envelope numbers, sort by envelope number
      if (a.envelopeNumber !== null && b.envelopeNumber !== null) {
        return a.envelopeNumber - b.envelopeNumber;
      }
      // If only a has envelope number, a comes first
      if (a.envelopeNumber !== null && b.envelopeNumber === null) {
        return -1;
      }
      // If only b has envelope number, b comes first
      if (a.envelopeNumber === null && b.envelopeNumber !== null) {
        return 1;
      }
      // If neither has envelope number, sort by name
      return (a.name || "").localeCompare(b.name || "");
    });

    return NextResponse.json({ households: sortedHouseholds });
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

