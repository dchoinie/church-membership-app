import { NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";

import { db } from "@/db";
import { givingCategories, churches } from "@/db/schema";
import { getAuthContext, requireAdmin } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeText } from "@/lib/sanitize";

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    // Get all categories for the current church, ordered by display_order
    const categories = await db
      .select()
      .from(givingCategories)
      .where(eq(givingCategories.churchId, churchId))
      .orderBy(asc(givingCategories.displayOrder), asc(givingCategories.name));

    return NextResponse.json({ categories });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require admin role
    const { churchId } = await requireAdmin(request);

    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 },
      );
    }

    const name = sanitizeText(body.name.trim());

    // Check if category with same name already exists for this church
    const [existingCategory] = await db
      .select()
      .from(givingCategories)
      .where(and(
        eq(givingCategories.churchId, churchId),
        eq(givingCategories.name, name),
      ))
      .limit(1);

    if (existingCategory) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 400 },
      );
    }

    // Get the maximum display_order for this church to place new category at the end
    const [maxOrderResult] = await db
      .select({ maxOrder: givingCategories.displayOrder })
      .from(givingCategories)
      .where(eq(givingCategories.churchId, churchId))
      .orderBy(asc(givingCategories.displayOrder))
      .limit(1);

    const displayOrder = body.displayOrder !== undefined 
      ? parseInt(body.displayOrder, 10)
      : (maxOrderResult?.maxOrder !== undefined ? maxOrderResult.maxOrder + 1 : 0);

    // Create new category
    const [newCategory] = await db
      .insert(givingCategories)
      .values({
        churchId,
        name,
        displayOrder,
        isActive: body.isActive !== undefined ? body.isActive : true,
      })
      .returning();

    return NextResponse.json({ category: newCategory }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}
