import { NextResponse } from "next/server";
import { getAuthContext, handleAuthError } from "@/lib/api-helpers";
import { db } from "@/db";
import { churches } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { churchId: userChurchId, user } = await getAuthContext(request);
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

    // Update church
    const [updatedChurch] = await db
      .update(churches)
      .set({
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
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
    const authError = handleAuthError(error);
    if (authError.status !== 500) return authError;

    console.error("Error updating church:", error);
    return NextResponse.json(
      { error: "Failed to update church" },
      { status: 500 }
    );
  }
}

