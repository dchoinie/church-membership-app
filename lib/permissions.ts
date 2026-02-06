/**
 * Permission helper functions for role-based access control
 * Roles vary by subscription plan:
 * - Basic plan: admin, viewer
 * - Premium plan: admin, viewer, members_editor, giving_editor, attendance_editor, reports_viewer, analytics_viewer
 */

export type UserRole =
  | "admin"
  | "viewer"
  | "members_editor"
  | "giving_editor"
  | "attendance_editor"
  | "reports_viewer"
  | "analytics_viewer";

export type SubscriptionPlan = "basic" | "premium";

/**
 * Check if user can edit members (create, update, delete members and households)
 */
export function canEditMembers(
  role: string,
  subscriptionPlan: SubscriptionPlan,
): boolean {
  // Admin always has access
  if (role === "admin") return true;

  // Premium plan allows members_editor role
  if (subscriptionPlan === "premium" && role === "members_editor") {
    return true;
  }

  return false;
}

/**
 * Check if user can edit giving records (create, update, delete)
 */
export function canEditGiving(
  role: string,
  subscriptionPlan: SubscriptionPlan,
): boolean {
  // Admin always has access
  if (role === "admin") return true;

  // Premium plan allows giving_editor role
  if (subscriptionPlan === "premium" && role === "giving_editor") {
    return true;
  }

  return false;
}

/**
 * Check if user can edit attendance records (create, update, delete)
 */
export function canEditAttendance(
  role: string,
  subscriptionPlan: SubscriptionPlan,
): boolean {
  // Admin always has access
  if (role === "admin") return true;

  // Premium plan allows attendance_editor role
  if (subscriptionPlan === "premium" && role === "attendance_editor") {
    return true;
  }

  return false;
}

/**
 * Check if user can view and generate reports
 */
export function canViewReports(
  role: string,
  subscriptionPlan: SubscriptionPlan,
): boolean {
  // Admin always has access
  if (role === "admin") return true;

  // Premium plan allows reports_viewer role
  if (subscriptionPlan === "premium" && role === "reports_viewer") {
    return true;
  }

  return false;
}

/**
 * Check if user can view analytics
 */
export function canViewAnalytics(
  role: string,
  subscriptionPlan: SubscriptionPlan,
): boolean {
  // Admin always has access
  if (role === "admin") return true;

  // Premium plan allows analytics_viewer role
  if (subscriptionPlan === "premium" && role === "analytics_viewer") {
    return true;
  }

  return false;
}

/**
 * Check if user can manage other users (admin only)
 */
export function canManageUsers(role: string): boolean {
  return role === "admin";
}

/**
 * Get available roles for a subscription plan
 */
export function getAvailableRoles(
  subscriptionPlan: SubscriptionPlan,
): UserRole[] {
  const basicRoles: UserRole[] = ["admin", "viewer"];
  const premiumRoles: UserRole[] = [
    "admin",
    "viewer",
    "members_editor",
    "giving_editor",
    "attendance_editor",
    "reports_viewer",
    "analytics_viewer",
  ];

  return subscriptionPlan === "premium" ? premiumRoles : basicRoles;
}

/**
 * Check if a role is available for a subscription plan
 */
export function isRoleAvailableForPlan(
  role: string,
  subscriptionPlan: SubscriptionPlan,
): boolean {
  const availableRoles = getAvailableRoles(subscriptionPlan);
  return availableRoles.includes(role as UserRole);
}

/**
 * Check if user can manage giving statements (generate, send)
 * This is a sensitive operation that should be restricted to admins and giving_editor roles
 */
export function canManageGivingStatementsRole(
  role: string,
  subscriptionPlan: SubscriptionPlan,
): boolean {
  // Admin always has access
  if (role === "admin") return true;

  // Premium plan allows giving_editor role
  if (subscriptionPlan === "premium" && role === "giving_editor") {
    return true;
  }

  return false;
}

/**
 * Get human-readable role name
 */
export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    admin: "Admin",
    viewer: "Viewer",
    members_editor: "Members Editor",
    giving_editor: "Giving Editor",
    attendance_editor: "Attendance Editor",
    reports_viewer: "Reports Viewer",
    analytics_viewer: "Analytics Viewer",
  };

  return roleNames[role] || role;
}

