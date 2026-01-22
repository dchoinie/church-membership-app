import { NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/auth-schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeText, sanitizeEmail } from "@/lib/sanitize";

/**
 * One-time endpoint to create the first super admin
 * DISABLED: This endpoint should only be used during initial setup.
 * After the first super admin is created, use the script instead:
 * npm run create-super-admin <email> <password> <name>
 * 
 * To re-enable this endpoint, set ENABLE_CREATE_SUPER_ADMIN=true in environment variables
 * POST /api/admin/create-super-admin
 * Body: { email, password, name }
 */
export async function POST(request: Request) {
  try {
    // SECURITY: Disable this endpoint by default after initial setup
    // Only enable via environment variable if absolutely necessary
    const isEnabled = process.env.ENABLE_CREATE_SUPER_ADMIN === "true";
    
    if (!isEnabled) {
      return NextResponse.json(
        { 
          error: "This endpoint is disabled for security reasons. Use the script instead: npm run create-super-admin" 
        },
        { status: 404 }
      );
    }

    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Check if any super admin already exists
    const existingSuperAdmin = await db.query.user.findFirst({
      where: eq(user.isSuperAdmin, true),
    });

    if (existingSuperAdmin) {
      return NextResponse.json(
        { error: "Super admin already exists. Use the script instead." },
        { status: 400 }
      );
    }

    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    // Sanitize input
    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedName = sanitizeText(name);

    // Check if user already exists
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, sanitizedEmail),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Create user via Better Auth
    const signupResponse = await auth.api.signUpEmail({
      body: {
        email: sanitizedEmail,
        password,
        name: sanitizedName,
      },
      headers: request.headers,
      asResponse: true,
    });

    if (!signupResponse.ok) {
      const errorData = await signupResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || "Failed to create user" },
        { status: signupResponse.status }
      );
    }

    const signupData = await signupResponse.json();
    const userId = signupData.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Failed to get user ID after signup" },
        { status: 500 }
      );
    }

    // Update user to be super admin
    // Note: We only set isSuperAdmin boolean, not the role enum
    // Super admins can have any church-level role (admin/viewer) but isSuperAdmin grants system-wide access
    await db
      .update(user)
      .set({
        isSuperAdmin: true,
        // Keep the default role (admin or viewer) - super admin status is separate
      })
      .where(eq(user.id, userId));

    return NextResponse.json({
      success: true,
      message: "Super admin created successfully",
      userId,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

