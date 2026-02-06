import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { giving, members, givingItems, givingCategories } from "@/db/schema";
import { getAuthContext, requirePermission } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeText } from "@/lib/sanitize";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { churchId } = await getAuthContext(request);
    const { id } = await params;

    // Get giving record with member info and verify member belongs to church
    const [givingRecord] = await db
      .select({
        id: giving.id,
        memberId: giving.memberId,
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
      .where(and(eq(giving.id, id), eq(members.churchId, churchId)))
      .limit(1);

    if (!givingRecord) {
      return NextResponse.json(
        { error: "Giving record not found" },
        { status: 404 },
      );
    }

    // Get items for this giving record
    const items = await db
      .select({
        categoryId: givingItems.categoryId,
        categoryName: givingCategories.name,
        amount: givingItems.amount,
      })
      .from(givingItems)
      .innerJoin(givingCategories, eq(givingItems.categoryId, givingCategories.id))
      .where(eq(givingItems.givingId, id));

    return NextResponse.json({ giving: { ...givingRecord, items } });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require giving_edit permission
    const { churchId } = await requirePermission("giving_edit", request);
    const { id } = await params;
    const body = await request.json();

    // Check if giving record exists and member belongs to church
    const [existingGiving] = await db
      .select({
        id: giving.id,
        memberId: giving.memberId,
        dateGiven: giving.dateGiven,
        notes: giving.notes,
      })
      .from(giving)
      .innerJoin(members, eq(giving.memberId, members.id))
      .where(and(eq(giving.id, id), eq(members.churchId, churchId)))
      .limit(1);

    if (!existingGiving) {
      return NextResponse.json(
        { error: "Giving record not found" },
        { status: 404 },
      );
    }

    // Validate items array if provided
    let validItems: Array<{ categoryId: string; amount: string }> = [];
    if (body.items !== undefined) {
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return NextResponse.json(
          { error: "At least one giving item is required" },
          { status: 400 },
        );
      }

      // Validate items and filter out zero/null amounts
      validItems = body.items
        .map((item: { categoryId: string; amount: number | string }) => {
          const amount = typeof item.amount === "string" ? parseFloat(item.amount) : item.amount;
          if (!item.categoryId || isNaN(amount) || amount <= 0) {
            return null;
          }
          return {
            categoryId: item.categoryId,
            amount: amount.toString(),
          };
        })
        .filter((item: { categoryId: string; amount: string } | null) => item !== null) as Array<{ categoryId: string; amount: string }>;

      if (validItems.length === 0) {
        return NextResponse.json(
          { error: "At least one item with a positive amount is required" },
          { status: 400 },
        );
      }

      // Verify all category IDs belong to this church
      for (const item of validItems) {
        const [category] = await db
          .select()
          .from(givingCategories)
          .where(and(
            eq(givingCategories.id, item.categoryId),
            eq(givingCategories.churchId, churchId),
          ))
          .limit(1);

        if (!category) {
          return NextResponse.json(
            { error: `Category ${item.categoryId} not found or does not belong to this church` },
            { status: 400 },
          );
        }
      }
    }

    // Update giving record
    const updateData: {
      dateGiven?: string;
      notes?: string | null;
    } = {};

    if (body.dateGiven !== undefined) {
      updateData.dateGiven = body.dateGiven;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes ? sanitizeText(body.notes) : null;
    }

    if (Object.keys(updateData).length > 0) {
      await db
        .update(giving)
        .set(updateData)
        .where(eq(giving.id, id));
    }

    // Update items if provided
    if (validItems.length > 0) {
      // Delete existing items
      await db
        .delete(givingItems)
        .where(eq(givingItems.givingId, id));

      // Insert new items
      await db
        .insert(givingItems)
        .values(
          validItems.map(item => ({
            givingId: id,
            categoryId: item.categoryId,
            amount: item.amount,
          }))
        );
    }

    // Fetch updated record with member info and items
    const [givingWithMember] = await db
      .select({
        id: giving.id,
        memberId: giving.memberId,
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
      .where(and(eq(giving.id, id), eq(members.churchId, churchId)))
      .limit(1);

    // Get items for this giving record
    const items = await db
      .select({
        categoryId: givingItems.categoryId,
        categoryName: givingCategories.name,
        amount: givingItems.amount,
      })
      .from(givingItems)
      .innerJoin(givingCategories, eq(givingItems.categoryId, givingCategories.id))
      .where(eq(givingItems.givingId, id));

    return NextResponse.json({ giving: { ...givingWithMember, items } });
  } catch (error) {
    return createErrorResponse(error);
  }
}
