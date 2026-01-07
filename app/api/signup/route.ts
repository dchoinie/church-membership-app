import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { serviceDb } from "@/db/service-db";
import { churches } from "@/db/schema";
import { user } from "@/auth-schema";
import { auth } from "@/lib/auth";
import { createStripeCustomer, SUBSCRIPTION_PLANS } from "@/lib/stripe";
import { isSubdomainAvailable } from "@/lib/tenant-context";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { churchName, subdomain, adminName, adminEmail, adminPassword, plan } =
      await request.json();

    // Validate required fields
    if (!churchName || !subdomain || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate subdomain format
    const normalizedSubdomain = subdomain.toLowerCase().trim();
    if (!/^[a-z0-9-]{3,30}$/.test(normalizedSubdomain)) {
      return NextResponse.json(
        { error: "Subdomain must be 3-30 characters and contain only letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    // Check subdomain availability
    const available = await isSubdomainAvailable(normalizedSubdomain);
    if (!available) {
      return NextResponse.json(
        { error: "Subdomain is not available" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password
    if (adminPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if email is already in use - use service DB to bypass RLS
    const existingUser = await serviceDb.query.user.findFirst({
      where: eq(user.email, adminEmail),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email is already in use" },
        { status: 400 }
      );
    }

    // Get selected plan (default to basic)
    const selectedPlan = plan || "basic";
    const planConfig = SUBSCRIPTION_PLANS[selectedPlan as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.basic;

    // Create Stripe customer
    let stripeCustomerId: string;
    try {
      const customer = await createStripeCustomer(adminEmail, adminName, {
        churchName,
        subdomain: normalizedSubdomain,
      });
      stripeCustomerId = customer.id;
    } catch (error) {
      console.error("Error creating Stripe customer:", error);
      return NextResponse.json(
        { error: "Failed to create billing account" },
        { status: 500 }
      );
    }

    // Create church record - use service DB to bypass RLS
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial

    const [church] = await serviceDb
      .insert(churches)
      .values({
        name: churchName,
        subdomain: normalizedSubdomain,
        email: adminEmail,
        subscriptionStatus: "trialing",
        subscriptionPlan: selectedPlan as "free" | "basic" | "premium",
        trialEndsAt,
        stripeCustomerId,
      })
      .returning();

    // Create admin user
    const signupResponse = await auth.api.signUpEmail({
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      },
      headers: request.headers,
      asResponse: true,
    });

    if (!signupResponse.ok) {
      // Rollback: delete church if user creation fails - use service DB to bypass RLS
      await serviceDb.delete(churches).where(eq(churches.id, church.id));
      const errorData = await signupResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || "Failed to create admin user" },
        { status: signupResponse.status }
      );
    }

    const signupData = await signupResponse.json();
    const userId = signupData.user?.id;

    if (!userId) {
      // Rollback: delete church if user ID not found - use service DB to bypass RLS
      await serviceDb.delete(churches).where(eq(churches.id, church.id));
      return NextResponse.json(
        { error: "Failed to get user ID after signup" },
        { status: 500 }
      );
    }

    // Update user with churchId and admin role - use service DB to bypass RLS
    await serviceDb
      .update(user)
      .set({
        churchId: church.id,
        role: "admin",
      })
      .where(eq(user.id, userId));

    // If plan is not free, create checkout session
    let checkoutUrl: string | null = null;
    if (selectedPlan !== "free" && planConfig.priceId) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const successUrl = `${baseUrl}/${normalizedSubdomain}/dashboard?checkout=success`;
      const cancelUrl = `${baseUrl}/signup?canceled=true`;

      try {
        const checkoutResponse = await fetch(`${baseUrl}/api/stripe/create-checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: stripeCustomerId,
            priceId: planConfig.priceId,
            churchId: church.id,
            successUrl,
            cancelUrl,
          }),
        });

        if (checkoutResponse.ok) {
          const checkoutData = await checkoutResponse.json();
          checkoutUrl = checkoutData.url;
        }
      } catch (error) {
        console.error("Error creating checkout session:", error);
        // Don't fail signup if checkout creation fails - user can set up billing later
      }
    }

    return NextResponse.json({
      success: true,
      churchId: church.id,
      subdomain: normalizedSubdomain,
      checkoutUrl,
      message: selectedPlan === "free" 
        ? "Church created successfully. You can now sign in."
        : "Church created successfully. Please complete your subscription setup.",
    });
  } catch (error) {
    console.error("Error during signup:", error);
    return NextResponse.json(
      { error: "Failed to complete signup" },
      { status: 500 }
    );
  }
}

