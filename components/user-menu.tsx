"use client";

import { LogOut, CheckCircle2, XCircle, Building2, Plus, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { apiFetch } from "@/lib/api-client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePermissions } from "@/lib/hooks/use-permissions";

/**
 * Get root domain from current origin
 * e.g., "church1.simplechurchtools.com" -> "simplechurchtools.com"
 * e.g., "church1.localhost:3000" -> "localhost:3000"
 */
function getRootDomain(): string {
  if (typeof window === "undefined") {
    return "";
  }
  
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  
  // Handle localhost subdomains
  if (parts.length === 2 && parts[1] === "localhost") {
    return "localhost";
  }
  
  // For production subdomains, extract root domain (last 2 parts)
  if (parts.length > 2) {
    return parts.slice(-2).join(".");
  }
  
  // Already root domain
  return hostname;
}

export function UserMenu() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const { canManageUsers } = usePermissions();

  if (!user) {
    return null;
  }

  const handleAddChurch = () => {
    router.push("/add-church");
  };

  const handleManageSubscription = async () => {
    try {
      // Get current page URL for return URL
      const returnUrl = window.location.href;

      // Call the Stripe portal API endpoint
      const response = await apiFetch("/api/stripe/portal", {
        method: "POST",
        body: JSON.stringify({ returnUrl }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create portal session");
      }

      const data = await response.json();
      
      if (!data.url) {
        throw new Error("No portal URL returned");
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (error) {
      console.error("Failed to open subscription portal:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to open subscription portal. Please try again later."
      );
    }
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      
      // Get root domain and redirect there
      const rootDomain = getRootDomain();
      const protocol = window.location.protocol;
      const port = window.location.port ? `:${window.location.port}` : "";
      
      // Build root domain URL
      const rootUrl = `${protocol}//${rootDomain}${port}/`;
      
      // Use window.location.href for full page reload to ensure session is cleared
      // This matches the pattern used in login-dialog.tsx
      window.location.href = rootUrl;
    } catch (error) {
      console.error("Failed to sign out:", error);
      // Even if signOut fails, try to redirect to root domain
      const rootDomain = getRootDomain();
      const protocol = window.location.protocol;
      const port = window.location.port ? `:${window.location.port}` : "";
      window.location.href = `${protocol}//${rootDomain}${port}/`;
    }
  };

  // Get user initials for avatar fallback
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
          <span className="flex-1 text-left truncate">{user.name || user.email}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            <div className="pt-1">
              {user.emailVerified ? (
                <Badge variant="outline" className="border-green-500 text-green-700 text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="border-gray-400 text-gray-600 text-xs">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Verified
                </Badge>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleAddChurch}
          className="cursor-pointer"
        >
          <Plus className="size-4" />
          <span>Add Church</span>
        </DropdownMenuItem>
        {canManageUsers && (
          <DropdownMenuItem
            onClick={handleManageSubscription}
            className="cursor-pointer"
          >
            <CreditCard className="size-4" />
            <span>Manage My Subscription</span>
          </DropdownMenuItem>
        )}
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

