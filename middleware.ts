import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { extractSubdomain, getChurchBySubdomain } from "@/lib/tenant-context";
import { isSetupComplete } from "@/lib/setup-helpers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Public routes that don't require tenant context
const PUBLIC_ROUTES = [
  "/",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api/auth",
  "/api/signup",
  "/api/invite",
  "/api/invite-signup",
  "/api/stripe/webhook",
  "/api/user", // User API routes use better-auth, not Supabase
];

// Setup route - accessible before setup is complete
const SETUP_ROUTE = "/setup";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // Extract subdomain
  const subdomain = extractSubdomain(hostname);

  // Check if this is a public route
  // On subdomain, "/" is still public (for login), but page component will redirect authenticated users
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Handle root domain - allow root path and API routes
  if (!subdomain && pathname !== "/" && !pathname.startsWith("/api/")) {
    // Redirect unknown routes on root domain to home
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }
  
  // Ensure /api/user routes are allowed through on root domain
  if (!subdomain && pathname.startsWith("/api/user")) {
    // Allow through without Supabase auth check (better-auth handles its own auth)
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  // For public routes on root domain, allow through
  if (!subdomain && isPublicRoute) {
    let supabaseResponse = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      supabaseUrl!,
      supabaseKey!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    await supabase.auth.getUser();
    return supabaseResponse;
  }

  // For subdomain routes, look up church
  if (subdomain) {
    const church = await getChurchBySubdomain(subdomain);

    if (!church && !isPublicRoute) {
      // Church not found - redirect to home with error
      const homeUrl = new URL("/", request.url);
      homeUrl.searchParams.set("error", "church_not_found");
      return NextResponse.redirect(homeUrl);
    }

    // Handle subdomain root path - redirect to /dashboard or /setup based on subscription
    // Allow "/" through if login=true query param is present (to break redirect loop for unauthenticated users)
    if (church && pathname === "/") {
      const loginParam = request.nextUrl.searchParams.get("login");
      if (loginParam !== "true") {
        // Only redirect if not coming from auth-layout redirect
        if (isSetupComplete(church)) {
          // Setup complete - redirect to dashboard
          const dashboardUrl = new URL("/dashboard", request.url);
          return NextResponse.redirect(dashboardUrl);
        } else {
          // Setup not complete - redirect to setup
          const setupUrl = new URL(SETUP_ROUTE, request.url);
          return NextResponse.redirect(setupUrl);
        }
      }
    }

    // Check setup completion for protected routes
    // Allow /setup route and public routes through without setup check
    const isSetupRoute = pathname === SETUP_ROUTE;
    const isDashboardRoute = pathname === "/dashboard";
    
    // Allow dashboard through even if setup isn't complete - it handles checkout success polling
    // This prevents redirect loops when user returns from Stripe checkout
    if (church && !isPublicRoute && !isSetupRoute && !isDashboardRoute && !pathname.startsWith("/api/")) {
      // Check if setup is complete
      if (!isSetupComplete(church)) {
        // Setup not complete - redirect to /setup
        const setupUrl = new URL(SETUP_ROUTE, request.url);
        return NextResponse.redirect(setupUrl);
      }
    }

    // If on /setup route and setup is complete, redirect to dashboard
    if (church && isSetupRoute && isSetupComplete(church)) {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }

    // Create response with tenant context
    let supabaseResponse = NextResponse.next({
      request: {
        headers: new Headers(request.headers),
      },
    });

    // Set church ID in headers for downstream use
    if (church) {
      supabaseResponse.headers.set("x-church-id", church.id);
    }

    const supabase = createServerClient(
      supabaseUrl!,
      supabaseKey!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request: {
                headers: new Headers(request.headers),
              },
            });
            if (church) {
              supabaseResponse.headers.set("x-church-id", church.id);
            }
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Refresh session if expired - required for Server Components
    await supabase.auth.getUser();

    return supabaseResponse;
  }

  // Default: continue
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

