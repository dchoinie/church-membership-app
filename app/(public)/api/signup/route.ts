import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createStripeCustomer } from "@/lib/stripe";
import { SUBSCRIPTION_PLANS } from "@/lib/pricing";
import { isSubdomainAvailable } from "@/lib/tenant-context";
import { createServiceClient } from "@/utils/supabase/service";
import { addUserToChurch } from "@/lib/tenant-db";
import { db } from "@/db";
import { givingCategories } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const { churchName, subdomain, adminName, adminEmail, adminPassword, plan } =
      await request.json();

    // Check if user is authenticated (has a session) - needed for validation (password optional when authenticated)
    let authenticatedUserId: string | null = null;
    try {
      const requestHeaders = new Headers();
      request.headers.forEach((value, key) => {
        requestHeaders.set(key, value);
      });
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        requestHeaders.set("cookie", cookieHeader);
      }

      const session = await auth.api.getSession({
        headers: requestHeaders,
      });

      if (session?.user) {
        authenticatedUserId = session.user.id;
      }
    } catch (error) {
      // Session check failed, user is not authenticated
      console.log("Session check failed (user not authenticated):", error);
    }

    // Validate required fields - password only required for unauthenticated new user signups
    const passwordRequired = !authenticatedUserId;
    if (!churchName || !subdomain || !adminName || !adminEmail) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }
    if (passwordRequired && !adminPassword) {
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

    // Check if email is already in use - use Supabase service role client to bypass RLS
    const supabase = createServiceClient();
    const { data: existingUser } = await supabase
      .from("user")
      .select("id")
      .eq("email", adminEmail)
      .limit(1)
      .maybeSingle();

    if (existingUser) {
      // If user is authenticated and it's their own email, link church to their account
      if (authenticatedUserId && authenticatedUserId === existingUser.id) {
        // User is authenticated and trying to add a church to their existing account
        // Continue with church creation, then link it to their account
        // Password validation not needed for authenticated users
      } else {
        // User exists but is not authenticated (or different user)
        return NextResponse.json(
          { 
            error: "EMAIL_EXISTS_NOT_AUTHENTICATED",
            message: "An account with this email already exists. Please sign in to add this church to your account."
          },
          { status: 400 }
        );
      }
    } else {
      // New user - validate password
      if (!adminPassword || adminPassword.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }
    }

    // Get selected plan (default to basic)
    const selectedPlan = plan || "basic";

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

    // Create church record - use Supabase service role client to bypass RLS
    const { data: church, error: churchError } = await supabase
      .from("churches")
      .insert({
        name: churchName,
        subdomain: normalizedSubdomain,
        email: adminEmail,
        subscription_status: "unpaid",
        subscription_plan: selectedPlan,
        stripe_customer_id: stripeCustomerId,
      })
      .select()
      .single();

    if (churchError || !church) {
      console.error("Error creating church:", churchError);
      return NextResponse.json(
        { error: "Failed to create church" },
        { status: 500 }
      );
    }

    // Create default giving categories for the new church
    try {
      const defaultCategories = [
        { name: "Current", displayOrder: 1 },
        { name: "Mission", displayOrder: 2 },
        { name: "Memorials", displayOrder: 3 },
        { name: "Debt", displayOrder: 4 },
        { name: "School", displayOrder: 5 },
        { name: "Miscellaneous", displayOrder: 6 },
      ];

      await db.insert(givingCategories).values(
        defaultCategories.map((cat) => ({
          churchId: church.id,
          name: cat.name,
          displayOrder: cat.displayOrder,
          isActive: true,
        }))
      );
    } catch (categoryError) {
      // Log error but don't fail signup - categories can be added manually
      console.error("Error creating default categories:", categoryError);
    }

    let userId: string;

    if (existingUser && authenticatedUserId && authenticatedUserId === existingUser.id) {
      // User already exists and is authenticated - link church to existing account
      userId = existingUser.id;
      
      // Add church to user's account via junction table
      try {
        await addUserToChurch(userId, church.id, "admin");
      } catch (error) {
        // Rollback: delete church if linking fails
        await supabase.from("churches").delete().eq("id", church.id);
        console.error("Error linking church to user:", error);
        return NextResponse.json(
          { error: "Failed to link church to your account" },
          { status: 500 }
        );
      }
    } else {
      // Validate password for new user signup
      if (!adminPassword || adminPassword.length < 8) {
        // Rollback: delete church if validation fails
        await supabase.from("churches").delete().eq("id", church.id);
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }

      // Create new user
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
        // Rollback: delete church if user creation fails - use Supabase service role client to bypass RLS
        await supabase.from("churches").delete().eq("id", church.id);
        const errorData = await signupResponse.json().catch(() => ({}));
        return NextResponse.json(
          { error: errorData.error || "Failed to create admin user" },
          { status: signupResponse.status }
        );
      }

      // Clone the response to read the body without consuming it
      const clonedResponse = signupResponse.clone();
      const signupData = await clonedResponse.json();
      userId = signupData.user?.id;

      if (!userId) {
        // Rollback: delete church if user ID not found - use Supabase service role client to bypass RLS
        await supabase.from("churches").delete().eq("id", church.id);
        return NextResponse.json(
          { error: "Failed to get user ID after signup" },
          { status: 500 }
        );
      }

      // Add church to user's account via junction table
      try {
        await addUserToChurch(userId, church.id, "admin");
      } catch (error) {
        // Rollback: delete church and user if linking fails
        await supabase.from("churches").delete().eq("id", church.id);
        // Note: User was created by better-auth, we can't easily delete it here
        console.error("Error linking church to user:", error);
        return NextResponse.json(
          { error: "Failed to link church to user account" },
          { status: 500 }
        );
      }
    }

    // Send verification email
    try {
      await auth.api.sendVerificationEmail({
        body: { email: adminEmail },
        headers: request.headers,
      });
      console.log("Verification email sent successfully to:", adminEmail);
    } catch (emailError) {
      // Log detailed error information for debugging
      console.error("Error sending verification email:", emailError);
      if (emailError instanceof Error) {
        console.error("Email error details:", {
          message: emailError.message,
          stack: emailError.stack,
          email: adminEmail,
          churchId: church.id,
          userId: userId,
        });
      }
      // Don't fail the signup if email fails - user can resend from verify-email page
      // But log it prominently so we can investigate
      console.error("WARNING: Signup succeeded but verification email failed. User can resend from verify-email page.");
    }

    // Return response WITHOUT session cookies - user must verify email first
    const response = NextResponse.json({
      success: true,
      churchId: church.id,
      subdomain: normalizedSubdomain,
      message: "Church created successfully! Please check your email to verify your account. After verification, you can sign in to complete your setup.",
    });
    
    // Do NOT copy session cookies - user must verify email before signing in
    return response;

  } catch (error) {
    console.error("Error during signup:", error);
    return NextResponse.json(
      { error: "Failed to complete signup" },
      { status: 500 }
    );
  }
}

