"use client";

import { useEffect, useState, startTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Member Directory", href: "/membership" },
  { label: "Giving", href: "/giving" },
  { label: "Reports", href: "/reports" },
];

const publicRoutes = ["/", "/login", "/signup", "/setup"];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isPending) {
      const isPublicRoute = publicRoutes.includes(pathname);

      // If not on a public route and not authenticated, redirect to login
      if (!isPublicRoute && !session?.user) {
        router.push("/");
        return;
      }
      // If authenticated and on login/signup/setup, redirect to dashboard
      if (session?.user && (pathname === "/" || pathname === "/login" || pathname === "/signup" || pathname === "/setup")) {
        router.push("/dashboard");
        return;
      }
      
      // Defer state update to avoid cascading renders
      startTransition(() => {
        setIsChecking(false);
      });
    }
  }, [session, isPending, pathname, router]);

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
      <div className="flex h-screen max-h-screen overflow-hidden">
        <aside className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex w-64 shrink-0 flex-col max-h-screen overflow-hidden">
          <div className="border-b border-sidebar-border px-6 py-5 text-lg font-semibold shrink-0">
            Good Shepherd Admin
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3 py-4 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
            <div className="mt-auto border-t border-sidebar-border pt-4">
              <Link
                href="/manage-admin-access"
                className={`rounded-md px-4 py-2 text-sm transition-colors ${
                  pathname === "/manage-admin-access" || pathname.startsWith("/manage-admin-access/")
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                    : "font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                Manage Admin Access
              </Link>
            </div>
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto bg-background min-h-0">
          <div className="mx-auto w-full max-w-6xl px-4 py-8">{children}</div>
        </main>
      </div>
    );
  }

  // Not authenticated and not on public route - will redirect
  return null;
}

