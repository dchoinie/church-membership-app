import { NextResponse } from "next/server";
import { eq, asc, count, and } from "drizzle-orm";

import { db } from "@/db";
import { members, household } from "@/db/schema";
import { getAuthContext, handleAuthError } from "@/lib/api-helpers";

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
    const authError = handleAuthError(error);
    if (authError.status !== 500) return authError;
    
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

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

    // Insert new member
    const [newMember] = await db
      .insert(members)
      .values({
        churchId,
        householdId: householdId,
        firstName: body.firstName,
        middleName: body.middleName || null,
        lastName: body.lastName,
        suffix: body.suffix || null,
        preferredName: body.preferredName || null,
        maidenName: body.maidenName || null,
        title: body.title || null,
        sex: (() => {
          if (!body.sex) return null;
          const sexValue = typeof body.sex === "string" ? body.sex.toLowerCase() : null;
          const validSexValues = ["male", "female", "other"];
          return sexValue && validSexValues.includes(sexValue) ? sexValue as "male" | "female" | "other" : null;
        })(),
        dateOfBirth: body.dateOfBirth || null,
        email1: body.email1 || null,
        email2: body.email2 || null,
        phoneHome: body.phoneHome || null,
        phoneCell1: body.phoneCell1 || null,
        phoneCell2: body.phoneCell2 || null,
        baptismDate: body.baptismDate || null,
        confirmationDate: body.confirmationDate || null,
        receivedBy: body.receivedBy || null,
        dateReceived: body.dateReceived || null,
        removedBy: body.removedBy || null,
        dateRemoved: body.dateRemoved || null,
        deceasedDate: body.deceasedDate || null,
        membershipCode: body.membershipCode || null,
        envelopeNumber: body.envelopeNumber !== undefined ? body.envelopeNumber : null,
        participation: isValidParticipationStatus(body.participation)
          ? body.participation.toLowerCase()
          : "active",
      })
      .returning();

    return NextResponse.json({ member: newMember }, { status: 201 });
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError.status !== 500) return authError;
    
    console.error("Error creating member:", error);
    return NextResponse.json(
      { error: "Failed to create member" },
      { status: 500 },
    );
  }
}

