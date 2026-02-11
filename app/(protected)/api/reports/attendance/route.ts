import { NextResponse } from "next/server";
import { eq, and, gte, lte } from "drizzle-orm";

import { db } from "@/db";
import { attendance, services, members } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { decrypt } from "@/lib/encryption";

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

    // Get all services for the current year (filtered by churchId)
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

    // Get all attendance records with member and service info for current year (filtered by churchId)
    const allAttendance = await db
      .select({
        attendanceId: attendance.id,
        serviceId: attendance.serviceId,
        memberId: attendance.memberId,
        attended: attendance.attended,
        tookCommunion: attendance.tookCommunion,
        serviceDate: services.serviceDate,
        serviceType: services.serviceType,
        memberSex: members.sex,
        memberDateOfBirth: members.dateOfBirth,
        memberMembershipCode: members.membershipCode,
      })
      .from(attendance)
      .innerJoin(services, eq(attendance.serviceId, services.id))
      .innerJoin(members, eq(attendance.memberId, members.id))
      .where(
        and(
          eq(services.churchId, churchId),
          eq(members.churchId, churchId),
          gte(services.serviceDate, yearStart),
          lte(services.serviceDate, yearEnd),
        ),
      );

    // Decrypt memberDateOfBirth for age calculations
    const allAttendanceDecrypted = allAttendance.map((a) => ({
      ...a,
      memberDateOfBirth: a.memberDateOfBirth ? decrypt(a.memberDateOfBirth) : null,
    }));

    // Calculate overall attendance per service
    const attendancePerService = allServices.map((service) => {
      const serviceAttendance = allAttendanceDecrypted.filter((a) => a.serviceId === service.id);
      const totalAttended = serviceAttendance.filter((a) => a.attended).length;
      const totalCommunion = serviceAttendance.filter((a) => a.tookCommunion).length;

      // Calculate male vs female percentages
      const attendedRecords = serviceAttendance.filter((a) => a.attended);
      const maleCount = attendedRecords.filter((a) => a.memberSex === "male").length;
      const femaleCount = attendedRecords.filter((a) => a.memberSex === "female").length;
      const totalWithGender = maleCount + femaleCount;
      const malePercent = totalWithGender > 0 ? (maleCount / totalWithGender) * 100 : 0;
      const femalePercent = totalWithGender > 0 ? (femaleCount / totalWithGender) * 100 : 0;

      // Calculate children count (under 18 at time of service)
      const serviceDateObj = new Date(service.serviceDate);
      const childrenCount = attendedRecords.filter((a) => {
        if (!a.memberDateOfBirth) return false;
        const birthDate = new Date(a.memberDateOfBirth);
        const ageAtService = serviceDateObj.getFullYear() - birthDate.getFullYear();
        const monthDiff = serviceDateObj.getMonth() - birthDate.getMonth();
        const dayDiff = serviceDateObj.getDate() - birthDate.getDate();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? ageAtService - 1 : ageAtService;
        return actualAge < 18;
      }).length;

      // Calculate member vs guest counts
      const memberCount = attendedRecords.filter((a) => a.memberMembershipCode !== "GUEST").length;
      const guestCount = attendedRecords.filter((a) => a.memberMembershipCode === "GUEST").length;

      return {
        serviceId: service.id,
        serviceDate: service.serviceDate,
        serviceType: service.serviceType,
        serviceTime: service.serviceTime,
        totalAttendance: totalAttended,
        totalCommunion,
        maleCount,
        femaleCount,
        malePercent: Math.round(malePercent * 100) / 100,
        femalePercent: Math.round(femalePercent * 100) / 100,
        childrenCount,
        memberCount,
        guestCount,
      };
    });

    // Calculate attendance comparison: Divine Service vs others
    const divineServiceAttendance = attendancePerService
      .filter((s) => s.serviceType === "divine_service")
      .reduce((sum, s) => sum + s.totalAttendance, 0);

    const otherServiceAttendance = attendancePerService
      .filter((s) => s.serviceType !== "divine_service")
      .reduce((sum, s) => sum + s.totalAttendance, 0);

    const divineServiceCount = attendancePerService.filter((s) => s.serviceType === "divine_service").length;
    const otherServiceCount = attendancePerService.filter((s) => s.serviceType !== "divine_service").length;

    // Calculate member vs guest comparison
    const totalMemberAttendance = attendancePerService.reduce((sum, s) => sum + s.memberCount, 0);
    const totalGuestAttendance = attendancePerService.reduce((sum, s) => sum + s.guestCount, 0);
    const totalServices = attendancePerService.length;
    const averageMemberAttendance = totalServices > 0 ? Math.round((totalMemberAttendance / totalServices) * 100) / 100 : 0;
    const averageGuestAttendance = totalServices > 0 ? Math.round((totalGuestAttendance / totalServices) * 100) / 100 : 0;

    // Calculate monthly attendance trend (average per service)
    const monthlyTrend: { month: string; attendance: number; communion: number; serviceCount: number; memberAttendance: number; guestAttendance: number }[] = [];
    
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

        const monthServices = allServices.filter(
          (s) => s.serviceDate >= actualStart && s.serviceDate <= actualEnd,
        );
        const monthServiceIds = monthServices.map((s) => s.id);
        const monthAttendance = allAttendance.filter((a) => monthServiceIds.includes(a.serviceId));

        const monthAttended = monthAttendance.filter((a) => a.attended).length;
        const monthCommunion = monthAttendance.filter((a) => a.tookCommunion).length;
        const serviceCount = monthServices.length;

        // Calculate average attendance per service
        const avgAttendance = serviceCount > 0 ? Math.round((monthAttended / serviceCount) * 100) / 100 : 0;
        const avgCommunion = serviceCount > 0 ? Math.round((monthCommunion / serviceCount) * 100) / 100 : 0;

        // Calculate member vs guest attendance
        const monthAttendedRecords = monthAttendance.filter((a) => a.attended);
        const monthMemberAttendance = monthAttendedRecords.filter((a) => a.memberMembershipCode !== "GUEST").length;
        const monthGuestAttendance = monthAttendedRecords.filter((a) => a.memberMembershipCode === "GUEST").length;
        const avgMemberAttendance = serviceCount > 0 ? Math.round((monthMemberAttendance / serviceCount) * 100) / 100 : 0;
        const avgGuestAttendance = serviceCount > 0 ? Math.round((monthGuestAttendance / serviceCount) * 100) / 100 : 0;

        monthlyTrend.push({
          month: monthStartDate.toLocaleString("default", { month: "long", year: "numeric" }),
          attendance: avgAttendance,
          communion: avgCommunion,
          serviceCount,
          memberAttendance: avgMemberAttendance,
          guestAttendance: avgGuestAttendance,
        });
      }
    }

    return NextResponse.json({
      attendancePerService,
      divineServiceComparison: {
        divineService: {
          totalAttendance: divineServiceAttendance,
          serviceCount: divineServiceCount,
          averageAttendance: divineServiceCount > 0 ? Math.round((divineServiceAttendance / divineServiceCount) * 100) / 100 : 0,
        },
        otherServices: {
          totalAttendance: otherServiceAttendance,
          serviceCount: otherServiceCount,
          averageAttendance: otherServiceCount > 0 ? Math.round((otherServiceAttendance / otherServiceCount) * 100) / 100 : 0,
        },
      },
      memberVsGuestComparison: {
        members: {
          totalAttendance: totalMemberAttendance,
          averageAttendance: averageMemberAttendance,
        },
        guests: {
          totalAttendance: totalGuestAttendance,
          averageAttendance: averageGuestAttendance,
        },
      },
      monthlyTrend,
      year: startDateParam && endDateParam ? null : currentYear,
      startDate: yearStart,
      endDate: yearEnd,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

