import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { families, members } from "@/db/schema";

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

    // Get family with parent info
    const [family] = await db
      .select({
        id: families.id,
        parentFamilyId: families.parentFamilyId,
        createdAt: families.createdAt,
        updatedAt: families.updatedAt,
      })
      .from(families)
      .where(eq(families.id, id))
      .limit(1);

    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    // Get parent family info if exists
    let parentFamily = null;
    if (family.parentFamilyId) {
      const [parent] = await db
        .select({
          id: families.id,
        })
        .from(families)
        .where(eq(families.id, family.parentFamilyId))
        .limit(1);
      parentFamily = parent;
    }

    // Get all members in this family
    const familyMembers = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        membershipDate: members.membershipDate,
        familyRole: members.familyRole,
        email: members.email,
        phone: members.phone,
      })
      .from(members)
      .where(eq(members.familyId, id));

    return NextResponse.json({
      family,
      parentFamily,
      members: familyMembers,
    });
  } catch (error) {
    console.error("Error fetching family:", error);
    return NextResponse.json(
      { error: "Failed to fetch family" },
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
    const { parentFamilyId } = body;

    // Check if family exists
    const [existingFamily] = await db
      .select()
      .from(families)
      .where(eq(families.id, id))
      .limit(1);

    if (!existingFamily) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    // Validate parentFamilyId if provided
    if (parentFamilyId) {
      // Prevent self-reference
      if (parentFamilyId === id) {
        return NextResponse.json(
          { error: "Family cannot be its own parent" },
          { status: 400 },
        );
      }

      // Check if parent exists
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

      // Prevent circular reference (check if parent is a descendant)
      let currentParentId = parentFamily.parentFamilyId;
      while (currentParentId) {
        if (currentParentId === id) {
          return NextResponse.json(
            { error: "Cannot create circular reference" },
            { status: 400 },
          );
        }
        const [currentParent] = await db
          .select()
          .from(families)
          .where(eq(families.id, currentParentId))
          .limit(1);
        currentParentId = currentParent?.parentFamilyId || null;
      }
    }

    // Update family
    const [updatedFamily] = await db
      .update(families)
      .set({
        parentFamilyId: parentFamilyId === "__none__" ? null : parentFamilyId || null,
        updatedAt: new Date(),
      })
      .where(eq(families.id, id))
      .returning();

    return NextResponse.json({ family: updatedFamily });
  } catch (error) {
    console.error("Error updating family:", error);
    return NextResponse.json(
      { error: "Failed to update family" },
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

    // Check if family exists
    const [existingFamily] = await db
      .select()
      .from(families)
      .where(eq(families.id, id))
      .limit(1);

    if (!existingFamily) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    // Check if family has members
    const familyMembers = await db
      .select()
      .from(members)
      .where(eq(members.familyId, id))
      .limit(1);

    if (familyMembers.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete family with members. Remove all members first." },
        { status: 400 },
      );
    }

    // Check if family has child families
    const childFamilies = await db
      .select()
      .from(families)
      .where(eq(families.parentFamilyId, id))
      .limit(1);

    if (childFamilies.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete family with child families. Remove or reassign child families first." },
        { status: 400 },
      );
    }

    // Delete family (cascade handled by DB - members.familyId will be set to null)
    await db.delete(families).where(eq(families.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting family:", error);
    return NextResponse.json(
      { error: "Failed to delete family" },
      { status: 500 },
    );
  }
}

