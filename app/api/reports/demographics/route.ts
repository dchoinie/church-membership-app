import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { members, household } from "@/db/schema";

export async function GET() {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all members with their household and demographic info
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
      .leftJoin(household, eq(members.householdId, household.id));

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    // Calculate demographics
    const genderBreakdown = {
      male: 0,
      female: 0,
      other: 0,
      unknown: 0,
    };

    const ageGroups = {
      "under 15": 0,
      "15-18": 0,
      "19-34": 0,
      "35-49": 0,
      "50-64": 0,
      "65+": 0,
      unknown: 0,
    };

    const householdTypeBreakdown: Record<string, number> = {
      family: 0,
      single: 0,
      couple: 0,
      other: 0,
      unknown: 0,
    };

    const memberStatusBreakdown: Record<string, number> = {
      active: 0,
      visitor: 0,
      inactive: 0,
      transferred: 0,
      deceased: 0,
    };

    allMembers.forEach((member) => {
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

        if (actualAge < 15) {
          ageGroups["under 15"]++;
        } else if (actualAge >= 15 && actualAge <= 18) {
          ageGroups["15-18"]++;
        } else if (actualAge >= 19 && actualAge <= 34) {
          ageGroups["19-34"]++;
        } else if (actualAge >= 35 && actualAge <= 49) {
          ageGroups["35-49"]++;
        } else if (actualAge >= 50 && actualAge <= 64) {
          ageGroups["50-64"]++;
        } else {
          ageGroups["65+"]++;
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

    const ageData = Object.entries(ageGroups)
      .filter(([, count]) => count > 0)
      .map(([ageGroup, count]) => ({
        name: ageGroup === "unknown" ? "Unknown" : ageGroup,
        value: count,
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
      totalMembers: allMembers.length,
    });
  } catch (error) {
    console.error("Error generating demographics:", error);
    return NextResponse.json(
      { error: "Failed to generate demographics" },
      { status: 500 },
    );
  }
}
