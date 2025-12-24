import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized. You must be logged in to resend verification email." },
        { status: 401 },
      );
    }

    // Check if already verified
    if (session.user.emailVerified) {
      return NextResponse.json(
        { error: "Your email is already verified." },
        { status: 400 },
      );
    }

    // Send verification email
    try {
      await auth.api.sendVerificationEmail({
        body: { email: session.user.email },
        headers: await headers(),
      });

      return NextResponse.json({
        success: true,
        message: "Verification email sent successfully. Please check your inbox.",
      });
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again later." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error in resend verification email:", error);
    return NextResponse.json(
      { error: "An error occurred while resending verification email." },
      { status: 500 },
    );
  }
}

