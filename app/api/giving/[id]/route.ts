import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { giving, members } from "@/db/schema";

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

    // Get giving record with member info
    const [givingRecord] = await db
      .select({
        id: giving.id,
        memberId: giving.memberId,
        amount: giving.amount,
        dateGiven: giving.dateGiven,
        notes: giving.notes,
        createdAt: giving.createdAt,
        updatedAt: giving.updatedAt,
        member: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
        },
      })
      .from(giving)
      .innerJoin(members, eq(giving.memberId, members.id))
      .where(eq(giving.id, id))
      .limit(1);

    if (!givingRecord) {
      return NextResponse.json(
        { error: "Giving record not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ giving: givingRecord });
  } catch (error) {
    console.error("Error fetching giving record:", error);
    return NextResponse.json(
      { error: "Failed to fetch giving record" },
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

    // Check if giving record exists
    const [existingGiving] = await db
      .select()
      .from(giving)
      .where(eq(giving.id, id))
      .limit(1);

    if (!existingGiving) {
      return NextResponse.json(
        { error: "Giving record not found" },
        { status: 404 },
      );
    }

    // Validate amount if provided
    let amount = existingGiving.amount;
    if (body.amount !== undefined) {
      const parsedAmount = parseFloat(body.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json(
          { error: "Amount must be a positive number" },
          { status: 400 },
        );
      }
      amount = parsedAmount.toString();
    }

    // Update giving record
    const [updatedGiving] = await db
      .update(giving)
      .set({
        amount: amount,
        dateGiven: body.dateGiven !== undefined ? body.dateGiven : existingGiving.dateGiven,
        notes: body.notes !== undefined ? body.notes : existingGiving.notes,
      })
      .where(eq(giving.id, id))
      .returning();

    // Fetch with member info
    const [givingWithMember] = await db
      .select({
        id: giving.id,
        memberId: giving.memberId,
        amount: giving.amount,
        dateGiven: giving.dateGiven,
        notes: giving.notes,
        createdAt: giving.createdAt,
        updatedAt: giving.updatedAt,
        member: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
        },
      })
      .from(giving)
      .innerJoin(members, eq(giving.memberId, members.id))
      .where(eq(giving.id, id))
      .limit(1);

    return NextResponse.json({ giving: givingWithMember });
  } catch (error) {
    console.error("Error updating giving record:", error);
    return NextResponse.json(
      { error: "Failed to update giving record" },
      { status: 500 },
    );
  }
}

