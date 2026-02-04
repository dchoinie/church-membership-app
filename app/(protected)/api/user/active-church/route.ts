import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { verifyUserBelongsToChurch, getUserChurches } from "@/lib/tenant-db";
import { getTenantFromRequest } from "@/lib/tenant-context";

/**
 * GET /api/user/active-church
 * Returns the current active church ID (from subdomain or first church)
 */
export async function GET(request: Request) {
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

    // Try to get church from subdomain first
    let activeChurchId = await getTenantFromRequest(request);

    // If no subdomain, use first church
    if (!activeChurchId) {
      const userChurchesList = await getUserChurches(session.user.id);
      if (userChurchesList.length > 0) {
        activeChurchId = userChurchesList[0].churchId;
      }
    }

    if (!activeChurchId) {
      return NextResponse.json(
        { error: "No active church found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      churchId: activeChurchId,
    });
  } catch (error) {
    console.error("Error fetching active church:", error);
    return NextResponse.json(
      { error: "Failed to fetch active church", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/active-church
 * Sets the active church (validates user belongs to it)
 * Note: Active church is primarily determined by subdomain, this endpoint
 * is mainly for validation/confirmation
 */
export async function POST(request: Request) {
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

    const { churchId } = await request.json();

    if (!churchId) {
      return NextResponse.json(
        { error: "Church ID is required" },
        { status: 400 }
      );
    }

    // Verify user belongs to this church
    const belongs = await verifyUserBelongsToChurch(session.user.id, churchId);

    if (!belongs) {
      return NextResponse.json(
        { error: "You do not belong to this church" },
        { status: 403 }
      );
    }

    // Active church is determined by subdomain, so we just validate and return success
    return NextResponse.json({
      success: true,
      churchId,
      message: "Active church validated",
    });
  } catch (error) {
    console.error("Error setting active church:", error);
    return NextResponse.json(
      { error: "Failed to set active church", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
