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

    // Try to get tenant context from subdomain first
    let churchId = await getTenantFromRequest(request);
    
    // If no tenant context from subdomain, fall back to user's churchId
    // This handles cases where subdomain lookup fails (e.g., Supabase query issues)
    if (!churchId) {
      const url = new URL(request.url);
      const hostname = url.hostname || request.headers.get("host") || "";
      console.log(`No tenant context from subdomain. Hostname: ${hostname}, User: ${session.user.id}`);
      
      const userRecord = await db.query.user.findFirst({
        where: eq(user.id, session.user.id),
        columns: {
          churchId: true,
        },
      });

      if (userRecord?.churchId) {
        churchId = userRecord.churchId;
        console.log(`Using fallback churchId from user record: ${churchId}`);
      } else {
        console.error(`User ${session.user.id} has no churchId in database`);
      }
    }
    
    if (!churchId) {
      return NextResponse.json(
        { error: "Tenant context not found" },
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

