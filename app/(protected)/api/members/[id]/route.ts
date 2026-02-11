import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { members, household } from "@/db/schema";
import { getAuthContext, requirePermission } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeText, sanitizeEmail } from "@/lib/sanitize";
import { encrypt, decryptMember } from "@/lib/encryption";

const VALID_PARTICIPATION_STATUSES = ["active", "deceased", "homebound", "military", "inactive", "school"] as const;

function isValidParticipationStatus(status: string | null | undefined): status is typeof VALID_PARTICIPATION_STATUSES[number] {
  if (status === null || status === undefined) return false;
  const normalizedStatus = status.toLowerCase();
  return VALID_PARTICIPATION_STATUSES.some((validStatus) => validStatus === normalizedStatus);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { churchId } = await getAuthContext(request);
    const { id } = await params;

    // Get member and verify it belongs to church
    const [member] = await db
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
      .where(and(eq(members.id, id), eq(members.churchId, churchId)))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Find head of household using sequence column
    let headOfHousehold: { id: string; firstName: string; lastName: string; isCurrentMember: boolean } | null = null;

    if (member.householdId) {
      // Find member with sequence = "head_of_house" in the same household
      const [headMember] = await db
        .select({
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
        })
        .from(members)
        .where(
          and(
            eq(members.householdId, member.householdId),
            eq(members.sequence, "head_of_house"),
            eq(members.churchId, churchId)
          )
        )
        .limit(1);

      if (headMember) {
        headOfHousehold = {
          ...headMember,
          isCurrentMember: headMember.id === member.id,
        };
      }
    }

    return NextResponse.json({ 
      member: decryptMember({
        ...member,
        headOfHousehold,
      }),
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require members_edit permission
    const { churchId } = await requirePermission("members_edit", request);
    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.firstName || !body.lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 },
      );
    }

    // Check if member exists and belongs to church
    const [existingMember] = await db
      .select()
      .from(members)
      .where(and(eq(members.id, id), eq(members.churchId, churchId)))
      .limit(1);

    if (!existingMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Check email uniqueness if email1 is being changed (within same church)
    if (body.email1 && body.email1 !== existingMember.email1) {
      const emailConflict = await db
        .select()
        .from(members)
        .where(and(eq(members.email1, body.email1), eq(members.churchId, churchId)))
        .limit(1);

      if (emailConflict.length > 0) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 },
        );
      }
    }

    // Enforce household requirement - all members must belong to a household
    const newHouseholdId = body.householdId !== undefined ? body.householdId : existingMember.householdId;
    if (!newHouseholdId) {
      return NextResponse.json(
        { error: "Household is required. All members must belong to a household." },
        { status: 400 },
      );
    }

    // Validate that household exists and belongs to church if householdId is being changed
    if (body.householdId !== undefined && body.householdId !== existingMember.householdId) {
      const [targetHousehold] = await db
        .select()
        .from(household)
        .where(and(eq(household.id, body.householdId), eq(household.churchId, churchId)))
        .limit(1);

      if (!targetHousehold) {
        return NextResponse.json(
          { error: "Selected household does not exist" },
          { status: 400 },
        );
      }
    }

    // Sanitize input
    const sanitizedData = {
      firstName: sanitizeText(body.firstName),
      middleName: body.middleName !== undefined ? sanitizeText(body.middleName) : existingMember.middleName,
      lastName: sanitizeText(body.lastName),
      suffix: body.suffix !== undefined ? sanitizeText(body.suffix) : existingMember.suffix,
      preferredName: body.preferredName !== undefined ? sanitizeText(body.preferredName) : existingMember.preferredName,
      maidenName: body.maidenName !== undefined ? sanitizeText(body.maidenName) : existingMember.maidenName,
      title: body.title !== undefined ? sanitizeText(body.title) : existingMember.title,
      email1: body.email1 !== undefined ? sanitizeEmail(body.email1) : existingMember.email1,
      email2: body.email2 !== undefined ? sanitizeEmail(body.email2) : existingMember.email2,
      phoneHome: body.phoneHome !== undefined ? sanitizeText(body.phoneHome) : existingMember.phoneHome,
      phoneCell1: body.phoneCell1 !== undefined ? sanitizeText(body.phoneCell1) : existingMember.phoneCell1,
      phoneCell2: body.phoneCell2 !== undefined ? sanitizeText(body.phoneCell2) : existingMember.phoneCell2,
      membershipCode: body.membershipCode !== undefined ? sanitizeText(body.membershipCode) : existingMember.membershipCode,
    };

    // Update member
    const [updatedMember] = await db
      .update(members)
      .set({
        householdId: newHouseholdId,
        firstName: sanitizedData.firstName,
        middleName: sanitizedData.middleName,
        lastName: sanitizedData.lastName,
        suffix: sanitizedData.suffix,
        preferredName: sanitizedData.preferredName,
        maidenName: sanitizedData.maidenName,
        title: sanitizedData.title,
        sex: body.sex !== undefined ? body.sex : existingMember.sex,
        dateOfBirth:
          body.dateOfBirth !== undefined
            ? (body.dateOfBirth ? encrypt(body.dateOfBirth) : null)
            : existingMember.dateOfBirth,
        email1: sanitizedData.email1,
        email2: sanitizedData.email2,
        phoneHome: sanitizedData.phoneHome,
        phoneCell1: sanitizedData.phoneCell1,
        phoneCell2: sanitizedData.phoneCell2,
        baptismDate: body.baptismDate !== undefined ? body.baptismDate : existingMember.baptismDate,
        confirmationDate: body.confirmationDate !== undefined ? body.confirmationDate : existingMember.confirmationDate,
        receivedBy: body.receivedBy !== undefined ? body.receivedBy : existingMember.receivedBy,
        dateReceived: body.dateReceived !== undefined ? body.dateReceived : existingMember.dateReceived,
        removedBy: body.removedBy !== undefined ? body.removedBy : existingMember.removedBy,
        dateRemoved: body.dateRemoved !== undefined ? body.dateRemoved : existingMember.dateRemoved,
        deceasedDate: body.deceasedDate !== undefined ? body.deceasedDate : existingMember.deceasedDate,
        membershipCode: sanitizedData.membershipCode,
        envelopeNumber: body.envelopeNumber !== undefined ? body.envelopeNumber : existingMember.envelopeNumber,
        participation: body.participation !== undefined
          ? (isValidParticipationStatus(body.participation)
              ? body.participation.toLowerCase()
              : existingMember.participation)
          : existingMember.participation,
      })
      .where(eq(members.id, id))
      .returning();

    return NextResponse.json({ member: decryptMember(updatedMember) });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require members_edit permission
    const { churchId } = await requirePermission("members_edit", request);
    const { id } = await params;

    // Check if member exists and belongs to church
    const [existingMember] = await db
      .select()
      .from(members)
      .where(and(eq(members.id, id), eq(members.churchId, churchId)))
      .limit(1);

    if (!existingMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Delete member (cascade handled by DB)
    await db.delete(members).where(eq(members.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error);
  }
}

