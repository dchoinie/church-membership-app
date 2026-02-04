import { NextResponse } from "next/server";

import { db } from "@/db";
import { createInvite } from "@/lib/invitations";
import { sendInvitationEmail } from "@/lib/email";
import { requireAdmin } from "@/lib/api-helpers";
import { user } from "@/auth-schema";
import { invitations, churches } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeEmail } from "@/lib/sanitize";
import { checkAdminLimit } from "@/lib/admin-limits";
import { isRoleAvailableForPlan, getAvailableRoles } from "@/lib/permissions";

export async function POST(request: Request) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require admin role
    const { churchId, user: currentUser } = await requireAdmin(request);
    const { email, role = "viewer" } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    // Get church subscription plan
    const church = await db.query.churches.findFirst({
      where: eq(churches.id, churchId),
      columns: {
        subscriptionPlan: true,
      },
    });

    const subscriptionPlan = (church?.subscriptionPlan || "basic") as "basic" | "premium";

    // Validate role is available for the subscription plan
    if (role && !isRoleAvailableForPlan(role, subscriptionPlan)) {
      const availableRoles = getAvailableRoles(subscriptionPlan);
      return NextResponse.json(
        { 
          error: `Role '${role}' is not available for ${subscriptionPlan} plan. Available roles: ${availableRoles.join(", ")}` 
        },
        { status: 400 },
      );
    }

    // Check admin limit if inviting with admin role
    if (role === "admin") {
      const adminLimitCheck = await checkAdminLimit(churchId, 1);
      if (!adminLimitCheck.allowed) {
        const upgradeMessage = adminLimitCheck.plan === "basic"
          ? "Upgrade to Premium plan for up to 10 admin users."
          : "Admin user limit reached for your plan.";
        return NextResponse.json(
          { 
            error: `Admin user limit reached (${adminLimitCheck.currentCount}/${adminLimitCheck.limit}). ${upgradeMessage}` 
          },
          { status: 403 },
        );
      }
    }

    // Sanitize email
    const sanitizedEmail = sanitizeEmail(email);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, sanitizedEmail),
    });

    if (existingUser) {
      // Check if user already belongs to this church via junction table
      const { userChurches } = await import("@/db/schema");
      const existingMembership = await db.query.userChurches.findFirst({
        where: and(
          eq(userChurches.userId, existingUser.id),
          eq(userChurches.churchId, churchId)
        ),
      });

      if (existingMembership) {
        return NextResponse.json(
          { error: "User already has access to this church" },
          { status: 400 },
        );
      }
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
          { status: 400 },
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
        inviterName: currentUser.email,
        churchId,
      });
    } catch (emailError) {
      console.error("Error sending invitation email:", emailError);
      const errorMessage = emailError instanceof Error ? emailError.message : "Unknown error";
      
      // Still return success since invitation was created
      // But include a warning about email failure with helpful details
      return NextResponse.json({
        success: true,
        inviteCode,
        message: `Invitation created for ${sanitizedEmail}, but email failed to send.`,
        emailSent: false,
        warning: errorMessage.includes("Resend Test Domain Limitation") 
          ? errorMessage 
          : `Email could not be sent: ${errorMessage}. Please share the invitation code manually: ${inviteCode}`,
        inviteCodeDisplay: inviteCode, // Make it easy to find
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

