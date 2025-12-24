import { NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/auth-schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

/**
 * One-time endpoint to create the first super admin
 * Should be disabled/removed after first super admin is created
 * POST /api/admin/create-super-admin
 * Body: { email, password, name }
 */
export async function POST(request: Request) {
  try {
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

    // Check if user already exists
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, email),
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
        email,
        password,
        name,
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
    await db
      .update(user)
      .set({
        isSuperAdmin: true,
        role: "super_admin",
      })
      .where(eq(user.id, userId));

    return NextResponse.json({
      success: true,
      message: "Super admin created successfully",
      userId,
    });
  } catch (error) {
    console.error("Error creating super admin:", error);
    return NextResponse.json(
      { error: "Failed to create super admin" },
      { status: 500 }
    );
  }
}

