import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { churches } from "@/db/schema";
import { getUserChurches } from "@/lib/tenant-db";

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

    // For now, return the first church (can be enhanced to return all churches)
    // Or get church from subdomain if available
    const { getTenantFromRequest } = await import("@/lib/tenant-context");
    const activeChurchId = await getTenantFromRequest(request) || userChurchesList[0].churchId;

    // Get church with subdomain
    const { eq } = await import("drizzle-orm");
    const church = await db.query.churches.findFirst({
      where: eq(churches.id, activeChurchId),
    });

    if (!church) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    if (!church.subdomain) {
      return NextResponse.json(
        { error: "Church subdomain not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      subdomain: church.subdomain,
      churchId: church.id,
      subscriptionStatus: church.subscriptionStatus,
      stripeSubscriptionId: church.stripeSubscriptionId,
    });
  } catch (error) {
    console.error("Error fetching user's church subdomain:", error);
    return NextResponse.json(
      { error: "Failed to fetch church subdomain", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

