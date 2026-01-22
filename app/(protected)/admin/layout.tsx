import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/auth-schema";
import { eq } from "drizzle-orm";

/**
 * Server-side layout protection for admin routes
 * Only super admins can access /admin/* routes
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/");
  }

  // Check if user is super admin
  const userRecord = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  if (!userRecord || !userRecord.isSuperAdmin) {
    // Not a super admin - redirect to dashboard
    redirect("/dashboard");
  }

  // Super admin - allow access
  return <>{children}</>;
}
