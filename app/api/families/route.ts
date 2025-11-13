import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { families, members } from "@/db/schema";

export async function GET() {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all families with parent info
    const allFamilies = await db.select({
      id: families.id,
      parentFamilyId: families.parentFamilyId,
    }).from(families);

    // For each family, get member names for display
    const familiesWithMembers = await Promise.all(
      allFamilies.map(async (family) => {
        const familyMembers = await db
          .select({
            firstName: members.firstName,
            lastName: members.lastName,
          })
          .from(members)
          .where(eq(members.familyId, family.id))
          .limit(3); // Get first 3 members for display

        return {
          ...family,
          members: familyMembers,
        };
      }),
    );

    return NextResponse.json({ families: familiesWithMembers });
  } catch (error) {
    console.error("Error fetching families:", error);
    return NextResponse.json(
      { error: "Failed to fetch families" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { parentFamilyId } = body;

    // Validate parentFamilyId if provided
    if (parentFamilyId) {
      const [parentFamily] = await db
        .select()
        .from(families)
        .where(eq(families.id, parentFamilyId))
        .limit(1);

      if (!parentFamily) {
        return NextResponse.json(
          { error: "Parent family not found" },
          { status: 400 },
        );
      }

      // Prevent circular reference (parent can't be itself)
      if (parentFamilyId === parentFamily.id) {
        return NextResponse.json(
          { error: "Family cannot be its own parent" },
          { status: 400 },
        );
      }
    }

    // Insert new family with optional parent
    const [newFamily] = await db
      .insert(families)
      .values({
        parentFamilyId: parentFamilyId || null,
      })
      .returning();

    return NextResponse.json({ family: newFamily }, { status: 201 });
  } catch (error) {
    console.error("Error creating family:", error);
    return NextResponse.json(
      { error: "Failed to create family" },
      { status: 500 },
    );
  }
}

