"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import {
  canEditMembers,
  canEditGiving,
  canEditAttendance,
  canViewReports,
  canViewAnalytics,
  canManageUsers,
  type SubscriptionPlan,
} from "@/lib/permissions";

interface Permissions {
  canEditMembers: boolean;
  canEditGiving: boolean;
  canEditAttendance: boolean;
  canViewReports: boolean;
  canViewAnalytics: boolean;
  canManageUsers: boolean;
  role: string | null;
  subscriptionPlan: SubscriptionPlan | null;
  isLoading: boolean;
}

export function usePermissions(): Permissions {
  const { data: session } = authClient.useSession();
  const [role, setRole] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch user role and church subscription plan
        const [userResponse, churchResponse] = await Promise.all([
          fetch("/api/user"),
          fetch("/api/church"),
        ]);

        if (userResponse.ok) {
          const userData = await userResponse.json();
          setRole(userData.user?.role || null);
        }

        if (churchResponse.ok) {
          const churchData = await churchResponse.json();
          setSubscriptionPlan((churchData.church?.subscriptionPlan || "basic") as SubscriptionPlan);
        }
      } catch (error) {
        console.error("Error fetching permissions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, [session]);

  const plan = subscriptionPlan || "basic";
  const userRole = role || "viewer";

  return {
    canEditMembers: canEditMembers(userRole, plan),
    canEditGiving: canEditGiving(userRole, plan),
    canEditAttendance: canEditAttendance(userRole, plan),
    canViewReports: canViewReports(userRole, plan),
    canViewAnalytics: canViewAnalytics(userRole, plan),
    canManageUsers: canManageUsers(userRole),
    role: userRole,
    subscriptionPlan: plan,
    isLoading,
  };
}
