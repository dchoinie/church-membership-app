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
    
    // Default to "admin" for super admins (they bypass all permission checks
    // on the backend) and to the global role otherwise.
    let role: string = userRecord.isSuperAdmin ? "admin" : userRecord.role;

    // Prefer the user's actual per-church role when a membership row exists,
    // even for super admins, so the UI reflects their real church role.
    if (churchId) {
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
