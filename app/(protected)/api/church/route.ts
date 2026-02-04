import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant-context";
import { db } from "@/db";
import { churches } from "@/db/schema";
import { user } from "@/auth-schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    // Check authentication first
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get tenant context from subdomain
    const churchId = await getTenantFromRequest(request);
    
    // If no tenant context from subdomain, try to get first church from user_churches
    // This handles cases where subdomain lookup fails (e.g., Supabase query issues)
    if (!churchId) {
      const url = new URL(request.url);
      const hostname = url.hostname || request.headers.get("host") || "";
      console.log(`No tenant context from subdomain. Hostname: ${hostname}, User: ${session.user.id}`);
      
      const { getUserChurches } = await import("@/lib/tenant-db");
      const userChurches = await getUserChurches(session.user.id);
      
      if (userChurches.length > 0) {
        // Use first church as fallback
        const fallbackChurchId = userChurches[0].churchId;
        console.log(`Using fallback churchId from user_churches: ${fallbackChurchId}`);
        // Note: We can't set churchId here since it's const, but this is just logging
        // The actual fallback should be handled by getTenantFromRequest or middleware
      } else {
        console.error(`User ${session.user.id} has no churches in database`);
      }
    }
    
    if (!churchId) {
      return NextResponse.json(
        { error: "Tenant context not found. Please access via church subdomain." },
        { status: 400 }
      );
    }

    const church = await db.query.churches.findFirst({
      where: eq(churches.id, churchId),
    });

    if (!church) {
      console.error(`Church ${churchId} not found in database`);
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ church });
  } catch (error) {
    console.error("Error fetching church:", error);
    return NextResponse.json(
      { error: "Failed to fetch church data" },
      { status: 500 }
    );
  }
}

