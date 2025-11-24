import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, desc, count, and } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { giving, members } from "@/db/schema";

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(100, pageSize)); // Max 100 per page
    const offset = (validPage - 1) * validPageSize;

    // Build where conditions
    const whereCondition = memberId ? eq(giving.memberId, memberId) : undefined;

    // Get total count
    const countQuery = db
      .select({ count: count() })
      .from(giving);
    const [totalResult] = whereCondition
      ? await countQuery.where(whereCondition)
      : await countQuery;
    const total = totalResult.count;
    const totalPages = Math.ceil(total / validPageSize);

    // Get paginated giving records with member info
    const queryBuilder = db
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
      .orderBy(desc(giving.dateGiven), desc(giving.createdAt))
      .limit(validPageSize)
      .offset(offset);

    const givingRecords = whereCondition
      ? await queryBuilder.where(whereCondition)
      : await queryBuilder;

    return NextResponse.json({
      giving: givingRecords,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching giving records:", error);
    return NextResponse.json(
      { error: "Failed to fetch giving records" },
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
    if (!body.memberId || !body.amount || !body.dateGiven) {
      return NextResponse.json(
        { error: "Member ID, amount, and date given are required" },
        { status: 400 },
      );
    }

    // Validate amount is a positive number
    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 },
      );
    }

    // Check if member exists and is head of household
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.id, body.memberId))
      .limit(1);

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 },
      );
    }

    if (!member.headOfHousehold) {
      return NextResponse.json(
        { error: "Only head of household members can have giving records" },
        { status: 400 },
      );
    }

    // Insert new giving record
    const [newGiving] = await db
      .insert(giving)
      .values({
        memberId: body.memberId,
        amount: amount.toString(),
        dateGiven: body.dateGiven,
        notes: body.notes || null,
      })
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
      .where(eq(giving.id, newGiving.id))
      .limit(1);

    return NextResponse.json({ giving: givingWithMember }, { status: 201 });
  } catch (error) {
    console.error("Error creating giving record:", error);
    return NextResponse.json(
      { error: "Failed to create giving record" },
      { status: 500 },
    );
  }
}

