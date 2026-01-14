import { NextResponse } from "next/server";
import { eq, asc, count, and } from "drizzle-orm";

import { db } from "@/db";
import { members, household } from "@/db/schema";
import { getAuthContext, requireAdmin } from "@/lib/api-helpers";
import { checkMemberLimit } from "@/lib/member-limits";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeText, sanitizeEmail } from "@/lib/sanitize";

const VALID_PARTICIPATION_STATUSES = ["active", "deceased", "homebound", "military", "inactive", "school"] as const;

function isValidParticipationStatus(status: string | null | undefined): status is typeof VALID_PARTICIPATION_STATUSES[number] {
  if (status === null || status === undefined) return false;
  const normalizedStatus = status.toLowerCase();
  return VALID_PARTICIPATION_STATUSES.some((validStatus) => validStatus === normalizedStatus);
}

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(100, pageSize)); // Max 100 per page
    const offset = (validPage - 1) * validPageSize;

    // Get total count (filtered by churchId)
    const [totalResult] = await db
      .select({ count: count() })
      .from(members)
      .where(eq(members.churchId, churchId));
    const total = totalResult.count;
    const totalPages = Math.ceil(total / validPageSize);

    // Get paginated members, sorted alphabetically by last name, then first name (filtered by churchId)
    const paginatedMembers = await db
      .select({
        id: members.id,
        householdId: members.householdId,
        firstName: members.firstName,
        middleName: members.middleName,
        lastName: members.lastName,
        suffix: members.suffix,
        preferredName: members.preferredName,
        maidenName: members.maidenName,
        title: members.title,
        sex: members.sex,
        dateOfBirth: members.dateOfBirth,
        email1: members.email1,
        email2: members.email2,
        phoneHome: members.phoneHome,
        phoneCell1: members.phoneCell1,
        phoneCell2: members.phoneCell2,
        baptismDate: members.baptismDate,
        confirmationDate: members.confirmationDate,
        receivedBy: members.receivedBy,
        dateReceived: members.dateReceived,
        removedBy: members.removedBy,
        dateRemoved: members.dateRemoved,
        deceasedDate: members.deceasedDate,
        membershipCode: members.membershipCode,
        envelopeNumber: members.envelopeNumber,
        participation: members.participation,
        createdAt: members.createdAt,
        updatedAt: members.updatedAt,
      })
      .from(members)
      .where(eq(members.churchId, churchId))
      .orderBy(asc(members.lastName), asc(members.firstName))
      .limit(validPageSize)
      .offset(offset);

    return NextResponse.json({
      members: paginatedMembers,
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

export async function POST(request: Request) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require admin role
    const { churchId } = await requireAdmin(request);

    const body = await request.json();

    // Validate required fields
    if (!body.firstName || !body.lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 },
      );
    }

    // Enforce household requirement - all members must belong to a household
    if (!body.householdId && !body.createNewHousehold) {
      return NextResponse.json(
        { error: "Household is required. Please select an existing household or create a new one." },
        { status: 400 },
      );
    }

    // Check email uniqueness if provided (within same church)
    if (body.email1) {
      const existingMember = await db
        .select()
        .from(members)
        .where(and(eq(members.email1, body.email1), eq(members.churchId, churchId)))
        .limit(1);

      if (existingMember.length > 0) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 },
        );
      }
    }

    let householdId = body.householdId || null;

    // If creating a new household, create it first
    if (body.createNewHousehold) {
      const [newHousehold] = await db
        .insert(household)
        .values({
          churchId,
          name: body.householdName || null,
          type: body.householdType || "single", // Default to "single" for new households
        })
        .returning();
      
      householdId = newHousehold.id;
    }

    // Validate that householdId exists and belongs to church if provided
    if (householdId) {
      const [existingHousehold] = await db
        .select()
        .from(household)
        .where(and(eq(household.id, householdId), eq(household.churchId, churchId)))
        .limit(1);

      if (!existingHousehold) {
        return NextResponse.json(
          { error: "Selected household does not exist" },
          { status: 400 },
        );
      }
    }

    // Check member limit before inserting
    const limitCheck = await checkMemberLimit(churchId, 1);
    if (!limitCheck.allowed) {
      const planName = limitCheck.plan === "premium" ? "Premium" : "Basic";
      const limitText = limitCheck.limit === Infinity ? "unlimited" : limitCheck.limit.toString();
      return NextResponse.json(
        {
          error: `Member limit reached. Your ${planName} plan allows up to ${limitText} members. Upgrade to Premium for unlimited members.`,
        },
        { status: 403 },
      );
    }

    // Sanitize input
    const sanitizedData = {
      firstName: sanitizeText(body.firstName),
      middleName: body.middleName ? sanitizeText(body.middleName) : undefined,
      lastName: sanitizeText(body.lastName),
      suffix: body.suffix ? sanitizeText(body.suffix) : undefined,
      preferredName: body.preferredName ? sanitizeText(body.preferredName) : undefined,
      maidenName: body.maidenName ? sanitizeText(body.maidenName) : undefined,
      title: body.title ? sanitizeText(body.title) : undefined,
      email1: body.email1 ? sanitizeEmail(body.email1) : undefined,
      email2: body.email2 ? sanitizeEmail(body.email2) : undefined,
      phoneHome: body.phoneHome ? sanitizeText(body.phoneHome) : undefined,
      phoneCell1: body.phoneCell1 ? sanitizeText(body.phoneCell1) : undefined,
      phoneCell2: body.phoneCell2 ? sanitizeText(body.phoneCell2) : undefined,
      membershipCode: body.membershipCode ? sanitizeText(body.membershipCode) : undefined,
    };

    // Insert new member
    const [newMember] = await db
      .insert(members)
      .values({
        churchId,
        householdId: householdId,
        firstName: sanitizedData.firstName,
        middleName: sanitizedData.middleName,
        lastName: sanitizedData.lastName,
        suffix: sanitizedData.suffix,
        preferredName: sanitizedData.preferredName,
        maidenName: sanitizedData.maidenName,
        title: sanitizedData.title,
        sex: (() => {
          if (!body.sex) return null;
          const sexValue = typeof body.sex === "string" ? body.sex.toLowerCase() : null;
          const validSexValues = ["male", "female", "other"];
          return sexValue && validSexValues.includes(sexValue) ? sexValue as "male" | "female" | "other" : null;
        })(),
        dateOfBirth: body.dateOfBirth || null,
        email1: sanitizedData.email1,
        email2: sanitizedData.email2,
        phoneHome: sanitizedData.phoneHome,
        phoneCell1: sanitizedData.phoneCell1,
        phoneCell2: sanitizedData.phoneCell2,
        baptismDate: body.baptismDate || null,
        confirmationDate: body.confirmationDate || null,
        receivedBy: body.receivedBy || null,
        dateReceived: body.dateReceived || null,
        removedBy: body.removedBy || null,
        dateRemoved: body.dateRemoved || null,
        deceasedDate: body.deceasedDate || null,
        membershipCode: sanitizedData.membershipCode,
        envelopeNumber: body.envelopeNumber !== undefined ? body.envelopeNumber : null,
        participation: isValidParticipationStatus(body.participation)
          ? body.participation.toLowerCase()
          : "active",
      })
      .returning();

    return NextResponse.json({ member: newMember }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}

