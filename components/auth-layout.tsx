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
];

const publicRoutes = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];

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
  const churchName = church?.name || "Church Admin";
  
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

  useEffect(() => {
    if (!isPending) {
      const isPublicRoute = publicRoutes.includes(pathname);

      // If not on a public route and not authenticated, redirect to login
      if (!isPublicRoute && !session?.user) {
        router.push("/");
        return;
      }
      
      // If authenticated, check email verification status
      if (session?.user) {
        // If on login/signup/setup, redirect to dashboard (if verified) or verify-email (if not verified)
        if (pathname === "/" || pathname === "/login" || pathname === "/signup" || pathname === "/setup") {
          if (session.user.emailVerified) {
            router.push("/dashboard");
          } else {
            router.push("/verify-email");
          }
          return;
        }
        
        // If not verified and trying to access protected route, redirect to verify-email
        if (!isPublicRoute && !session.user.emailVerified) {
          router.push("/verify-email");
          return;
        }
        
        // If verified and on verify-email page, redirect to dashboard
        if (pathname === "/verify-email" && session.user.emailVerified) {
          router.push("/dashboard");
          return;
        }
      }
      // Don't redirect authenticated users from forgot/reset password pages - they might be helping someone else
      
      // Defer state update to avoid cascading renders
      startTransition(() => {
        setIsChecking(false);
      });
    }
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
  const isAuthenticated = !!session?.user;

  // Public routes (login, signup, setup) - no sidebar
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Protected routes - show sidebar
  if (isAuthenticated) {
    return (
      <div className="flex md:h-screen md:max-h-screen md:overflow-hidden flex-col md:flex-row">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-sidebar-border bg-sidebar shrink-0">
          <Link href="/dashboard" className="text-lg font-semibold text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors">
            {church?.name || "Church Admin"}
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

