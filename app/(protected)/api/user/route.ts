import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/auth-schema";
import { eq } from "drizzle-orm";
import { createErrorResponse } from "@/lib/error-handler";
import { getTenantFromRequest } from "@/lib/tenant-context";
import { getUserChurchRole } from "@/lib/tenant-db";

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

    // Get user record
    const userRecord = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: {
        id: true,
        name: true,
        email: true,
        role: true, // Global role (for super admins)
        isSuperAdmin: true,
      },
    });

    if (!userRecord) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get active church from subdomain
    const churchId = await getTenantFromRequest(request);
    
    // Get per-church role if churchId is available
    let role: string = userRecord.role; // Default to global role
    if (churchId && !userRecord.isSuperAdmin) {
      const churchRole = await getUserChurchRole(session.user.id, churchId);
      if (churchRole) {
        role = churchRole as string;
      }
    }

    return NextResponse.json({ 
      user: {
        ...userRecord,
        role, // Return per-church role
      }
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
