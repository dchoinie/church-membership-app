import { NextResponse } from "next/server";
import { db } from "@/db";
import { churches, members } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { eq, count, desc } from "drizzle-orm";

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

    // Get paginated churches with member counts
    const churchesList = await db
      .select({
        id: churches.id,
        name: churches.name,
        subdomain: churches.subdomain,
        email: churches.email,
        subscriptionStatus: churches.subscriptionStatus,
        subscriptionPlan: churches.subscriptionPlan,
        trialEndsAt: churches.trialEndsAt,
        createdAt: churches.createdAt,
      })
      .from(churches)
      .orderBy(desc(churches.createdAt))
      .limit(validPageSize)
      .offset(offset);

    // Get member counts for each church
    const churchesWithStats = await Promise.all(
      churchesList.map(async (church) => {
        const [memberCountResult] = await db
          .select({ count: count() })
          .from(members)
          .where(eq(members.churchId, church.id));

        return {
          ...church,
          memberCount: memberCountResult.count,
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

