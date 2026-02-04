import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { removeUserFromChurch, getUserChurches } from "@/lib/tenant-db";

/**
 * DELETE /api/user/churches/[churchId]
 * Removes a church from the user's account
 */
export async function DELETE(
  request: Request,
  { params }: { params: { churchId: string } }
) {
  try {
    // Get authenticated session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { churchId } = params;

    if (!churchId) {
      return NextResponse.json(
        { error: "Church ID is required" },
        { status: 400 }
      );
    }

    // Check if user has at least one other church
    const userChurchesList = await getUserChurches(session.user.id);
    
    if (userChurchesList.length <= 1) {
      return NextResponse.json(
        { error: "Cannot remove your only church. You must belong to at least one church." },
        { status: 400 }
      );
    }

    // Verify user belongs to this church
    const belongsToChurch = userChurchesList.some(m => m.churchId === churchId);
    
    if (!belongsToChurch) {
      return NextResponse.json(
        { error: "You do not belong to this church" },
        { status: 404 }
      );
    }

    // Remove user from church
    await removeUserFromChurch(session.user.id, churchId);

    return NextResponse.json({
      success: true,
      message: "Church removed from your account",
    });
  } catch (error) {
    console.error("Error removing church from user:", error);
    return NextResponse.json(
      { error: "Failed to remove church", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
