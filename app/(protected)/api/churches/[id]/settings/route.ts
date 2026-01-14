import { NextResponse } from "next/server";
import { getAuthContext, requireAdmin } from "@/lib/api-helpers";
import { db } from "@/db";
import { churches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeText, sanitizeUrl } from "@/lib/sanitize";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require admin role
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

    // Update church settings (branding)
    const updateData: {
      logoUrl?: string | undefined;
      primaryColor?: string | undefined;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (body.logoUrl !== undefined) {
      updateData.logoUrl = body.logoUrl ? sanitizeUrl(body.logoUrl) : undefined;
    }

    if (body.primaryColor !== undefined) {
      // Validate hex color format if provided
      if (body.primaryColor && !/^#[0-9A-F]{6}$/i.test(body.primaryColor)) {
        return NextResponse.json(
          { error: "Invalid color format. Use hex format (e.g., #3b82f6)" },
          { status: 400 }
        );
      }
      updateData.primaryColor = body.primaryColor || undefined;
    }

    const [updatedChurch] = await db
      .update(churches)
      .set(updateData)
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

