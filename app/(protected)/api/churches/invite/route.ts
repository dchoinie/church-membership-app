import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { db } from "@/db";
import { invitations } from "@/db/schema";
import { createInvite } from "@/lib/invitations";
import { sendInvitationEmail } from "@/lib/email";
import { eq, and } from "drizzle-orm";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeEmail } from "@/lib/sanitize";

export async function POST(request: Request) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require admin role
    const { churchId, user } = await requireAdmin(request);
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Sanitize email
    const sanitizedEmail = sanitizeEmail(email);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if user already exists for this church
    const { user: userSchema } = await import("@/auth-schema");
    const existingUser = await db.query.user.findFirst({
      where: and(
        eq(userSchema.email, sanitizedEmail),
        eq(userSchema.churchId, churchId)
      ),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already has access to this church" },
        { status: 400 }
      );
    }

    // Check if there's already a pending invitation for this email and church
    const existingInvitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.email, sanitizedEmail),
        eq(invitations.churchId, churchId)
      ),
    });

    if (existingInvitation && !existingInvitation.acceptedAt) {
      const isExpired =
        existingInvitation.expiresAt &&
        existingInvitation.expiresAt.getTime() < Date.now();

      if (!isExpired) {
        return NextResponse.json(
          { error: "An invitation has already been sent to this email" },
          { status: 400 }
        );
      }
    }

    // Create invitation with church ID
    const inviteCode = await createInvite(sanitizedEmail, churchId);

    // Send invitation email
    try {
      await sendInvitationEmail({
        email: sanitizedEmail,
        inviteCode,
        inviterName: user.email,
        churchId,
      });
    } catch (emailError) {
      console.error("Error sending invitation email:", emailError);
      const errorMessage =
        emailError instanceof Error ? emailError.message : "Unknown error";

      // Still return success since invitation was created
      return NextResponse.json({
        success: true,
        inviteCode,
        message: `Invitation created for ${sanitizedEmail}, but email failed to send.`,
        emailSent: false,
        warning: errorMessage.includes("Resend Test Domain Limitation")
          ? errorMessage
          : `Email could not be sent: ${errorMessage}. Please share the invitation code manually: ${inviteCode}`,
        inviteCodeDisplay: inviteCode,
      });
    }

    return NextResponse.json({
      success: true,
      inviteCode,
      message: `Invitation email sent to ${sanitizedEmail}`,
      emailSent: true,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

