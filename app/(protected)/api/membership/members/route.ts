import { NextResponse } from "next/server";
import { eq, asc, count, and, or, ilike, inArray } from "drizzle-orm";

import { db } from "@/db";
import { members, household } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { decryptMember } from "@/lib/encryption";

const VALID_PARTICIPATION = ["active", "deceased", "homebound", "military", "inactive", "school"] as const;
const VALID_SEX = ["male", "female", "other"] as const;
const VALID_SEQUENCE = ["head_of_house", "spouse", "child"] as const;

/** Escape % and _ for safe use in ilike patterns */
function escapeIlikePattern(s: string): string {
  return s.replace(/[%_\\]/g, (m) => `\\${m}`);
}

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
    const q = searchParams.get("q")?.trim().slice(0, 200) || "";
    const participationParam = searchParams.get("participation");
    const sexParam = searchParams.get("sex");
    const sequenceParam = searchParams.get("sequence");
    const householdId = searchParams.get("householdId")?.trim() || "";
    const householdName = searchParams.get("householdName")?.trim().slice(0, 200) || "";

    const participationArr = participationParam
      ? participationParam.split(",").map((s) => s.trim().toLowerCase()).filter((s) => VALID_PARTICIPATION.includes(s as (typeof VALID_PARTICIPATION)[number]))
      : [];
    const sexArr = sexParam
      ? sexParam.split(",").map((s) => s.trim().toLowerCase()).filter((s) => VALID_SEX.includes(s as (typeof VALID_SEX)[number]))
      : [];
    const sequenceArr = sequenceParam
      ? sequenceParam.split(",").map((s) => s.trim().toLowerCase()).filter((s) => VALID_SEQUENCE.includes(s as (typeof VALID_SEQUENCE)[number]))
      : [];

    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(100, pageSize)); // Max 100 per page
    const offset = (validPage - 1) * validPageSize;

    // Build where conditions
    const conditions: ReturnType<typeof eq>[] = [eq(members.churchId, churchId)];

    if (q) {
      const pattern = `%${escapeIlikePattern(q)}%`;
      conditions.push(
        or(
          ilike(members.firstName, pattern),
          ilike(members.lastName, pattern),
          ilike(members.middleName, pattern),
          ilike(members.preferredName, pattern),
          ilike(members.email1, pattern),
          ilike(members.phoneHome, pattern),
          ilike(members.phoneCell1, pattern),
          ilike(members.phoneCell2, pattern)
        )!
      );
    }
    if (participationArr.length > 0) {
      conditions.push(inArray(members.participation, participationArr as (typeof VALID_PARTICIPATION)[number][]));
    }
    if (sexArr.length > 0) {
      conditions.push(inArray(members.sex, sexArr as (typeof VALID_SEX)[number][]));
    }
    if (sequenceArr.length > 0) {
      conditions.push(inArray(members.sequence, sequenceArr as (typeof VALID_SEQUENCE)[number][]));
    }
    if (householdId) {
      conditions.push(eq(members.householdId, householdId));
    }
    if (householdName) {
      conditions.push(ilike(household.name, `%${escapeIlikePattern(householdName)}%`));
    }

    const whereClause = and(...conditions);

    // Get total count (filtered)
    const countQuery = db
      .select({ count: count() })
      .from(members)
      .leftJoin(household, eq(members.householdId, household.id))
      .where(whereClause);
    const [totalResult] = await countQuery;
    const total = totalResult.count;
    const totalPages = Math.ceil(total / validPageSize);

    // Get paginated members with household join, sorted alphabetically
    const paginatedRows = await db
      .select({
        id: members.id,
        householdId: members.householdId,
        firstName: members.firstName,
        middleName: members.middleName,
        lastName: members.lastName,
        suffix: members.suffix,
        dateOfBirth: members.dateOfBirth,
        email1: members.email1,
        phoneHome: members.phoneHome,
        phoneCell1: members.phoneCell1,
        participation: members.participation,
        householdName: household.name,
      })
      .from(members)
      .leftJoin(household, eq(members.householdId, household.id))
      .where(whereClause)
      .orderBy(asc(members.lastName), asc(members.firstName))
      .limit(validPageSize)
      .offset(offset);

    const membersWithHousehold = paginatedRows.map((row) => {
      const decrypted = decryptMember({
        id: row.id,
        householdId: row.householdId,
        firstName: row.firstName,
        middleName: row.middleName,
        lastName: row.lastName,
        suffix: row.suffix,
        dateOfBirth: row.dateOfBirth,
        email1: row.email1,
        phoneHome: row.phoneHome,
        phoneCell1: row.phoneCell1,
        participation: row.participation,
      });
      return {
        ...decrypted,
        household:
          row.householdId != null
            ? { id: row.householdId, name: row.householdName }
            : null,
      };
    });

    return NextResponse.json({
      members: membersWithHousehold,
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
