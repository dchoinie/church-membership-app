import { NextResponse } from "next/server";
import { db } from "@/db";
import { churches, members, subscriptions, userChurches } from "@/db/schema";
import { user } from "@/auth-schema";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { eq, count, desc, inArray } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    await requireSuperAdmin(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(100, pageSize));
    const offset = (validPage - 1) * validPageSize;

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(churches);
    const total = totalResult.count;
    const totalPages = Math.ceil(total / validPageSize);

    // Get paginated churches
    const churchesList = await db
      .select({
        id: churches.id,
        name: churches.name,
        subdomain: churches.subdomain,
        email: churches.email,
        stripeSubscriptionId: churches.stripeSubscriptionId,
        subscriptionStatus: churches.subscriptionStatus,
        subscriptionPlan: churches.subscriptionPlan,
        trialEndsAt: churches.trialEndsAt,
        createdAt: churches.createdAt,
      })
      .from(churches)
      .orderBy(desc(churches.createdAt))
      .limit(validPageSize)
      .offset(offset);

    const churchIds = churchesList.map((c) => c.id);

    // Batch get subscriptions by churchId (subscriptions link via churchId)
    const subscriptionsList =
      churchIds.length > 0
        ? await db
            .select({
              churchId: subscriptions.churchId,
              createdAt: subscriptions.createdAt,
              updatedAt: subscriptions.updatedAt,
              status: subscriptions.status,
            })
            .from(subscriptions)
            .where(inArray(subscriptions.churchId, churchIds))
        : [];

    // Build map: churchId -> subscription (most recent by updatedAt per church)
    const subscriptionByChurch = new Map<
      string,
      { subscribedAt: Date; canceledAt: Date | null }
    >();
    const subWithUpdatedAt = subscriptionsList.map((s) => ({
      ...s,
      updatedAtVal: s.updatedAt?.getTime() ?? 0,
    }));
    subWithUpdatedAt.sort((a, b) => b.updatedAtVal - a.updatedAtVal);
    for (const sub of subWithUpdatedAt) {
      if (!subscriptionByChurch.has(sub.churchId)) {
        subscriptionByChurch.set(sub.churchId, {
          subscribedAt: sub.createdAt,
          canceledAt:
            sub.status === "canceled" && sub.updatedAt ? sub.updatedAt : null,
        });
      }
    }

    // Batch get admin users per church
    const adminMembershipsWithRole =
      churchIds.length > 0
        ? await db
            .select({
              churchId: userChurches.churchId,
              userId: userChurches.userId,
              role: userChurches.role,
            })
            .from(userChurches)
            .where(inArray(userChurches.churchId, churchIds))
        : [];

    const adminUserIds = adminMembershipsWithRole
      .filter((m) => m.role === "admin")
      .map((m) => m.userId);

    const adminUsers =
      adminUserIds.length > 0
        ? await db
            .select({
              id: user.id,
              name: user.name,
              email: user.email,
            })
            .from(user)
            .where(inArray(user.id, adminUserIds))
        : [];

    const adminUsersById = new Map(
      adminUsers.map((u) => [u.id, { name: u.name, email: u.email }])
    );
    const adminsByChurch = new Map<string, string[]>();
    for (const m of adminMembershipsWithRole) {
      if (m.role === "admin") {
        const admin = adminUsersById.get(m.userId);
        if (admin) {
          const displayName = admin.name?.trim() || admin.email;
          const existing = adminsByChurch.get(m.churchId) ?? [];
          if (!existing.includes(displayName)) {
            adminsByChurch.set(m.churchId, [...existing, displayName]);
          }
        }
      }
    }

    // Get member counts for each church
    const churchesWithStats = await Promise.all(
      churchesList.map(async (church) => {
        const [memberCountResult] = await db
          .select({ count: count() })
          .from(members)
          .where(eq(members.churchId, church.id));

        const sub = subscriptionByChurch.get(church.id);
        const subscribedAt = sub?.subscribedAt ?? church.createdAt;
        const canceledAt = sub?.canceledAt ?? null;
        const admins = adminsByChurch.get(church.id) ?? [];

        return {
          id: church.id,
          name: church.name,
          subdomain: church.subdomain,
          email: church.email,
          subscriptionStatus: church.subscriptionStatus,
          subscriptionPlan: church.subscriptionPlan,
          trialEndsAt: church.trialEndsAt,
          createdAt: church.createdAt,
          memberCount: memberCountResult.count,
          subscribedAt,
          canceledAt,
          admins,
        };
      })
    );

    return NextResponse.json({
      churches: churchesWithStats,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

