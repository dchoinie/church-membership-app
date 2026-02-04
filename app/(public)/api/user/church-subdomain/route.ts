import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { churches } from "@/db/schema";
import { getUserChurches } from "@/lib/tenant-db";
import { eq, inArray } from "drizzle-orm";

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
      return NextResponse.json(
        { error: "User does not belong to any church" },
        { status: 404 }
      );
    }

    // Get church from subdomain if available, otherwise use first church
    const { getTenantFromRequest } = await import("@/lib/tenant-context");
    const activeChurchId = await getTenantFromRequest(request) || userChurchesList[0].churchId;

    // Fetch all churches the user belongs to
    const churchIds = userChurchesList.map(m => m.churchId);
    const churchesList = await db.query.churches.findMany({
      where: inArray(churches.id, churchIds),
    });

    // Create a map of churchId to role
    const churchRoleMap = new Map(
      userChurchesList.map(m => [m.churchId, m.role])
    );

    // Find active church
    const activeChurch = churchesList.find(c => c.id === activeChurchId);

    if (!activeChurch) {
      return NextResponse.json(
        { error: "Active church not found" },
        { status: 404 }
      );
    }

    if (!activeChurch.subdomain) {
      return NextResponse.json(
        { error: "Church subdomain not found" },
        { status: 404 }
      );
    }

    // If user has multiple churches, return all of them
    if (churchesList.length > 1) {
      const churchesWithRoles = churchesList.map(church => ({
        id: church.id,
        name: church.name,
        subdomain: church.subdomain,
        role: churchRoleMap.get(church.id) || "viewer",
        logoUrl: church.logoUrl,
        primaryColor: church.primaryColor,
        subscriptionStatus: church.subscriptionStatus,
        stripeSubscriptionId: church.stripeSubscriptionId,
      }));

      return NextResponse.json({
        subdomain: activeChurch.subdomain,
        churchId: activeChurch.id,
        subscriptionStatus: activeChurch.subscriptionStatus,
        stripeSubscriptionId: activeChurch.stripeSubscriptionId,
        multipleChurches: true,
        churches: churchesWithRoles,
      });
    }

    // Single church - return as before for backward compatibility
    return NextResponse.json({
      subdomain: activeChurch.subdomain,
      churchId: activeChurch.id,
      subscriptionStatus: activeChurch.subscriptionStatus,
      stripeSubscriptionId: activeChurch.stripeSubscriptionId,
      multipleChurches: false,
    });
  } catch (error) {
    console.error("Error fetching user's church subdomain:", error);
    return NextResponse.json(
      { error: "Failed to fetch church subdomain", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

