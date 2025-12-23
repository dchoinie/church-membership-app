import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/db";

export async function GET() {
  try {
    // Check if any users exist
    const userCount = await db.query.user.findMany();
    const hasUsers = userCount.length > 0;

    return NextResponse.json({
      setupRequired: !hasUsers,
      userCount: userCount.length,
    });
  } catch (error) {
    console.error("Error checking setup status:", error);
    return NextResponse.json(
      { error: "Failed to check setup status" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check if any users exist
    const existingUsers = await db.query.user.findMany();

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: "Setup already completed. Users already exist." },
        { status: 400 },
      );
    }

    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    // Create the first admin user using Better Auth
    const response = await auth.api.signUpEmail({
      body: { email, password, name },
      headers: request.headers,
      asResponse: true,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || "Failed to create admin user" },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: "First admin user created successfully",
    });
  } catch (error) {
    console.error("Error during setup:", error);
    return NextResponse.json(
      { error: "Failed to complete setup" },
      { status: 500 },
    );
  }
}

