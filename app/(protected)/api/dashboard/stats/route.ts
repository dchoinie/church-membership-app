import { NextResponse } from "next/server";
import { eq, and, gte, lte, count, inArray } from "drizzle-orm";

import { db } from "@/db";
import { members, giving, givingItems, services, attendance } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Calculate date ranges
    const yearStart = `${currentYear}-01-01`;
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthStartStr = monthStart.toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];

    // Calculate 6 months ago
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split("T")[0];

    // Calculate 30 days ago
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    // Get total members count
    const [totalMembersResult] = await db
      .select({ count: count() })
      .from(members)
      .where(eq(members.churchId, churchId));
    const totalMembers = totalMembersResult.count;

    // Get active vs inactive members
    const [activeMembersResult] = await db
      .select({ count: count() })
      .from(members)
      .where(and(eq(members.churchId, churchId), eq(members.participation, "active")));
    const activeMembers = activeMembersResult.count;
    const inactiveMembers = totalMembers - activeMembers;

    // Get recent services count (last 30 days)
    const [recentServicesResult] = await db
      .select({ count: count() })
      .from(services)
      .where(
        and(
          eq(services.churchId, churchId),
          gte(services.serviceDate, thirtyDaysAgoStr),
          lte(services.serviceDate, todayStr),
        ),
      );
    const recentServicesCount = recentServicesResult.count;

    // Get giving records for this month
    const thisMonthGivingRaw = await db
      .select({
        id: giving.id,
      })
      .from(giving)
      .innerJoin(members, eq(giving.memberId, members.id))
      .where(
        and(
          eq(members.churchId, churchId),
          gte(giving.dateGiven, monthStartStr),
          lte(giving.dateGiven, todayStr),
        ),
      );

    // Get giving items for this month
    const thisMonthGivingIds = thisMonthGivingRaw.map((g) => g.id);
    const thisMonthGivingItems =
      thisMonthGivingIds.length > 0
        ? await db
            .select({
              amount: givingItems.amount,
            })
            .from(givingItems)
            .where(inArray(givingItems.givingId, thisMonthGivingIds))
        : [];

    const thisMonthGiving = thisMonthGivingItems.reduce(
      (sum, item) => sum + parseFloat(item.amount || "0"),
      0,
    );

    // Get giving records for this year
    const thisYearGivingRaw = await db
      .select({
        id: giving.id,
      })
      .from(giving)
      .innerJoin(members, eq(giving.memberId, members.id))
      .where(
        and(
          eq(members.churchId, churchId),
          gte(giving.dateGiven, yearStart),
          lte(giving.dateGiven, todayStr),
        ),
      );

    // Get giving items for this year
    const thisYearGivingIds = thisYearGivingRaw.map((g) => g.id);
    const thisYearGivingItems =
      thisYearGivingIds.length > 0
        ? await db
            .select({
              amount: givingItems.amount,
            })
            .from(givingItems)
            .where(inArray(givingItems.givingId, thisYearGivingIds))
        : [];

    const thisYearGiving = thisYearGivingItems.reduce(
      (sum, item) => sum + parseFloat(item.amount || "0"),
      0,
    );

    // Get services from last 6 months for attendance calculation
    const recentServices = await db
      .select({
        id: services.id,
        serviceDate: services.serviceDate,
      })
      .from(services)
      .where(
        and(
          eq(services.churchId, churchId),
          gte(services.serviceDate, sixMonthsAgoStr),
          lte(services.serviceDate, todayStr),
        ),
      );

    // Get attendance records for these services
    const serviceIds = recentServices.map((s) => s.id);
    const attendanceRecords =
      serviceIds.length > 0
        ? await db
            .select({
              serviceId: attendance.serviceId,
              attended: attendance.attended,
            })
            .from(attendance)
            .innerJoin(members, eq(attendance.memberId, members.id))
            .where(
              and(
                eq(members.churchId, churchId),
                inArray(attendance.serviceId, serviceIds),
              ),
            )
        : [];

    // Calculate average attendance per service
    const attendanceByService: Record<string, number> = {};
    attendanceRecords.forEach((record) => {
      if (record.attended) {
        attendanceByService[record.serviceId] = (attendanceByService[record.serviceId] || 0) + 1;
      }
    });

    const serviceAttendanceCounts = recentServices.map(
      (service) => attendanceByService[service.id] || 0,
    );
    const averageAttendance =
      serviceAttendanceCounts.length > 0
        ? serviceAttendanceCounts.reduce((sum, count) => sum + count, 0) /
          serviceAttendanceCounts.length
        : 0;

    // Calculate monthly giving trend (last 6 months)
    const monthlyGiving: Array<{ month: string; amount: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentYear, currentMonth - i, 1);
      const monthEndDate = new Date(currentYear, currentMonth - i + 1, 0);
      const monthStartDateStr = monthDate.toISOString().split("T")[0];
      const monthEndDateStr = monthEndDate.toISOString().split("T")[0];

      // Clamp to today if future
      const actualEnd = monthEndDateStr > todayStr ? todayStr : monthEndDateStr;

      const monthGivingRaw = await db
        .select({
          id: giving.id,
        })
        .from(giving)
        .innerJoin(members, eq(giving.memberId, members.id))
        .where(
          and(
            eq(members.churchId, churchId),
            gte(giving.dateGiven, monthStartDateStr),
            lte(giving.dateGiven, actualEnd),
          ),
        );

      const monthGivingIds = monthGivingRaw.map((g) => g.id);
      const monthGivingItems =
        monthGivingIds.length > 0
          ? await db
              .select({
                amount: givingItems.amount,
              })
              .from(givingItems)
              .where(inArray(givingItems.givingId, monthGivingIds))
          : [];

      const monthTotal = monthGivingItems.reduce(
        (sum, item) => sum + parseFloat(item.amount || "0"),
        0,
      );

      monthlyGiving.push({
        month: monthDate.toLocaleString("default", { month: "short" }),
        amount: Math.round(monthTotal * 100) / 100,
      });
    }

    // Calculate monthly attendance trend (last 6 months)
    const monthlyAttendance: Array<{ month: string; average: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentYear, currentMonth - i, 1);
      const monthEndDate = new Date(currentYear, currentMonth - i + 1, 0);
      const monthStartDateStr = monthDate.toISOString().split("T")[0];
      const monthEndDateStr = monthEndDate.toISOString().split("T")[0];

      // Clamp to today if future
      const actualEnd = monthEndDateStr > todayStr ? todayStr : monthEndDateStr;

      const monthServices = await db
        .select({
          id: services.id,
        })
        .from(services)
        .where(
          and(
            eq(services.churchId, churchId),
            gte(services.serviceDate, monthStartDateStr),
            lte(services.serviceDate, actualEnd),
          ),
        );

      const monthServiceIds = monthServices.map((s) => s.id);
      const monthAttendanceRecords =
        monthServiceIds.length > 0
          ? await db
              .select({
                serviceId: attendance.serviceId,
                attended: attendance.attended,
              })
              .from(attendance)
              .innerJoin(members, eq(attendance.memberId, members.id))
              .where(
                and(
                  eq(members.churchId, churchId),
                  inArray(attendance.serviceId, monthServiceIds),
                ),
              )
          : [];

      const monthAttendanceByService: Record<string, number> = {};
      monthAttendanceRecords.forEach((record) => {
        if (record.attended) {
          monthAttendanceByService[record.serviceId] =
            (monthAttendanceByService[record.serviceId] || 0) + 1;
        }
      });

      const monthServiceAttendanceCounts = monthServices.map(
        (service) => monthAttendanceByService[service.id] || 0,
      );
      const monthAverage =
        monthServiceAttendanceCounts.length > 0
          ? monthServiceAttendanceCounts.reduce((sum, count) => sum + count, 0) /
            monthServiceAttendanceCounts.length
          : 0;

      monthlyAttendance.push({
        month: monthDate.toLocaleString("default", { month: "short" }),
        average: Math.round(monthAverage * 100) / 100,
      });
    }

    return NextResponse.json({
      metrics: {
        totalMembers,
        thisMonthGiving: Math.round(thisMonthGiving * 100) / 100,
        thisYearGiving: Math.round(thisYearGiving * 100) / 100,
        recentServicesCount,
        averageAttendance: Math.round(averageAttendance * 100) / 100,
        activeMembers,
        inactiveMembers,
      },
      trends: {
        monthlyGiving,
        monthlyAttendance,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
