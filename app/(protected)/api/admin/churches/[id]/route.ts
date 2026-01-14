import { NextResponse } from "next/server";
import { db } from "@/db";
import { churches } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeText } from "@/lib/sanitize";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin(request);
    const { id } = await params;

    const church = await db.query.churches.findFirst({
      where: eq(churches.id, id),
    });

    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ church });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    await requireSuperAdmin(request);
    const { id } = await params;
    const body = await request.json();

    // Sanitize input
    const sanitizedData = {
      name: body.name ? sanitizeText(body.name) : null,
      email: body.email ? sanitizeText(body.email) : null,
      phone: body.phone ? sanitizeText(body.phone) : null,
      address: body.address ? sanitizeText(body.address) : null,
    };

    const [updatedChurch] = await db
      .update(churches)
      .set({
        name: sanitizedData.name,
        email: sanitizedData.email,
        phone: sanitizedData.phone,
        address: sanitizedData.address,
        subscriptionStatus: body.subscriptionStatus,
        subscriptionPlan: body.subscriptionPlan,
        updatedAt: new Date(),
      })
      .where(eq(churches.id, id))
      .returning();

    if (!updatedChurch) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ church: updatedChurch });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    await requireSuperAdmin(request);
    const { id } = await params;

    await db.delete(churches).where(eq(churches.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error);
  }
}

