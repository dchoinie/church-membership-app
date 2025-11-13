import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { members } from "@/db/schema";

const VALID_MEMBERSHIP_STATUSES = ["active", "inactive", "pending", "transferred", "deceased"] as const;
const VALID_FAMILY_ROLES = ["father", "mother", "son", "daughter"] as const;

function isValidMembershipStatus(status: string | null | undefined): status is typeof VALID_MEMBERSHIP_STATUSES[number] {
  return status !== null && status !== undefined && VALID_MEMBERSHIP_STATUSES.includes(status.toLowerCase() as any);
}

function isValidFamilyRole(role: string | null | undefined): role is typeof VALID_FAMILY_ROLES[number] | null {
  if (!role || role === "__none__") return true; // null is valid
  return VALID_FAMILY_ROLES.includes(role.toLowerCase() as any);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get member
    const [member] = await db
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
      .from(members)
      .where(eq(members.id, id))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ member });
  } catch (error) {
    console.error("Error fetching member:", error);
    return NextResponse.json(
      { error: "Failed to fetch member" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.firstName || !body.lastName || !body.membershipDate) {
      return NextResponse.json(
        { error: "First name, last name, and membership date are required" },
        { status: 400 },
      );
    }

    // Check if member exists
    const [existingMember] = await db
      .select()
      .from(members)
      .where(eq(members.id, id))
      .limit(1);

    if (!existingMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Check email uniqueness if email is being changed
    if (body.email && body.email !== existingMember.email) {
      const emailConflict = await db
        .select()
        .from(members)
        .where(eq(members.email, body.email))
        .limit(1);

      if (emailConflict.length > 0) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 },
        );
      }
    }

    // Update member
    const [updatedMember] = await db
      .update(members)
      .set({
        familyId: body.familyId !== undefined ? body.familyId : existingMember.familyId,
        firstName: body.firstName,
        lastName: body.lastName,
        membershipDate: body.membershipDate,
        email: body.email !== undefined ? body.email : existingMember.email,
        phone: body.phone !== undefined ? body.phone : existingMember.phone,
        addressLine1: body.addressLine1 !== undefined ? body.addressLine1 : existingMember.addressLine1,
        addressLine2: body.addressLine2 !== undefined ? body.addressLine2 : existingMember.addressLine2,
        city: body.city !== undefined ? body.city : existingMember.city,
        state: body.state !== undefined ? body.state : existingMember.state,
        zipCode: body.zipCode !== undefined ? body.zipCode : existingMember.zipCode,
        dateOfBirth: body.dateOfBirth !== undefined ? body.dateOfBirth : existingMember.dateOfBirth,
        baptismDate: body.baptismDate !== undefined ? body.baptismDate : existingMember.baptismDate,
        membershipStatus: body.membershipStatus !== undefined
          ? (isValidMembershipStatus(body.membershipStatus)
              ? body.membershipStatus.toLowerCase()
              : existingMember.membershipStatus)
          : existingMember.membershipStatus,
        familyRole: body.familyRole !== undefined
          ? (isValidFamilyRole(body.familyRole)
              ? (body.familyRole === "__none__" || !body.familyRole ? null : body.familyRole.toLowerCase())
              : existingMember.familyRole)
          : existingMember.familyRole,
        notes: body.notes !== undefined ? body.notes : existingMember.notes,
        photoUrl: body.photoUrl !== undefined ? body.photoUrl : existingMember.photoUrl,
      })
      .where(eq(members.id, id))
      .returning();

    return NextResponse.json({ member: updatedMember });
  } catch (error) {
    console.error("Error updating member:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if member exists
    const [existingMember] = await db
      .select()
      .from(members)
      .where(eq(members.id, id))
      .limit(1);

    if (!existingMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Delete member (cascade handled by DB)
    await db.delete(members).where(eq(members.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting member:", error);
    return NextResponse.json(
      { error: "Failed to delete member" },
      { status: 500 },
    );
  }
}

