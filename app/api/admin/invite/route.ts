import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { createInvite } from "@/lib/invitations";
import { sendInvitationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    // Check if any users exist
    const existingUsers = await db.query.user.findMany();
    const hasUsers = existingUsers.length > 0;

    let session = null;

    // If users exist, require authentication
    if (hasUsers) {
      session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
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

    // Create invitation
    const inviteCode = await createInvite(email);

    // Send invitation email
    try {
      await sendInvitationEmail({
        email,
        inviteCode,
        inviterName: hasUsers && session?.user?.name ? session.user.name : undefined,
      });
    } catch (emailError) {
      console.error("Error sending invitation email:", emailError);
      // Still return success since invitation was created
      // But include a warning about email failure
      return NextResponse.json({
        success: true,
        inviteCode,
        message: `Invitation created for ${email}, but email failed to send. Share this code manually: ${inviteCode}`,
        emailSent: false,
        warning: "Email could not be sent. Please share the invitation code manually.",
      });
    }

    return NextResponse.json({
      success: true,
      inviteCode,
      message: `Invitation email sent to ${email}`,
      emailSent: true,
    });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 },
    );
  }
}

