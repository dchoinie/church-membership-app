import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { churches } from "@/db/schema";
import { getUserChurches } from "@/lib/tenant-db";
import { addUserToChurch } from "@/lib/tenant-db";
import { eq } from "drizzle-orm";

/**
 * GET /api/user/churches
 * Returns all churches the user belongs to with their roles
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

    // Get user's churches from junction table
    const userChurchesList = await getUserChurches(session.user.id);

    if (userChurchesList.length === 0) {
      return NextResponse.json({
        churches: [],
      });
    }

    // Fetch church details for each membership
    const churchIds = userChurchesList.map(m => m.churchId);
    const churchesList = await db.query.churches.findMany({
      where: inArray(churches.id, churchIds),
    });

    // Create a map of churchId to role
    const churchRoleMap = new Map(
      userChurchesList.map(m => [m.churchId, m.role])
    );

    // Combine church data with roles
    const churchesWithRoles = churchesList.map(church => ({
      id: church.id,
      name: church.name,
      subdomain: church.subdomain,
      role: churchRoleMap.get(church.id) || "viewer",
      logoUrl: church.logoUrl,
      primaryColor: church.primaryColor,
    }));

    return NextResponse.json({
      churches: churchesWithRoles,
    });
  } catch (error) {
    console.error("Error fetching user churches:", error);
    return NextResponse.json(
      { error: "Failed to fetch churches", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/churches
 * Adds a church to the user's account
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

    const { churchId, role = "viewer" } = await request.json();

    if (!churchId) {
      return NextResponse.json(
        { error: "Church ID is required" },
        { status: 400 }
      );
    }

    // Verify church exists
    const church = await db.query.churches.findFirst({
      where: eq(churches.id, churchId),
    });

    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    // Add user to church
    await addUserToChurch(session.user.id, churchId, role);

    return NextResponse.json({
      success: true,
      message: "Church added to your account",
      church: {
        id: church.id,
        name: church.name,
        subdomain: church.subdomain,
        role,
      },
    });
  } catch (error) {
    console.error("Error adding church to user:", error);
    return NextResponse.json(
      { error: "Failed to add church", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
