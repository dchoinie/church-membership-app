import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/auth-schema";
import { invitations } from "@/db/schema";

export async function DELETE(request: Request) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    // Prevent deleting yourself
    if (session.user.email === email) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 },
      );
    }

    // Find the user by email
    const userToDelete = await db.query.user.findFirst({
      where: eq(user.email, email),
    });

    // Check if this is the last admin user
    const allUsers = await db.query.user.findMany();
    if (allUsers.length === 1 && userToDelete) {
      return NextResponse.json(
        { error: "Cannot delete the last admin user" },
        { status: 400 },
      );
    }

    // Delete invitations associated with this email
    await db.delete(invitations).where(eq(invitations.email, email));

    // If user exists, delete them (this will cascade delete sessions and accounts)
    if (userToDelete) {
      await db.delete(user).where(eq(user.email, email));
    }

    return NextResponse.json({
      success: true,
      message: `Admin access removed for ${email}`,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 },
    );
  }
}

