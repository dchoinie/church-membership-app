"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Building2, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getRootDomain(): string {
  if (typeof window === "undefined") return "";
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  if (parts.length === 2 && parts[1] === "localhost") return "localhost";
  if (parts.length >= 3) return parts.slice(-2).join(".");
  return hostname;
}

function AdminUserMenu() {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  if (!user) return null;

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      const rootDomain = getRootDomain();
      const protocol = window.location.protocol;
      const port = window.location.port ? `:${window.location.port}` : "";
      window.location.href = `${protocol}//${rootDomain}${port}/`;
    } catch (error) {
      console.error("Failed to sign out:", error);
      window.location.href = "/";
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full">
          <Avatar className="size-8">
            {user.image && (
              <AvatarImage src={user.image} alt={user.name || "User"} />
            )}
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 text-left truncate">
            {user.name || user.email}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.name || "User"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={handleSignOut}
          className="cursor-pointer"
        >
          <LogOut className="size-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      <div className="border-b border-sidebar-border px-3 py-4 shrink-0">
        <div className="px-3 text-lg font-semibold">Super Admin</div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4 overflow-y-auto">
        <Link
          href="/admin"
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors ${
            pathname === "/admin"
              ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
              : "font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          }`}
        >
          <LayoutDashboard className="size-4" />
          Dashboard
        </Link>
        <Link
          href="/admin/churches"
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors ${
            pathname === "/admin/churches" || pathname.startsWith("/admin/churches/")
              ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
              : "font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          }`}
        >
          <Building2 className="size-4" />
          Churches
        </Link>
        <div className="mt-auto pt-4 border-t border-sidebar-border px-3">
          <AdminUserMenu />
        </div>
      </nav>
    </>
  );
}
