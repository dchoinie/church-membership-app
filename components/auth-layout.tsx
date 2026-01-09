"use client";

import { useEffect, useState, startTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Settings, Menu } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Church {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Member Directory", href: "/membership" },
  { label: "Giving", href: "/giving" },
  { label: "Attendance", href: "/attendance" },
  { label: "Analytics", href: "/analytics" },
  { label: "Reports", href: "/reports" },
  { label: "Church Settings", href: "/settings" },
];

const publicRoutes = ["/", "/login", "/forgot-password", "/reset-password", "/verify-email"];
const setupRoutes = ["/setup"];

// Sidebar content component
function SidebarContent({
  pathname,
  onNavigate,
  church,
}: {
  pathname: string;
  onNavigate: () => void;
  church: Church | null;
}) {
  const churchName = church?.name || "Simple Church Tools";
  
  return (
    <>
      <div className="border-b border-sidebar-border px-6 py-5 text-lg font-semibold shrink-0">
        {churchName}
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`rounded-md px-4 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                  : "font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <div className="mt-auto">
          <Link
            href="/manage-admin-access"
            onClick={onNavigate}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors pb-4 ${
              pathname === "/manage-admin-access" || pathname.startsWith("/manage-admin-access/")
                ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                : "font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <Settings className="size-4" />
            Manage Admin Access
          </Link>
          <div className="border-t border-sidebar-border pt-4">
            <div className="px-3">
              <UserMenu />
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const [isChecking, setIsChecking] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [church, setChurch] = useState<Church | null>(null);

  // Fetch church data for branding
  useEffect(() => {
    const fetchChurch = async () => {
      try {
        const response = await fetch("/api/church");
        if (response.ok) {
          const data = await response.json();
          setChurch(data.church);
        }
      } catch (error) {
        console.error("Error fetching church data:", error);
      }
    };

    const isPublicRoute = publicRoutes.includes(pathname);
    if (!isPublicRoute && session?.user) {
      fetchChurch();
    }
  }, [pathname, session]);

  // Early exit for public routes - don't wait for auth check
  useEffect(() => {
    const isPublicRoute = publicRoutes.includes(pathname);
    if (isPublicRoute) {
      // For public routes, render immediately without waiting for auth
      startTransition(() => {
        setIsChecking(false);
      });
      return;
    }
  }, [pathname]);

  useEffect(() => {
    // Don't redirect if session is still loading - wait for it to complete
    if (isPending) {
      return;
    }
    
    const isPublicRoute = publicRoutes.includes(pathname);
    const isSetupRoute = setupRoutes.includes(pathname);

    // If not on a public route and not authenticated, redirect to login
    // BUT: Give a small delay for session to update after sign-in
    // This prevents race condition where navigation happens before session updates
    if (!isPublicRoute && !session?.user) {
      // If we're on /setup, wait longer - might be transitioning after sign-in
      // The login dialog refreshes the session, but it takes time to propagate
      if (isSetupRoute) {
        // Use a ref to track timeout and clean it up
        const timeoutId = setTimeout(async () => {
          // Force refresh session one more time
          try {
            const refreshedSession = await authClient.getSession();
            
            if (!refreshedSession?.data?.user) {
              router.push("/");
            }
          } catch (err) {
            router.push("/");
          }
        }, 2000); // Wait 2 seconds for session to update
        
        // Return cleanup function for useEffect
        return () => {
          clearTimeout(timeoutId);
        };
      }
      
      router.push("/");
      return;
    }
    
    // If authenticated, check email verification status
    if (session?.user) {
        // If not verified and trying to access protected route (except setup), redirect to verify-email
        if (!isPublicRoute && !setupRoutes.includes(pathname) && !session.user.emailVerified) {
          router.push("/verify-email");
          return;
        }
        
        // If verified, redirect to setup page (setup page will check subscription and redirect accordingly)
        if (session.user.emailVerified) {
          // Only redirect to setup if we're on a subdomain (setup requires subdomain context)
          // If on root domain, let the login dialog handle the redirect after fetching subdomain
          const isOnSubdomain = typeof window !== "undefined" && 
            window.location.hostname.split(".").length > 2 && 
            !window.location.hostname.endsWith("localhost");
          
          // For localhost, check if it's subdomain.localhost format
          const isLocalhostSubdomain = typeof window !== "undefined" && 
            window.location.hostname.includes(".") && 
            window.location.hostname.endsWith("localhost") &&
            window.location.hostname !== "localhost";
          
          if (isOnSubdomain || isLocalhostSubdomain) {
            // If on login/home or verify-email, redirect to setup
            // But don't redirect if already on setup or dashboard
            if (pathname === "/" || pathname === "/login" || pathname === "/verify-email") {
              router.push("/setup");
              return;
            }
            // If already on /setup or /dashboard, don't redirect - let the page handle its own logic
            if (pathname === "/setup" || pathname === "/dashboard") {
              return;
            }
          }
        }
      }
    // Don't redirect authenticated users from forgot/reset password pages - they might be helping someone else
    
    // Defer state update to avoid cascading renders
    startTransition(() => {
      setIsChecking(false);
    });
  }, [session, isPending, pathname, router]);

  // Close mobile menu when route changes
  useEffect(() => {
    startTransition(() => {
      setMobileMenuOpen(false);
    });
  }, [pathname]);

  // Show loading state while checking auth
  if (isChecking || isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const isPublicRoute = publicRoutes.includes(pathname);
  const isSetupRoute = setupRoutes.includes(pathname);
  const isAuthenticated = !!session?.user;

  // Public routes (login, signup, etc.) - no sidebar
  if (isPublicRoute) {
    return <>{children}</>;
  }
  
  // Setup route - show sidebar but allow access even without active subscription
  if (isSetupRoute && isAuthenticated && session?.user?.emailVerified) {
    return (
      <div className="flex md:h-screen md:max-h-screen md:overflow-hidden flex-col md:flex-row">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-sidebar-border bg-sidebar shrink-0">
          <Link href="/dashboard" className="text-lg font-semibold text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors">
            {church?.name || "Simple Church Tools"}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="text-sidebar-foreground"
          >
            <Menu className="size-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </div>

        {/* Mobile Sidebar (Sheet) */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <div className="flex h-full flex-col">
              <SidebarContent pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} church={church} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex bg-sidebar text-sidebar-foreground border-r border-sidebar-border w-64 shrink-0 flex-col max-h-screen overflow-hidden">
          <SidebarContent pathname={pathname} onNavigate={() => {}} church={church} />
        </aside>

        {/* Main Content */}
        <main className="w-full md:flex-1 md:overflow-y-auto bg-background md:min-h-0">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:py-8">{children}</div>
        </main>
      </div>
    );
  }

  // Protected routes - show sidebar
  if (isAuthenticated) {
    return (
      <div className="flex md:h-screen md:max-h-screen md:overflow-hidden flex-col md:flex-row">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-sidebar-border bg-sidebar shrink-0">
          <Link href="/dashboard" className="text-lg font-semibold text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors">
            {church?.name || "Simple Church Tools"}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="text-sidebar-foreground"
          >
            <Menu className="size-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </div>

        {/* Mobile Sidebar (Sheet) */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <div className="flex h-full flex-col">
              <SidebarContent pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} church={church} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex bg-sidebar text-sidebar-foreground border-r border-sidebar-border w-64 shrink-0 flex-col max-h-screen overflow-hidden">
          <SidebarContent pathname={pathname} onNavigate={() => {}} church={church} />
        </aside>

        {/* Main Content */}
        <main className="w-full md:flex-1 md:overflow-y-auto bg-background md:min-h-0">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:py-8">{children}</div>
        </main>
      </div>
    );
  }

  // Not authenticated and not on public route - will redirect
  return null;
}

