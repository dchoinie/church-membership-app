"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Church {
  id: string;
  name: string;
  subdomain: string;
  role: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
}

interface ChurchSelectorProps {
  churches: Church[];
  onSelect: (church: Church) => void;
  isLoading?: boolean;
}

export function ChurchSelector({ churches, onSelect, isLoading = false }: ChurchSelectorProps) {
  const router = useRouter();
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);

  const handleSelect = (church: Church) => {
    setSelectedChurchId(church.id);
    onSelect(church);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground text-center">
        You have access to multiple churches. Please select which church you want to sign in to:
      </p>
      <div className="space-y-2">
        {churches.map((church) => (
          <button
            key={church.id}
            onClick={() => handleSelect(church)}
            disabled={isLoading || selectedChurchId === church.id}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              selectedChurchId === church.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-accent"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {church.logoUrl ? (
                  <img
                    src={church.logoUrl}
                    alt={church.name}
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: church.primaryColor || "#667eea",
                    }}
                  >
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{church.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {church.subdomain}.simplechurchtools.com
                  </div>
                </div>
              </div>
              <Badge variant={getRoleBadgeVariant(church.role)} className="ml-2 flex-shrink-0">
                {getRoleLabel(church.role)}
              </Badge>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
