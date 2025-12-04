import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and, gte, lte } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { giving, members, services } from "@/db/schema";

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Default to current year if no dates provided
    const currentYear = new Date().getFullYear();
    const yearStart = startDateParam || `${currentYear}-01-01`;
    const yearEnd = endDateParam || `${currentYear}-12-31`;

    // Get all giving records for the current year with member info
    const allGiving = await db
      .select({
        id: giving.id,
        memberId: giving.memberId,
        currentAmount: giving.currentAmount,
        missionAmount: giving.missionAmount,
        memorialsAmount: giving.memorialsAmount,
        debtAmount: giving.debtAmount,
        schoolAmount: giving.schoolAmount,
        miscellaneousAmount: giving.miscellaneousAmount,
        dateGiven: giving.dateGiven,
        memberDateOfBirth: members.dateOfBirth,
        memberSex: members.sex,
      })
      .from(giving)
      .innerJoin(members, eq(giving.memberId, members.id))
      .where(
        and(
          gte(giving.dateGiven, yearStart),
          lte(giving.dateGiven, yearEnd),
        ),
      );

    // Get all services for matching dates
    const allServices = await db
      .select()
      .from(services)
      .where(
        and(
          gte(services.serviceDate, yearStart),
          lte(services.serviceDate, yearEnd),
        ),
      )
      .orderBy(services.serviceDate);

    // Helper function to calculate total amount from a giving record
    const getTotalAmount = (record: typeof allGiving[0]): number => {
      const current = parseFloat(record.currentAmount || "0");
      const mission = parseFloat(record.missionAmount || "0");
      const memorials = parseFloat(record.memorialsAmount || "0");
      const debt = parseFloat(record.debtAmount || "0");
      const school = parseFloat(record.schoolAmount || "0");
      const miscellaneous = parseFloat(record.miscellaneousAmount || "0");
      return current + mission + memorials + debt + school + miscellaneous;
    };

    // Helper function to calculate age from date of birth
    const calculateAge = (dateOfBirth: string | null, referenceDate: Date): number | null => {
      if (!dateOfBirth) return null;
      const birthDate = new Date(dateOfBirth);
      const age = referenceDate.getFullYear() - birthDate.getFullYear();
      const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
      const dayDiff = referenceDate.getDate() - birthDate.getDate();
      return monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
    };

    // Monthly giving trends
    const monthlyTrend: Array<{
      month: string;
      totalAmount: number;
      recordCount: number;
      currentAmount: number;
      missionAmount: number;
      memorialsAmount: number;
      debtAmount: number;
      schoolAmount: number;
      miscellaneousAmount: number;
    }> = [];

    // Get date range
    const startDate = new Date(yearStart);
    const endDate = new Date(yearEnd);
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const startMonth = startDate.getMonth();
    const endMonth = endDate.getMonth();

    // Generate months in the range
    for (let year = startYear; year <= endYear; year++) {
      const monthStart = year === startYear ? startMonth : 0;
      const monthEnd = year === endYear ? endMonth : 11;
      
      for (let month = monthStart; month <= monthEnd; month++) {
        const monthStartDate = new Date(year, month, 1);
        const monthEndDate = new Date(year, month + 1, 0);
        const monthStartStr = monthStartDate.toISOString().split("T")[0];
        const monthEndStr = monthEndDate.toISOString().split("T")[0];

        // Clamp to actual date range
        const actualStart = monthStartStr < yearStart ? yearStart : monthStartStr;
        const actualEnd = monthEndStr > yearEnd ? yearEnd : monthEndStr;

        const monthGiving = allGiving.filter(
          (g) => g.dateGiven >= actualStart && g.dateGiven <= actualEnd,
        );

        let totalAmount = 0;
        let currentAmount = 0;
        let missionAmount = 0;
        let memorialsAmount = 0;
        let debtAmount = 0;
        let schoolAmount = 0;
        let miscellaneousAmount = 0;

        monthGiving.forEach((g) => {
          const total = getTotalAmount(g);
          totalAmount += total;
          currentAmount += parseFloat(g.currentAmount || "0");
          missionAmount += parseFloat(g.missionAmount || "0");
          memorialsAmount += parseFloat(g.memorialsAmount || "0");
          debtAmount += parseFloat(g.debtAmount || "0");
          schoolAmount += parseFloat(g.schoolAmount || "0");
          miscellaneousAmount += parseFloat(g.miscellaneousAmount || "0");
        });

        monthlyTrend.push({
          month: monthStartDate.toLocaleString("default", { month: "long", year: "numeric" }),
          totalAmount: Math.round(totalAmount * 100) / 100,
          recordCount: monthGiving.length,
          currentAmount: Math.round(currentAmount * 100) / 100,
          missionAmount: Math.round(missionAmount * 100) / 100,
          memorialsAmount: Math.round(memorialsAmount * 100) / 100,
          debtAmount: Math.round(debtAmount * 100) / 100,
          schoolAmount: Math.round(schoolAmount * 100) / 100,
          miscellaneousAmount: Math.round(miscellaneousAmount * 100) / 100,
        });
      }
    }

    // Giving by service type (match giving dates to service dates)
    const givingByServiceType: Record<string, {
      serviceType: string;
      totalAmount: number;
      recordCount: number;
      averageAmount: number;
    }> = {};

    allGiving.forEach((g) => {
      // Find services on the same date
      const matchingServices = allServices.filter((s) => s.serviceDate === g.dateGiven);
      
      if (matchingServices.length > 0) {
        matchingServices.forEach((service) => {
          const type = service.serviceType;
          if (!givingByServiceType[type]) {
            givingByServiceType[type] = {
              serviceType: type,
              totalAmount: 0,
              recordCount: 0,
              averageAmount: 0,
            };
          }
          const total = getTotalAmount(g);
          givingByServiceType[type].totalAmount += total;
          givingByServiceType[type].recordCount += 1;
        });
      } else {
        // If no matching service, categorize as "other" or "general"
        const type = "other";
        if (!givingByServiceType[type]) {
          givingByServiceType[type] = {
            serviceType: type,
            totalAmount: 0,
            recordCount: 0,
            averageAmount: 0,
          };
        }
        const total = getTotalAmount(g);
        givingByServiceType[type].totalAmount += total;
        givingByServiceType[type].recordCount += 1;
      }
    });

    // Calculate averages
    Object.values(givingByServiceType).forEach((item) => {
      item.averageAmount = item.recordCount > 0
        ? Math.round((item.totalAmount / item.recordCount) * 100) / 100
        : 0;
    });

    // Monthly giving per service type
    const monthlyGivingByService: Array<{
      month: string;
      divineService: number;
      midweekLent: number;
      midweekAdvent: number;
      festival: number;
      other: number;
    }> = [];

    // Generate months in the range
    for (let year = startYear; year <= endYear; year++) {
      const monthStart = year === startYear ? startMonth : 0;
      const monthEnd = year === endYear ? endMonth : 11;
      
      for (let month = monthStart; month <= monthEnd; month++) {
        const monthStartDate = new Date(year, month, 1);
        const monthEndDate = new Date(year, month + 1, 0);
        const monthStartStr = monthStartDate.toISOString().split("T")[0];
        const monthEndStr = monthEndDate.toISOString().split("T")[0];

        // Clamp to actual date range
        const actualStart = monthStartStr < yearStart ? yearStart : monthStartStr;
        const actualEnd = monthEndStr > yearEnd ? yearEnd : monthEndStr;

        const monthServices = allServices.filter(
          (s) => s.serviceDate >= actualStart && s.serviceDate <= actualEnd,
        );

        const monthGiving = allGiving.filter(
          (g) => g.dateGiven >= actualStart && g.dateGiven <= actualEnd,
        );

        const serviceTotals: Record<string, number> = {
          divine_service: 0,
          midweek_lent: 0,
          midweek_advent: 0,
          festival: 0,
          other: 0,
        };

        monthGiving.forEach((g) => {
          const matchingServices = monthServices.filter((s) => s.serviceDate === g.dateGiven);
          const total = getTotalAmount(g);
          
          if (matchingServices.length > 0) {
            matchingServices.forEach((service) => {
              const type = service.serviceType || "other";
              if (serviceTotals[type] !== undefined) {
                serviceTotals[type] += total;
              } else {
                serviceTotals.other += total;
              }
            });
          } else {
            serviceTotals.other += total;
          }
        });

        monthlyGivingByService.push({
          month: monthStartDate.toLocaleString("default", { month: "long", year: "numeric" }),
          divineService: Math.round(serviceTotals.divine_service * 100) / 100,
          midweekLent: Math.round(serviceTotals.midweek_lent * 100) / 100,
          midweekAdvent: Math.round(serviceTotals.midweek_advent * 100) / 100,
          festival: Math.round(serviceTotals.festival * 100) / 100,
          other: Math.round(serviceTotals.other * 100) / 100,
        });
      }
    }

    // Age group giving trends
    const ageGroups: Record<string, { totalAmount: number; recordCount: number; averageAmount: number }> = {
      "0-17": { totalAmount: 0, recordCount: 0, averageAmount: 0 },
      "18-25": { totalAmount: 0, recordCount: 0, averageAmount: 0 },
      "26-35": { totalAmount: 0, recordCount: 0, averageAmount: 0 },
      "36-45": { totalAmount: 0, recordCount: 0, averageAmount: 0 },
      "46-55": { totalAmount: 0, recordCount: 0, averageAmount: 0 },
      "56-65": { totalAmount: 0, recordCount: 0, averageAmount: 0 },
      "66-75": { totalAmount: 0, recordCount: 0, averageAmount: 0 },
      "76+": { totalAmount: 0, recordCount: 0, averageAmount: 0 },
      "unknown": { totalAmount: 0, recordCount: 0, averageAmount: 0 },
    };

    const currentDate = new Date();
    allGiving.forEach((g) => {
      const age = calculateAge(g.memberDateOfBirth, currentDate);
      const total = getTotalAmount(g);
      
      let ageGroup = "unknown";
      if (age !== null) {
        if (age <= 17) ageGroup = "0-17";
        else if (age <= 25) ageGroup = "18-25";
        else if (age <= 35) ageGroup = "26-35";
        else if (age <= 45) ageGroup = "36-45";
        else if (age <= 55) ageGroup = "46-55";
        else if (age <= 65) ageGroup = "56-65";
        else if (age <= 75) ageGroup = "66-75";
        else ageGroup = "76+";
      }

      ageGroups[ageGroup].totalAmount += total;
      ageGroups[ageGroup].recordCount += 1;
    });

    // Calculate averages for age groups
    Object.values(ageGroups).forEach((group) => {
      group.averageAmount = group.recordCount > 0
        ? Math.round((group.totalAmount / group.recordCount) * 100) / 100
        : 0;
    });

    // Category breakdown (current, mission, memorials, etc.)
    let totalCurrent = 0;
    let totalMission = 0;
    let totalMemorials = 0;
    let totalDebt = 0;
    let totalSchool = 0;
    let totalMiscellaneous = 0;

    allGiving.forEach((g) => {
      totalCurrent += parseFloat(g.currentAmount || "0");
      totalMission += parseFloat(g.missionAmount || "0");
      totalMemorials += parseFloat(g.memorialsAmount || "0");
      totalDebt += parseFloat(g.debtAmount || "0");
      totalSchool += parseFloat(g.schoolAmount || "0");
      totalMiscellaneous += parseFloat(g.miscellaneousAmount || "0");
    });

    const categoryBreakdown = [
      { name: "Current", value: Math.round(totalCurrent * 100) / 100 },
      { name: "Mission", value: Math.round(totalMission * 100) / 100 },
      { name: "Memorials", value: Math.round(totalMemorials * 100) / 100 },
      { name: "Debt", value: Math.round(totalDebt * 100) / 100 },
      { name: "School", value: Math.round(totalSchool * 100) / 100 },
      { name: "Miscellaneous", value: Math.round(totalMiscellaneous * 100) / 100 },
    ].filter((item) => item.value > 0);

    // Format service type data
    const serviceTypeData = Object.values(givingByServiceType).map((item) => ({
      name: item.serviceType === "divine_service" ? "Divine Service"
        : item.serviceType === "midweek_lent" ? "Midweek Lent"
        : item.serviceType === "midweek_advent" ? "Midweek Advent"
        : item.serviceType === "festival" ? "Festival"
        : "Other",
      totalAmount: Math.round(item.totalAmount * 100) / 100,
      recordCount: item.recordCount,
      averageAmount: Math.round(item.averageAmount * 100) / 100,
    }));

    // Format age group data
    const ageGroupData = Object.entries(ageGroups)
      .filter(([, data]) => data.recordCount > 0)
      .map(([ageGroup, data]) => ({
        name: ageGroup === "unknown" ? "Unknown" : ageGroup,
        totalAmount: Math.round(data.totalAmount * 100) / 100,
        recordCount: data.recordCount,
        averageAmount: Math.round(data.averageAmount * 100) / 100,
      }));

    return NextResponse.json({
      monthlyTrend,
      monthlyGivingByService,
      serviceTypeData,
      ageGroupData,
      categoryBreakdown,
      year: startDateParam && endDateParam ? null : currentYear,
      startDate: yearStart,
      endDate: yearEnd,
      totalGiving: Math.round(
        allGiving.reduce((sum, g) => sum + getTotalAmount(g), 0) * 100
      ) / 100,
      totalRecords: allGiving.length,
    });
  } catch (error) {
    console.error("Error generating giving analytics:", error);
    return NextResponse.json(
      { error: "Failed to generate giving analytics" },
      { status: 500 },
    );
  }
}

