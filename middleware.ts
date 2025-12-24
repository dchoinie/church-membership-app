import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { extractSubdomain, getChurchBySubdomain } from "@/lib/tenant-context";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Public routes that don't require tenant context
const PUBLIC_ROUTES = ["/signup", "/api/signup", "/api/signup/check-subdomain"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // Check if this is a public route
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Extract subdomain
  const subdomain = extractSubdomain(hostname);

  // Handle root domain - redirect to signup
  if (!subdomain && pathname !== "/signup" && !pathname.startsWith("/api/signup")) {
    const signupUrl = new URL("/signup", request.url);
    return NextResponse.redirect(signupUrl);
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
      // Church not found - redirect to signup with error or show 404
      const signupUrl = new URL("/signup", request.url);
      signupUrl.searchParams.set("error", "church_not_found");
      return NextResponse.redirect(signupUrl);
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

