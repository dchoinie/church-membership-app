import { NextResponse } from "next/server";
import { db } from "@/db";
import { churches, members, subscriptions } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { eq, count, desc, inArray, gte } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    await requireSuperAdmin(request);

    const ISSUE_STATUSES = ["past_due", "canceled", "unpaid"] as const;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Total churches
    const [churchCountResult] = await db
      .select({ count: count() })
      .from(churches);
    const totalChurches = churchCountResult.count;

    // Total members across all churches
    const [memberCountResult] = await db.select({ count: count() }).from(members);
    const totalMembers = memberCountResult.count;

    // Churches with subscription issues (past_due, canceled, unpaid)
    const [issueCountResult] = await db
      .select({ count: count() })
      .from(churches)
      .where(inArray(churches.subscriptionStatus, ["past_due", "canceled", "unpaid"]));
    const churchesWithIssues = issueCountResult.count;

    // Churches needing attention: past_due, canceled, or unpaid
    const allChurches = await db
      .select({
        id: churches.id,
        name: churches.name,
        subdomain: churches.subdomain,
        subscriptionStatus: churches.subscriptionStatus,
      })
      .from(churches)
      .orderBy(desc(churches.createdAt));

    const churchesNeedingAttention = allChurches.filter((c) =>
      ISSUE_STATUSES.includes(c.subscriptionStatus as (typeof ISSUE_STATUSES)[number])
    );

    // Canceled in last 30 days - check subscriptions table
    const canceledSubscriptions = await db
      .select({
        churchId: subscriptions.churchId,
        updatedAt: subscriptions.updatedAt,
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, "canceled"));

    const recentlyCanceledChurchIds = new Set(
      canceledSubscriptions
        .filter((s) => s.updatedAt && s.updatedAt >= thirtyDaysAgo)
        .map((s) => s.churchId)
    );

    // Recent signups (churches created in last 7 days)
    const recentChurches = await db
      .select({
        id: churches.id,
        name: churches.name,
        subdomain: churches.subdomain,
        createdAt: churches.createdAt,
      })
      .from(churches)
      .where(gte(churches.createdAt, sevenDaysAgo))
      .orderBy(desc(churches.createdAt))
      .limit(10);

    return NextResponse.json({
      stats: {
        totalChurches,
        totalMembers,
        churchesWithIssues,
      },
      churchesNeedingAttention: churchesNeedingAttention.slice(0, 10).map((c) => ({
        id: c.id,
        name: c.name,
        subdomain: c.subdomain,
        subscriptionStatus: c.subscriptionStatus,
        isRecentlyCanceled: recentlyCanceledChurchIds.has(c.id),
      })),
      recentChurches,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
