"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Loader2, ChevronDown } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface Church {
  id: string;
  name: string;
  subdomain: string;
  role: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
}

export function ChurchSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const [churches, setChurches] = useState<Church[]>([]);
  const [currentChurch, setCurrentChurch] = useState<Church | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    if (!session?.user) {
      setIsLoading(false);
      return;
    }

    const fetchChurches = async () => {
      try {
        const response = await fetch("/api/user/churches", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setChurches(data.churches || []);

          // Get current church from subdomain
          const hostname = window.location.hostname;
          const subdomain = hostname.split(".")[0];
          const current = data.churches?.find(
            (c: Church) => c.subdomain === subdomain
          );
          setCurrentChurch(current || data.churches?.[0] || null);
        }
      } catch (error) {
        console.error("Error fetching churches:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChurches();
  }, [session]);

  const handleSwitchChurch = async (church: Church) => {
    if (isSwitching || church.id === currentChurch?.id) return;

    setIsSwitching(true);
    try {
      // Build subdomain URL
      const baseUrl = window.location.origin;
      const isLocalhost = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

      let subdomainUrl: string;
      if (isLocalhost) {
        const port = window.location.port ? `:${window.location.port}` : "";
        subdomainUrl = `http://${church.subdomain}.localhost${port}${pathname}`;
      } else {
        const url = new URL(baseUrl);
        const hostname = url.hostname;
        const parts = hostname.split(".");
        const rootHostname = parts.slice(-2).join(".");
        subdomainUrl = `https://${church.subdomain}.${rootHostname}${url.port ? `:${url.port}` : ""}${pathname}`;
      }

      window.location.href = subdomainUrl;
    } catch (error) {
      console.error("Error switching church:", error);
      setIsSwitching(false);
    }
  };

  const handleAddChurch = () => {
    router.push("/add-church");
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "viewer":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "viewer":
        return "Viewer";
      case "members_editor":
        return "Members Editor";
      case "giving_editor":
        return "Giving Editor";
      case "attendance_editor":
        return "Attendance Editor";
      case "reports_viewer":
        return "Reports Viewer";
      case "analytics_viewer":
        return "Analytics Viewer";
      default:
        return role;
    }
  };

  if (isLoading || !session?.user) {
    return null;
  }

  if (churches.length === 0) {
    return null;
  }

  // Only show switcher if user has 2+ churches
  if (churches.length === 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-3 py-2 h-auto font-normal"
          disabled={isSwitching}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {currentChurch?.logoUrl ? (
              <img
                src={currentChurch.logoUrl}
                alt={currentChurch.name}
                className="w-5 h-5 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: currentChurch?.primaryColor || "#667eea",
                }}
              >
                <Building2 className="h-3 w-3 text-white" />
              </div>
            )}
            <span className="truncate text-sm">
              {currentChurch?.name || "Select Church"}
            </span>
          </div>
          {isSwitching ? (
            <Loader2 className="h-4 w-4 animate-spin ml-2 flex-shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Switch Church</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {churches.map((church) => (
          <DropdownMenuItem
            key={church.id}
            onClick={() => handleSwitchChurch(church)}
            disabled={isSwitching || church.id === currentChurch?.id}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {church.logoUrl ? (
                  <img
                    src={church.logoUrl}
                    alt={church.name}
                    className="w-5 h-5 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: church.primaryColor || "#667eea",
                    }}
                  >
                    <Building2 className="h-3 w-3 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{church.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {church.subdomain}
                  </div>
                </div>
              </div>
              <Badge variant={getRoleBadgeVariant(church.role)} className="flex-shrink-0">
                {getRoleLabel(church.role)}
              </Badge>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleAddChurch} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          <span>Add Church</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
