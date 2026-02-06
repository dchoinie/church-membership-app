import { NextResponse } from "next/server";
import { eq, and, gte, lte, asc, inArray } from "drizzle-orm";

import { db } from "@/db";
import { giving, members, services, givingItems, givingCategories } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";

export async function GET(request: Request) {
  try {
    // Allow all authenticated users to view analytics
    const { churchId } = await getAuthContext(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Default to current year if no dates provided
    const currentYear = new Date().getFullYear();
    const yearStart = startDateParam || `${currentYear}-01-01`;
    const yearEnd = endDateParam || `${currentYear}-12-31`;

    // Get all giving records for the current year with member info (filtered by churchId)
    const allGivingRaw = await db
      .select({
        id: giving.id,
        memberId: giving.memberId,
        dateGiven: giving.dateGiven,
        memberDateOfBirth: members.dateOfBirth,
        memberSex: members.sex,
      })
      .from(giving)
      .innerJoin(members, eq(giving.memberId, members.id))
      .where(
        and(
          eq(members.churchId, churchId),
          gte(giving.dateGiven, yearStart),
          lte(giving.dateGiven, yearEnd),
        ),
      );

    // Get all giving items for these records
    const givingIds = allGivingRaw.map(g => g.id);
    
    // Fetch all items in the date range
    const allItemsProper = givingIds.length > 0 ? await db
      .select({
        givingId: givingItems.givingId,
        categoryId: givingItems.categoryId,
        categoryName: givingCategories.name,
        amount: givingItems.amount,
      })
      .from(givingItems)
      .innerJoin(givingCategories, eq(givingItems.categoryId, givingCategories.id))
      .where(inArray(givingItems.givingId, givingIds))
      : [];

    // Group items by giving record
    const itemsByGivingId: Record<string, Array<{ categoryId: string; categoryName: string; amount: string }>> = {};
    allItemsProper.forEach(item => {
      if (!itemsByGivingId[item.givingId]) {
        itemsByGivingId[item.givingId] = [];
      }
      itemsByGivingId[item.givingId].push({
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        amount: item.amount,
      });
    });

    // Create giving records with items
    const allGiving = allGivingRaw.map(g => ({
      ...g,
      items: itemsByGivingId[g.id] || [],
    }));

    // Get all services for matching dates (filtered by churchId)
    const allServices = await db
      .select()
      .from(services)
      .where(
        and(
          eq(services.churchId, churchId),
          gte(services.serviceDate, yearStart),
          lte(services.serviceDate, yearEnd),
        ),
      )
      .orderBy(services.serviceDate);

    // Get active categories for this church
    const categories = await db
      .select()
      .from(givingCategories)
      .where(and(
        eq(givingCategories.churchId, churchId),
        eq(givingCategories.isActive, true),
      ))
      .orderBy(asc(givingCategories.displayOrder), asc(givingCategories.name));

    // Helper function to calculate total amount from a giving record
    const getTotalAmount = (record: typeof allGiving[0]): number => {
      return record.items.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
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

    // Monthly giving trends - now dynamic by category
    const monthlyTrend: Array<{
      month: string;
      totalAmount: number;
      recordCount: number;
      categoryAmounts: Record<string, number>;
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
        const categoryAmounts: Record<string, number> = {};

        // Initialize category amounts
        categories.forEach(cat => {
          categoryAmounts[cat.id] = 0;
        });

        monthGiving.forEach((g) => {
          const total = getTotalAmount(g);
          totalAmount += total;
          
          // Aggregate by category
          g.items.forEach(item => {
            if (!categoryAmounts[item.categoryId]) {
              categoryAmounts[item.categoryId] = 0;
            }
            categoryAmounts[item.categoryId] += parseFloat(item.amount || "0");
          });
        });

        monthlyTrend.push({
          month: monthStartDate.toLocaleString("default", { month: "long", year: "numeric" }),
          totalAmount: Math.round(totalAmount * 100) / 100,
          recordCount: monthGiving.length,
          categoryAmounts: Object.fromEntries(
            Object.entries(categoryAmounts).map(([id, amount]) => [id, Math.round(amount * 100) / 100])
          ),
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
      "under 15": { totalAmount: 0, recordCount: 0, averageAmount: 0 },
      "15-18": { totalAmount: 0, recordCount: 0, averageAmount: 0 },
      "19-34": { totalAmount: 0, recordCount: 0, averageAmount: 0 },
      "35-49": { totalAmount: 0, recordCount: 0, averageAmount: 0 },
      "50-64": { totalAmount: 0, recordCount: 0, averageAmount: 0 },
      "65+": { totalAmount: 0, recordCount: 0, averageAmount: 0 },
      "unknown": { totalAmount: 0, recordCount: 0, averageAmount: 0 },
    };

    const currentDate = new Date();
    allGiving.forEach((g) => {
      const age = calculateAge(g.memberDateOfBirth, currentDate);
      const total = getTotalAmount(g);
      
      let ageGroup = "unknown";
      if (age !== null) {
        if (age < 15) ageGroup = "under 15";
        else if (age >= 15 && age <= 18) ageGroup = "15-18";
        else if (age >= 19 && age <= 34) ageGroup = "19-34";
        else if (age >= 35 && age <= 49) ageGroup = "35-49";
        else if (age >= 50 && age <= 64) ageGroup = "50-64";
        else ageGroup = "65+";
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

    // Category breakdown - dynamic based on active categories
    const categoryTotals: Record<string, number> = {};
    categories.forEach(cat => {
      categoryTotals[cat.id] = 0;
    });

    allGiving.forEach((g) => {
      g.items.forEach(item => {
        if (!categoryTotals[item.categoryId]) {
          categoryTotals[item.categoryId] = 0;
        }
        categoryTotals[item.categoryId] += parseFloat(item.amount || "0");
      });
    });

    // Create category breakdown array with category names
    const categoryBreakdown = categories
      .map(cat => ({
        name: cat.name,
        value: Math.round((categoryTotals[cat.id] || 0) * 100) / 100,
      }))
      .filter((item) => item.value > 0);

    // Format service type data
    const serviceTypeLabels: Record<string, string> = {
      divine_service: "Divine Service",
      midweek_lent: "Midweek Lent",
      midweek_advent: "Midweek Advent",
      festival: "Festival",
    };
    
    const serviceTypeData = Object.values(givingByServiceType).map((item) => ({
      name: serviceTypeLabels[item.serviceType] || item.serviceType, // Use custom type name if not predefined
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
    return createErrorResponse(error);
  }
}
