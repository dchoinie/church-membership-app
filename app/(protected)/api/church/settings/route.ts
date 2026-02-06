import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { db } from "@/db";
import { churches } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(request: Request) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require admin role - only admins can update church settings
    const { churchId } = await requireAdmin(request);
    
    if (!churchId) {
      return NextResponse.json(
        { error: "Tenant context not found" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Get the current church
    const currentChurch = await db.query.churches.findFirst({
      where: eq(churches.id, churchId),
    });

    if (!currentChurch) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    const updateData: {
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      zip?: string | null;
      denomination?: string | null;
      taxId?: string | null;
      is501c3?: boolean;
      taxStatementDisclaimer?: string | null;
      goodsServicesProvided?: boolean;
      goodsServicesStatement?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    // Update fields if provided
    if (body.phone !== undefined) {
      updateData.phone = body.phone || null;
    }
    if (body.email !== undefined) {
      updateData.email = body.email || null;
    }
    if (body.address !== undefined) {
      updateData.address = body.address || null;
    }
    if (body.city !== undefined) {
      updateData.city = body.city || null;
    }
    if (body.state !== undefined) {
      updateData.state = body.state || null;
    }
    if (body.zip !== undefined) {
      updateData.zip = body.zip || null;
    }
    if (body.denomination !== undefined) {
      updateData.denomination = body.denomination || null;
    }
    if (body.taxId !== undefined) {
      updateData.taxId = body.taxId || null;
    }
    if (body.is501c3 !== undefined) {
      updateData.is501c3 = body.is501c3;
    }
    if (body.taxStatementDisclaimer !== undefined) {
      updateData.taxStatementDisclaimer = body.taxStatementDisclaimer || null;
    }
    if (body.goodsServicesProvided !== undefined) {
      updateData.goodsServicesProvided = body.goodsServicesProvided;
    }
    if (body.goodsServicesStatement !== undefined) {
      updateData.goodsServicesStatement = body.goodsServicesStatement || null;
    }

    const [updatedChurch] = await db
      .update(churches)
      .set(updateData)
      .where(eq(churches.id, churchId))
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

