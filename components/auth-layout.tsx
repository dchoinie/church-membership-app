"use client";

import { useEffect, useState, startTransition } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Settings, Menu, HelpCircle, Loader2, Users } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { UserMenu } from "@/components/user-menu";
import { ChurchSwitcher } from "@/components/church-switcher";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/lib/hooks/use-permissions";
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
];

const publicRoutes = ["/", "/login", "/forgot-password", "/reset-password", "/verify-email", "/privacy", "/terms", "/about"];
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
  const { canManageUsers, isLoading: permissionsLoading } = usePermissions();
  const churchName = church?.name || "Simple Church Tools";
  
  return (
    <>
      <div className="border-b border-sidebar-border px-3 py-4 shrink-0 space-y-3">
        <ChurchSwitcher />
        <div className="px-3 text-lg font-semibold">
          {churchName}
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4 overflow-y-auto">
        {permissionsLoading ? (
          // Show loading state - don't show any nav items until permissions are loaded
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          // Show all nav items once permissions are loaded
          <>
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
              {canManageUsers && (
                <Link
                  href="/settings"
                  onClick={onNavigate}
                  className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors ${
                    pathname === "/settings" || pathname.startsWith("/settings/")
                      ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                      : "font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Settings className="size-4" />
                  Church Settings
                </Link>
              )}
              {canManageUsers && (
                <Link
                  href="/manage-admin-access"
                  onClick={onNavigate}
                  className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors ${
                    pathname === "/manage-admin-access" || pathname.startsWith("/manage-admin-access/")
                      ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                      : "font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Users className="size-4" />
                  Manage Admin Access
                </Link>
              )}
              <Link
                href="/support"
                onClick={onNavigate}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors ${
                  pathname === "/support" || pathname.startsWith("/support/")
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                    : "font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <HelpCircle className="size-4" />
                Support
              </Link>
              <hr className="border-sidebar-border my-4" />
              <div className="px-3">
                <UserMenu />
              </div>
            </div>
          </>
        )}
      </nav>
    </>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [church, setChurch] = useState<Church | null>(null);

  // Fetch church data for branding (only for authenticated, non-public routes)
  // Only fetch once when needed - prevents refetching on every route change
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
    // Only fetch if authenticated, not on public route, and church data not already loaded
    // The !church check prevents unnecessary refetches when navigating between protected routes
    if (!isPublicRoute && session?.user && !church) {
      fetchChurch();
    }
  }, [pathname, session, church]); // Include church to satisfy exhaustive-deps, but !church guard prevents refetch loops

  // Close mobile menu when route changes
  useEffect(() => {
    startTransition(() => {
      setMobileMenuOpen(false);
    });
  }, [pathname]);

  const isPublicRoute = publicRoutes.includes(pathname);
  const isSetupRoute = setupRoutes.includes(pathname);
  const isAuthenticated = !!session?.user;

  // Add/remove class on body for protected routes to control overflow
  useEffect(() => {
    if (!isPublicRoute && isAuthenticated) {
      document.body.classList.add('protected-route');
    } else {
      document.body.classList.remove('protected-route');
    }
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('protected-route');
    };
  }, [isPublicRoute, isAuthenticated]);

  // Redirect to login if not authenticated and not on public route
  // Only redirect after session has finished loading (isPending === false)
  // This prevents redirect loops when session cookie is still propagating after login
  // Always redirect to root domain for login (consistent with design goal - all logins happen on root domain)
  useEffect(() => {
    if (isPending || isAuthenticated || isPublicRoute) return;

    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const isLocalhost = currentOrigin.includes("localhost") || currentOrigin.includes("127.0.0.1");

    const redirectToLogin = () => {
      let rootDomain: string;
      if (isLocalhost) {
        const port = typeof window !== "undefined" && window.location.port ? `:${window.location.port}` : ":3000";
        rootDomain = `http://localhost${port}`;
      } else {
        const url = new URL(currentOrigin);
        const hostname = url.hostname;
        const parts = hostname.split(".");
        const rootHostname = parts.slice(-2).join(".");
        rootDomain = `${url.protocol}//${rootHostname}${url.port ? `:${url.port}` : ""}`;
      }
      window.location.href = `${rootDomain}/?login=true`;
    };

    // In development, cookie may be set on *.localhost but useSession hasn't refetched yet after redirect.
    // Give one refetch a moment to complete before redirecting.
    if (isLocalhost && typeof window !== "undefined") {
      const t = setTimeout(() => {
        authClient.getSession().then(({ data }) => {
          if (data?.user) return; // Session found, don't redirect
          redirectToLogin();
        });
      }, 400);
      return () => clearTimeout(t);
    }

    redirectToLogin();
  }, [isPending, isAuthenticated, isPublicRoute, pathname]);

  // Show loading state only while session is being fetched
  // Middleware handles all redirects, so we just wait for session to load
  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

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

  // Not authenticated and not on public route - show loading while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-muted-foreground">Redirecting to login...</div>
    </div>
  );
}

