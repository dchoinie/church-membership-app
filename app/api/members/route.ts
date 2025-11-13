import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { members, families } from "@/db/schema";

const VALID_MEMBERSHIP_STATUSES = ["active", "inactive", "pending", "transferred", "deceased"] as const;
const VALID_FAMILY_ROLES = ["father", "mother", "son", "daughter"] as const;

function isValidMembershipStatus(status: string | null | undefined): status is typeof VALID_MEMBERSHIP_STATUSES[number] {
  return status !== null && status !== undefined && VALID_MEMBERSHIP_STATUSES.includes(status.toLowerCase() as any);
}

function isValidFamilyRole(role: string | null | undefined): role is typeof VALID_FAMILY_ROLES[number] | null {
  if (!role || role === "__none__") return true; // null is valid
  return VALID_FAMILY_ROLES.includes(role.toLowerCase() as any);
}

export async function GET() {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all members
    const allMembers = await db
      .select({
        id: members.id,
        familyId: members.familyId,
        firstName: members.firstName,
        lastName: members.lastName,
        membershipDate: members.membershipDate,
        email: members.email,
        phone: members.phone,
        addressLine1: members.addressLine1,
        addressLine2: members.addressLine2,
        city: members.city,
        state: members.state,
        zipCode: members.zipCode,
        dateOfBirth: members.dateOfBirth,
        baptismDate: members.baptismDate,
        membershipStatus: members.membershipStatus,
        familyRole: members.familyRole,
        notes: members.notes,
        photoUrl: members.photoUrl,
        createdAt: members.createdAt,
        updatedAt: members.updatedAt,
      })
      .from(members);

    return NextResponse.json({ members: allMembers });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
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

    // Validate required fields
    if (!body.firstName || !body.lastName || !body.membershipDate) {
      return NextResponse.json(
        { error: "First name, last name, and membership date are required" },
        { status: 400 },
      );
    }

    // Check email uniqueness if provided
    if (body.email) {
      const existingMember = await db
        .select()
        .from(members)
        .where(eq(members.email, body.email))
        .limit(1);

      if (existingMember.length > 0) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 },
        );
      }
    }

    let familyId = body.familyId || null;

    // If creating a new family, create it first (just an empty container)
    if (body.createNewFamily) {
      const [newFamily] = await db
        .insert(families)
        .values({})
        .returning();
      
      familyId = newFamily.id;
    }

    // Insert new member
    const [newMember] = await db
      .insert(members)
      .values({
        familyId: familyId,
        firstName: body.firstName,
        lastName: body.lastName,
        membershipDate: body.membershipDate,
        email: body.email || null,
        phone: body.phone || null,
        addressLine1: body.addressLine1 || null,
        addressLine2: body.addressLine2 || null,
        city: body.city || null,
        state: body.state || null,
        zipCode: body.zipCode || null,
        dateOfBirth: body.dateOfBirth || null,
        baptismDate: body.baptismDate || null,
        membershipStatus: isValidMembershipStatus(body.membershipStatus)
          ? body.membershipStatus.toLowerCase()
          : "active",
        familyRole: isValidFamilyRole(body.familyRole)
          ? (body.familyRole === "__none__" || !body.familyRole ? null : body.familyRole.toLowerCase())
          : null,
        notes: body.notes || null,
        photoUrl: body.photoUrl || null,
      })
      .returning();

    return NextResponse.json({ member: newMember }, { status: 201 });
  } catch (error) {
    console.error("Error creating member:", error);
    return NextResponse.json(
      { error: "Failed to create member" },
      { status: 500 },
    );
  }
}

