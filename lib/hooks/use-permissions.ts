"use client";

import { useState, useEffect, useRef } from "react";
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
  isSuperAdmin: boolean;
  role: string | null;
  subscriptionPlan: SubscriptionPlan | null;
  isLoading: boolean;
}

// Cache permissions per user session (until user ID changes)
const permissionsCache = new Map<string, {
  role: string | null;
  subscriptionPlan: SubscriptionPlan | null;
  isSuperAdmin: boolean;
}>();

export function usePermissions(): Permissions {
  const { data: session } = authClient.useSession();
  const [role, setRole] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fetchPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!session?.user) {
        setRole(null);
        setSubscriptionPlan(null);
        setIsSuperAdmin(false);
        setIsLoading(false);
        return;
      }

      const userId = session.user.id;
      const cacheKey = userId;
      const cached = permissionsCache.get(cacheKey);

      // Use cached data if available (cache persists until user ID changes)
      if (cached) {
        setRole(cached.role);
        setSubscriptionPlan(cached.subscriptionPlan);
        setIsSuperAdmin(cached.isSuperAdmin);
        setIsLoading(false);
        return;
      }

      // If a fetch is already in progress, wait for it
      if (fetchPromiseRef.current) {
        await fetchPromiseRef.current;
        const updatedCache = permissionsCache.get(cacheKey);
        if (updatedCache) {
          setRole(updatedCache.role);
          setSubscriptionPlan(updatedCache.subscriptionPlan);
          setIsSuperAdmin(updatedCache.isSuperAdmin);
          setIsLoading(false);
        }
        return;
      }

      // Start new fetch
      fetchPromiseRef.current = (async () => {
        try {
          // Fetch user role and church subscription plan
          const [userResponse, churchResponse] = await Promise.all([
            fetch("/api/user"),
            fetch("/api/church"),
          ]);

          let fetchedRole: string | null = null;
          let fetchedPlan: SubscriptionPlan | null = null;
          let fetchedIsSuperAdmin = false;

          if (userResponse.ok) {
            const userData = await userResponse.json();
            fetchedRole = userData.user?.role || null;
            fetchedIsSuperAdmin = userData.user?.isSuperAdmin || false;
          }

          if (churchResponse.ok) {
            const churchData = await churchResponse.json();
            fetchedPlan = (churchData.church?.subscriptionPlan || "basic") as SubscriptionPlan;
          }

          // Update cache
          permissionsCache.set(cacheKey, {
            role: fetchedRole,
            subscriptionPlan: fetchedPlan,
            isSuperAdmin: fetchedIsSuperAdmin,
          });

          setRole(fetchedRole);
          setSubscriptionPlan(fetchedPlan);
          setIsSuperAdmin(fetchedIsSuperAdmin);
        } catch (error) {
          console.error("Error fetching permissions:", error);
        } finally {
          setIsLoading(false);
          fetchPromiseRef.current = null;
        }
      })();

      await fetchPromiseRef.current;
    };

    fetchPermissions();
  }, [session?.user?.id]); // Only depend on user ID, not entire session object

  const plan = subscriptionPlan || "basic";
  const userRole = role || "viewer";

  return {
    canEditMembers: canEditMembers(userRole, plan),
    canEditGiving: canEditGiving(userRole, plan),
    canEditAttendance: canEditAttendance(userRole, plan),
    canViewReports: canViewReports(userRole, plan),
    canViewAnalytics: canViewAnalytics(userRole, plan),
    canManageUsers: canManageUsers(userRole),
    isSuperAdmin,
    role: userRole,
    subscriptionPlan: plan,
    isLoading,
  };
}
