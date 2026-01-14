import { NextResponse } from "next/server";
import { getAuthContext, requireAdmin } from "@/lib/api-helpers";
import { db } from "@/db";
import { churches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeText } from "@/lib/sanitize";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require admin role (super admin can update any church)
    const { churchId: userChurchId, user } = await requireAdmin(request);
    const { id } = await params;

    // Verify the user is updating their own church (unless super admin)
    if (!user.isSuperAdmin && userChurchId !== id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: "Church name is required" },
        { status: 400 }
      );
    }

    // Sanitize input
    const sanitizedData = {
      name: sanitizeText(body.name),
      email: body.email ? sanitizeText(body.email) : null,
      phone: body.phone ? sanitizeText(body.phone) : null,
      address: body.address ? sanitizeText(body.address) : null,
    };

    // Update church
    const [updatedChurch] = await db
      .update(churches)
      .set({
        name: sanitizedData.name,
        email: sanitizedData.email,
        phone: sanitizedData.phone,
        address: sanitizedData.address,
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

