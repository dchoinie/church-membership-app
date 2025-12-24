import { NextResponse } from "next/server";
import { db } from "@/db";
import { churches } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { handleAuthError } from "@/lib/api-helpers";
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
    return handleAuthError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const [updatedChurch] = await db
      .update(churches)
      .set({
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
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
    return handleAuthError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin(request);
    const { id } = await params;

    await db.delete(churches).where(eq(churches.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}

