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
        currentAmount: giving.currentAmount,
        missionAmount: giving.missionAmount,
        memorialsAmount: giving.memorialsAmount,
        debtAmount: giving.debtAmount,
        schoolAmount: giving.schoolAmount,
        miscellaneousAmount: giving.miscellaneousAmount,
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

    // Validate amounts if provided
    let currentAmount = existingGiving.currentAmount;
    let missionAmount = existingGiving.missionAmount;
    let memorialsAmount = existingGiving.memorialsAmount;
    let debtAmount = existingGiving.debtAmount;
    let schoolAmount = existingGiving.schoolAmount;
    let miscellaneousAmount = existingGiving.miscellaneousAmount;

    if (body.currentAmount !== undefined) {
      const parsedAmount = body.currentAmount ? parseFloat(body.currentAmount) : null;
      if (parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount < 0)) {
        return NextResponse.json(
          { error: "Current amount must be a non-negative number" },
          { status: 400 },
        );
      }
      currentAmount = parsedAmount !== null ? parsedAmount.toString() : null;
    }

    if (body.missionAmount !== undefined) {
      const parsedAmount = body.missionAmount ? parseFloat(body.missionAmount) : null;
      if (parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount < 0)) {
        return NextResponse.json(
          { error: "Mission amount must be a non-negative number" },
          { status: 400 },
        );
      }
      missionAmount = parsedAmount !== null ? parsedAmount.toString() : null;
    }

    if (body.memorialsAmount !== undefined) {
      const parsedAmount = body.memorialsAmount ? parseFloat(body.memorialsAmount) : null;
      if (parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount < 0)) {
        return NextResponse.json(
          { error: "Memorials amount must be a non-negative number" },
          { status: 400 },
        );
      }
      memorialsAmount = parsedAmount !== null ? parsedAmount.toString() : null;
    }

    if (body.debtAmount !== undefined) {
      const parsedAmount = body.debtAmount ? parseFloat(body.debtAmount) : null;
      if (parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount < 0)) {
        return NextResponse.json(
          { error: "Debt amount must be a non-negative number" },
          { status: 400 },
        );
      }
      debtAmount = parsedAmount !== null ? parsedAmount.toString() : null;
    }

    if (body.schoolAmount !== undefined) {
      const parsedAmount = body.schoolAmount ? parseFloat(body.schoolAmount) : null;
      if (parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount < 0)) {
        return NextResponse.json(
          { error: "School amount must be a non-negative number" },
          { status: 400 },
        );
      }
      schoolAmount = parsedAmount !== null ? parsedAmount.toString() : null;
    }

    if (body.miscellaneousAmount !== undefined) {
      const parsedAmount = body.miscellaneousAmount ? parseFloat(body.miscellaneousAmount) : null;
      if (parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount < 0)) {
        return NextResponse.json(
          { error: "Miscellaneous amount must be a non-negative number" },
          { status: 400 },
        );
      }
      miscellaneousAmount = parsedAmount !== null ? parsedAmount.toString() : null;
    }

    // Validate at least one amount is provided
    if (!currentAmount && !missionAmount && !memorialsAmount && !debtAmount && !schoolAmount && !miscellaneousAmount) {
      return NextResponse.json(
        { error: "At least one amount is required" },
        { status: 400 },
      );
    }

    // Update giving record
    await db
      .update(giving)
      .set({
        currentAmount,
        missionAmount,
        memorialsAmount,
        debtAmount,
        schoolAmount,
        miscellaneousAmount,
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
        currentAmount: giving.currentAmount,
        missionAmount: giving.missionAmount,
        memorialsAmount: giving.memorialsAmount,
        debtAmount: giving.debtAmount,
        schoolAmount: giving.schoolAmount,
        miscellaneousAmount: giving.miscellaneousAmount,
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

