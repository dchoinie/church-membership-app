import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant-context";
import { db } from "@/db";
import { givingStatements, household } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { canManageGivingStatements } from "@/lib/permissions-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/giving-statements
 * Lists all giving statements for the church
 * 
 * Query params:
 * - year: number (optional - filter by year)
 * - householdId: string (optional - filter by household)
 */
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.user.id;
    const churchId = await getTenantFromRequest(request);

    if (!churchId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await canManageGivingStatements(userId, churchId);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "You do not have permission to view giving statements" },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const householdId = searchParams.get("householdId");

    // Build query conditions
    const conditions = [eq(givingStatements.churchId, churchId)];

    if (year) {
      conditions.push(eq(givingStatements.year, parseInt(year)));
    }

    if (householdId) {
      conditions.push(eq(givingStatements.householdId, householdId));
    }

    // Get statements
    const statements = await db
      .select({
        id: givingStatements.id,
        householdId: givingStatements.householdId,
        householdName: household.name,
        year: givingStatements.year,
        startDate: givingStatements.startDate,
        endDate: givingStatements.endDate,
        totalAmount: givingStatements.totalAmount,
        statementNumber: givingStatements.statementNumber,
        generatedAt: givingStatements.generatedAt,
        generatedBy: givingStatements.generatedBy,
        sentAt: givingStatements.sentAt,
        sentBy: givingStatements.sentBy,
        emailStatus: givingStatements.emailStatus,
        previewOnly: givingStatements.previewOnly,
        createdAt: givingStatements.createdAt,
      })
      .from(givingStatements)
      .innerJoin(household, eq(givingStatements.householdId, household.id))
      .where(and(...conditions))
      .orderBy(desc(givingStatements.generatedAt));

    return NextResponse.json({
      statements: statements.map((s) => ({
        ...s,
        totalAmount: parseFloat(s.totalAmount || "0"),
      })),
    });
  } catch (error) {
    console.error("Error fetching giving statements:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch giving statements",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
