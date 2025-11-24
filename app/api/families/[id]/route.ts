import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { household, members } from "@/db/schema";

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

    // Get household
    const [h] = await db
      .select()
      .from(household)
      .where(eq(household.id, id))
      .limit(1);

    if (!h) {
      return NextResponse.json({ error: "Household not found" }, { status: 404 });
    }

    // Get all members in this household
    const householdMembers = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        middleName: members.middleName,
        lastName: members.lastName,
        suffix: members.suffix,
        preferredName: members.preferredName,
        email1: members.email1,
        phoneHome: members.phoneHome,
        phoneCell1: members.phoneCell1,
        participation: members.participation,
        envelopeNumber: members.envelopeNumber,
      })
      .from(members)
      .where(eq(members.householdId, id));

    return NextResponse.json({
      household: h,
      members: householdMembers,
    });
  } catch (error) {
    console.error("Error fetching household:", error);
    return NextResponse.json(
      { error: "Failed to fetch household" },
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

    // Check if household exists
    const [existingHousehold] = await db
      .select()
      .from(household)
      .where(eq(household.id, id))
      .limit(1);

    if (!existingHousehold) {
      return NextResponse.json({ error: "Household not found" }, { status: 404 });
    }

    // Update household
    const [updatedHousehold] = await db
      .update(household)
      .set({
        name: body.name !== undefined ? body.name : existingHousehold.name,
        type: body.type !== undefined ? body.type : existingHousehold.type,
        isNonHousehold: body.isNonHousehold !== undefined ? body.isNonHousehold : existingHousehold.isNonHousehold,
        personAssigned: body.personAssigned !== undefined ? body.personAssigned : existingHousehold.personAssigned,
        ministryGroup: body.ministryGroup !== undefined ? body.ministryGroup : existingHousehold.ministryGroup,
        address1: body.address1 !== undefined ? body.address1 : existingHousehold.address1,
        address2: body.address2 !== undefined ? body.address2 : existingHousehold.address2,
        city: body.city !== undefined ? body.city : existingHousehold.city,
        state: body.state !== undefined ? body.state : existingHousehold.state,
        zip: body.zip !== undefined ? body.zip : existingHousehold.zip,
        country: body.country !== undefined ? body.country : existingHousehold.country,
        alternateAddressBegin: body.alternateAddressBegin !== undefined ? body.alternateAddressBegin : existingHousehold.alternateAddressBegin,
        alternateAddressEnd: body.alternateAddressEnd !== undefined ? body.alternateAddressEnd : existingHousehold.alternateAddressEnd,
        updatedAt: new Date(),
      })
      .where(eq(household.id, id))
      .returning();

    return NextResponse.json({ household: updatedHousehold });
  } catch (error) {
    console.error("Error updating household:", error);
    return NextResponse.json(
      { error: "Failed to update household" },
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

    // Check if household exists
    const [existingHousehold] = await db
      .select()
      .from(household)
      .where(eq(household.id, id))
      .limit(1);

    if (!existingHousehold) {
      return NextResponse.json({ error: "Household not found" }, { status: 404 });
    }

    // Check if household has members
    const householdMembers = await db
      .select()
      .from(members)
      .where(eq(members.householdId, id))
      .limit(1);

    if (householdMembers.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete household with members. Remove all members first." },
        { status: 400 },
      );
    }

    // Delete household (cascade handled by DB - members.householdId will be set to null)
    await db.delete(household).where(eq(household.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting household:", error);
    return NextResponse.json(
      { error: "Failed to delete household" },
      { status: 500 },
    );
  }
}

