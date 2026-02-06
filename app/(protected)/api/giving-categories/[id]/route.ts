import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { givingCategories, givingItems } from "@/db/schema";
import { getAuthContext, requireAdmin } from "@/lib/api-helpers";
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

    // Get category and verify it belongs to the church
    const [category] = await db
      .select()
      .from(givingCategories)
      .where(and(
        eq(givingCategories.id, id),
        eq(givingCategories.churchId, churchId),
      ))
      .limit(1);

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ category });
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

    // Require admin role
    const { churchId } = await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();

    // Check if category exists and belongs to church
    const [existingCategory] = await db
      .select()
      .from(givingCategories)
      .where(and(
        eq(givingCategories.id, id),
        eq(givingCategories.churchId, churchId),
      ))
      .limit(1);

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    // If name is being changed, check for conflicts
    if (body.name !== undefined && body.name !== existingCategory.name) {
      const name = sanitizeText(body.name.trim());
      
      if (name.length === 0) {
        return NextResponse.json(
          { error: "Category name cannot be empty" },
          { status: 400 },
        );
      }

      const [conflictingCategory] = await db
        .select()
        .from(givingCategories)
        .where(and(
          eq(givingCategories.churchId, churchId),
          eq(givingCategories.name, name),
          eq(givingCategories.id, id), // Exclude current category
        ))
        .limit(1);

      if (conflictingCategory) {
        return NextResponse.json(
          { error: "A category with this name already exists" },
          { status: 400 },
        );
      }
    }

    // Build update object
    const updateData: {
      name?: string;
      displayOrder?: number;
      isActive?: boolean;
    } = {};

    if (body.name !== undefined) {
      updateData.name = sanitizeText(body.name.trim());
    }
    if (body.displayOrder !== undefined) {
      updateData.displayOrder = parseInt(body.displayOrder, 10);
    }
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    // Update category
    const [updatedCategory] = await db
      .update(givingCategories)
      .set(updateData)
      .where(eq(givingCategories.id, id))
      .returning();

    return NextResponse.json({ category: updatedCategory });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require admin role
    const { churchId } = await requireAdmin(request);
    const { id } = await params;

    // Check if category exists and belongs to church
    const [category] = await db
      .select()
      .from(givingCategories)
      .where(and(
        eq(givingCategories.id, id),
        eq(givingCategories.churchId, churchId),
      ))
      .limit(1);

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    // Check if category has any giving_items (foreign key will prevent deletion, but we can give a better error)
    const [itemCount] = await db
      .select({ count: givingItems.id })
      .from(givingItems)
      .where(eq(givingItems.categoryId, id))
      .limit(1);

    if (itemCount) {
      return NextResponse.json(
        { error: "Cannot delete category that has giving records. Deactivate it instead." },
        { status: 400 },
      );
    }

    // Delete category
    await db
      .delete(givingCategories)
      .where(eq(givingCategories.id, id));

    return NextResponse.json({ message: "Category deleted successfully" });
  } catch (error) {
    return createErrorResponse(error);
  }
}
