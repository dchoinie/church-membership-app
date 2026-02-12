import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { members, household } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { decryptMember } from "@/lib/encryption";

export async function GET(request: Request) {
  try {
    // Allow all authenticated users to view analytics
    const { churchId } = await getAuthContext(request);

    // Get all members with their household and demographic info (filtered by churchId)
    const allMembers = await db
      .select({
        id: members.id,
        sex: members.sex,
        dateOfBirth: members.dateOfBirth,
        householdId: members.householdId,
        householdType: household.type,
        participation: members.participation,
      })
      .from(members)
      .leftJoin(household, eq(members.householdId, household.id))
      .where(eq(members.churchId, churchId));

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    // Decrypt dateOfBirth for age calculations
    const allMembersDecrypted = allMembers.map(decryptMember);

    // Calculate demographics
    const genderBreakdown = {
      male: 0,
      female: 0,
      other: 0,
      unknown: 0,
    };

    const ageGroups: Record<string, number> = {
      "0-9": 0,
      "10-19": 0,
      "20-29": 0,
      "30-39": 0,
      "40-49": 0,
      "50-59": 0,
      "60-69": 0,
      "70-79": 0,
      "80+": 0,
      unknown: 0,
    };

    const householdTypeBreakdown: Record<string, number> = {
      family: 0,
      single: 0,
      other: 0,
      unknown: 0,
    };

    const memberStatusBreakdown: Record<string, number> = {
      active: 0,
      inactive: 0,
      deceased: 0,
      homebound: 0,
      military: 0,
      school: 0,
    };

    allMembersDecrypted.forEach((member) => {
      // Gender breakdown
      if (member.sex === "male") {
        genderBreakdown.male++;
      } else if (member.sex === "female") {
        genderBreakdown.female++;
      } else if (member.sex === "other") {
        genderBreakdown.other++;
      } else {
        genderBreakdown.unknown++;
      }

      // Age breakdown
      if (member.dateOfBirth) {
        const birthDate = new Date(member.dateOfBirth);
        const age = currentYear - birthDate.getFullYear();
        const monthDiff = currentDate.getMonth() - birthDate.getMonth();
        const dayDiff = currentDate.getDate() - birthDate.getDate();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

        if (actualAge <= 9) {
          ageGroups["0-9"]++;
        } else if (actualAge <= 19) {
          ageGroups["10-19"]++;
        } else if (actualAge <= 29) {
          ageGroups["20-29"]++;
        } else if (actualAge <= 39) {
          ageGroups["30-39"]++;
        } else if (actualAge <= 49) {
          ageGroups["40-49"]++;
        } else if (actualAge <= 59) {
          ageGroups["50-59"]++;
        } else if (actualAge <= 69) {
          ageGroups["60-69"]++;
        } else if (actualAge <= 79) {
          ageGroups["70-79"]++;
        } else {
          ageGroups["80+"]++;
        }
      } else {
        ageGroups.unknown++;
      }

      // Household type breakdown
      if (member.householdType) {
        const type = member.householdType.toLowerCase();
        if (type in householdTypeBreakdown) {
          householdTypeBreakdown[type]++;
        } else {
          householdTypeBreakdown.other++;
        }
      } else {
        householdTypeBreakdown.unknown++;
      }

      // Member status breakdown
      if (member.participation) {
        const status = member.participation.toLowerCase();
        if (status in memberStatusBreakdown) {
          memberStatusBreakdown[status]++;
        }
      }
    });

    // Format data for charts
    const genderData = [
      { name: "Male", value: genderBreakdown.male },
      { name: "Female", value: genderBreakdown.female },
      { name: "Other", value: genderBreakdown.other },
    ].filter((item) => item.value > 0);

    const ageGroupOrder = ["0-9", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70-79", "80+", "unknown"];
    const ageData = ageGroupOrder
      .filter((ageGroup) => (ageGroups[ageGroup] ?? 0) > 0)
      .map((ageGroup) => ({
        name: ageGroup === "unknown" ? "Unknown" : ageGroup,
        value: ageGroups[ageGroup] ?? 0,
      }));

    const householdTypeData = Object.entries(householdTypeBreakdown)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({
        name: type === "unknown" ? "Unknown" : type.charAt(0).toUpperCase() + type.slice(1),
        value: count,
      }));

    const memberStatusData = Object.entries(memberStatusBreakdown)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
      }));

    return NextResponse.json({
      gender: genderData,
      ageGroups: ageData,
      householdTypes: householdTypeData,
      memberStatus: memberStatusData,
      totalMembers: allMembersDecrypted.length,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
