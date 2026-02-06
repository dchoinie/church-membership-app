"use client";

import { useState, useEffect } from "react";
import { Loader2, BarChart3Icon, UsersIcon, CalendarIcon, TrendingUpIcon, DollarSignIcon } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AttendanceAnalytics {
  attendancePerService: Array<{
    serviceId: string;
    serviceDate: string;
    serviceType: string;
    serviceTime?: string | null;
    totalAttendance: number;
    totalCommunion: number;
    maleCount: number;
    femaleCount: number;
    malePercent: number;
    femalePercent: number;
    childrenCount: number;
    memberCount: number;
    guestCount: number;
  }>;
  divineServiceComparison: {
    divineService: {
      totalAttendance: number;
      serviceCount: number;
      averageAttendance: number;
    };
    otherServices: {
      totalAttendance: number;
      serviceCount: number;
      averageAttendance: number;
    };
  };
  memberVsGuestComparison: {
    members: {
      totalAttendance: number;
      averageAttendance: number;
    };
    guests: {
      totalAttendance: number;
      averageAttendance: number;
    };
  };
  monthlyTrend: Array<{
    month: string;
    attendance: number;
    communion: number;
    serviceCount: number;
    memberAttendance: number;
    guestAttendance: number;
  }>;
  year: number | null;
  startDate?: string;
  endDate?: string;
}

interface GivingAnalytics {
  monthlyTrend: Array<{
    month: string;
    totalAmount: number;
    recordCount: number;
    categoryAmounts: Record<string, number>;
  }>;
  monthlyGivingByService: Array<{
    month: string;
    divineService: number;
    midweekLent: number;
    midweekAdvent: number;
    festival: number;
    other: number;
  }>;
  serviceTypeData: Array<{
    name: string;
    totalAmount: number;
    recordCount: number;
    averageAmount: number;
  }>;
  ageGroupData: Array<{
    name: string;
    totalAmount: number;
    recordCount: number;
    averageAmount: number;
  }>;
  categoryBreakdown: Array<{
    name: string;
    value: number;
  }>;
  year: number | null;
  startDate?: string;
  endDate?: string;
  totalGiving: number;
  totalRecords: number;
}

const formatServiceType = (type: string) => {
  const types: Record<string, string> = {
    divine_service: "Divine Service",
    midweek_lent: "Midweek Lent",
    midweek_advent: "Midweek Advent",
    festival: "Festival",
  };
  return types[type] || type;
};

const formatTime = (timeString: string | null | undefined) => {
  if (!timeString) return "";
  try {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    const today = new Date();
    const serviceDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute);
    const formatted = serviceDateTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return formatted;
  } catch {
    return timeString;
  }
};

const formatDate = (dateString: string) => {
  try {
    const parts = dateString.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const localDate = new Date(year, month, day);
      return localDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
    return dateString;
  } catch {
    return dateString;
  }
};

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00", "#0088fe"];

interface Demographics {
  gender: Array<{ name: string; value: number }>;
  ageGroups: Array<{ name: string; value: number }>;
  householdTypes: Array<{ name: string; value: number }>;
  memberStatus?: Array<{ name: string; value: number }>;
  totalMembers: number;
}

type DateRangePreset = "current-month" | "last-3-months" | "last-6-months" | "current-year" | "custom";

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null);
  const [demographics, setDemographics] = useState<Demographics | null>(null);
  const [givingAnalytics, setGivingAnalytics] = useState<GivingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Date range state for attendance
  const [attendanceDateRange, setAttendanceDateRange] = useState<DateRangePreset>("current-year");
  const [attendanceStartDate, setAttendanceStartDate] = useState<string>("");
  const [attendanceEndDate, setAttendanceEndDate] = useState<string>("");

  // Date range state for giving
  const [givingDateRange, setGivingDateRange] = useState<DateRangePreset>("current-year");
  const [givingStartDate, setGivingStartDate] = useState<string>("");
  const [givingEndDate, setGivingEndDate] = useState<string>("");

  // Calculate date ranges based on preset
  const calculateDateRange = (preset: DateRangePreset): { startDate: string; endDate: string } => {
    const today = new Date();
    const currentYear = today.getFullYear();
    let startDate = "";
    let endDate = today.toISOString().split("T")[0];

    switch (preset) {
      case "current-month": {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = monthStart.toISOString().split("T")[0];
        break;
      }
      case "last-3-months": {
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        startDate = threeMonthsAgo.toISOString().split("T")[0];
        break;
      }
      case "last-6-months": {
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        startDate = sixMonthsAgo.toISOString().split("T")[0];
        break;
      }
      case "current-year":
        startDate = `${currentYear}-01-01`;
        endDate = `${currentYear}-12-31`;
        break;
      case "custom":
        // Custom dates are handled separately, return current year as fallback
        startDate = `${currentYear}-01-01`;
        endDate = `${currentYear}-12-31`;
        break;
      default:
        startDate = `${currentYear}-01-01`;
        endDate = `${currentYear}-12-31`;
    }

    return { startDate, endDate };
  };

  // Update attendance date range when preset changes
  useEffect(() => {
    if (attendanceDateRange !== "custom") {
      const { startDate, endDate } = calculateDateRange(attendanceDateRange);
      setAttendanceStartDate(startDate);
      setAttendanceEndDate(endDate);
    }
  }, [attendanceDateRange]);

  // Update giving date range when preset changes
  useEffect(() => {
    if (givingDateRange !== "custom") {
      const { startDate, endDate } = calculateDateRange(givingDateRange);
      setGivingStartDate(startDate);
      setGivingEndDate(endDate);
    }
  }, [givingDateRange]);

  // Initialize default dates
  useEffect(() => {
    const { startDate, endDate } = calculateDateRange("current-year");
    setAttendanceStartDate(startDate);
    setAttendanceEndDate(endDate);
    setGivingStartDate(startDate);
    setGivingEndDate(endDate);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const attendanceParams = new URLSearchParams({
          startDate: attendanceStartDate,
          endDate: attendanceEndDate,
        });

        const givingParams = new URLSearchParams({
          startDate: givingStartDate,
          endDate: givingEndDate,
        });

        const [attendanceResponse, demographicsResponse, givingResponse] = await Promise.all([
          fetch(`/api/reports/attendance?${attendanceParams}`),
          fetch("/api/reports/demographics"),
          fetch(`/api/reports/giving-analytics?${givingParams}`),
        ]);

        if (attendanceResponse.ok) {
          const data = await attendanceResponse.json();
          setAnalytics(data);
        }

        if (demographicsResponse.ok) {
          const data = await demographicsResponse.json();
          setDemographics(data);
        }

        if (givingResponse.ok) {
          const data = await givingResponse.json();
          setGivingAnalytics(data);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (attendanceStartDate && attendanceEndDate && givingStartDate && givingEndDate) {
      fetchData();
    }
  }, [attendanceStartDate, attendanceEndDate, givingStartDate, givingEndDate]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics && !demographics && !givingAnalytics) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  // Prepare data for charts
  const monthlyTrendData = analytics?.monthlyTrend.map((item) => {
    // Extract month name (handle both "January" and "January 2024" formats)
    const monthParts = item.month.split(" ");
    const monthName = monthParts[0].substring(0, 3);
    return {
      month: monthName,
      attendance: item.attendance,
      communion: item.communion,
      serviceCount: item.serviceCount,
    };
  }) || [];

  const attendancePerServiceData = analytics?.attendancePerService
    .slice()
    .reverse()
    .slice(0, 20)
    .map((service) => {
      const dateLabel = formatDate(service.serviceDate);
      const timeLabel = service.serviceTime ? formatTime(service.serviceTime) : "";
      const dateTimeLabel = timeLabel ? `${dateLabel} ${timeLabel}` : dateLabel;
      return {
        date: dateTimeLabel,
        dateOnly: dateLabel,
        time: timeLabel,
        attendance: service.totalAttendance,
        communion: service.totalCommunion,
        serviceType: formatServiceType(service.serviceType),
      };
    }) || [];

  const serviceTypeDistribution = analytics?.attendancePerService.reduce(
    (acc, service) => {
      const type = formatServiceType(service.serviceType);
      if (!acc[type]) {
        acc[type] = { name: type, value: 0, attendance: 0 };
      }
      acc[type].value += 1;
      acc[type].attendance += service.totalAttendance;
      return acc;
    },
    {} as Record<string, { name: string; value: number; attendance: number }>,
  ) || {};

  const serviceTypeData = Object.values(serviceTypeDistribution).map((item) => ({
    name: item.name,
    services: item.value,
    attendance: item.attendance,
  }));

  const genderDistributionData = analytics?.attendancePerService.reduce(
    (acc, service) => {
      acc.male += service.maleCount;
      acc.female += service.femaleCount;
      return acc;
    },
    { male: 0, female: 0 },
  ) || { male: 0, female: 0 };

  const genderPieData = [
    { name: "Male", value: genderDistributionData.male },
    { name: "Female", value: genderDistributionData.female },
  ].filter((item) => item.value > 0);

  const divineVsOtherData = analytics ? [
    {
      name: "Divine Service",
      total: analytics.divineServiceComparison.divineService.totalAttendance,
      average: analytics.divineServiceComparison.divineService.averageAttendance,
      services: analytics.divineServiceComparison.divineService.serviceCount,
    },
    {
      name: "Other Services",
      total: analytics.divineServiceComparison.otherServices.totalAttendance,
      average: analytics.divineServiceComparison.otherServices.averageAttendance,
      services: analytics.divineServiceComparison.otherServices.serviceCount,
    },
  ] : [];

  // Member vs Guest data preparation
  const memberVsGuestData = analytics ? [
    {
      name: "Members",
      total: analytics.memberVsGuestComparison.members.totalAttendance,
      average: analytics.memberVsGuestComparison.members.averageAttendance,
    },
    {
      name: "Guests",
      total: analytics.memberVsGuestComparison.guests.totalAttendance,
      average: analytics.memberVsGuestComparison.guests.averageAttendance,
    },
  ] : [];

  const monthlyMemberVsGuestData = analytics?.monthlyTrend.map((item) => {
    // Extract month name (handle both "January" and "January 2024" formats)
    const monthParts = item.month.split(" ");
    const monthName = monthParts[0].substring(0, 3);
    return {
      month: monthName,
      members: item.memberAttendance,
      guests: item.guestAttendance,
      serviceCount: item.serviceCount,
    };
  }) || [];

  const totalMemberAttendance = analytics?.memberVsGuestComparison.members.totalAttendance || 0;
  const totalGuestAttendance = analytics?.memberVsGuestComparison.guests.totalAttendance || 0;
  const memberVsGuestPieData = [
    { name: "Members", value: totalMemberAttendance },
    { name: "Guests", value: totalGuestAttendance },
  ].filter((item) => item.value > 0);

  // Giving analytics data preparation
  const monthlyGivingTrendData = givingAnalytics?.monthlyTrend.map((item) => {
    // Extract month name (handle both "January" and "January 2024" formats)
    const monthParts = item.month.split(" ");
    const monthName = monthParts[0].substring(0, 3);
    return {
      month: monthName,
      totalAmount: item.totalAmount,
      recordCount: item.recordCount,
    };
  }) || [];

  const monthlyGivingByServiceData = givingAnalytics?.monthlyGivingByService.map((item) => {
    // Extract month name (handle both "January" and "January 2024" formats)
    const monthParts = item.month.split(" ");
    const monthName = monthParts[0].substring(0, 3);
    return {
      month: monthName,
      "Divine Service": item.divineService,
      "Midweek Lent": item.midweekLent,
      "Midweek Advent": item.midweekAdvent,
      "Festival": item.festival,
      "Other": item.other,
    };
  }) || [];

  const givingByAgeGroupData = givingAnalytics?.ageGroupData.map((item) => ({
    name: item.name,
    totalAmount: item.totalAmount,
    averageAmount: item.averageAmount,
  })) || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Comprehensive insights into membership, giving, and attendance
          {(analytics || givingAnalytics) && (analytics?.year || givingAnalytics?.year) 
            ? ` for ${analytics?.year || givingAnalytics?.year || new Date().getFullYear()}`
            : ""}
        </p>
      </div>

      <Tabs defaultValue="membership" className="w-full">
        <TabsList className="w-full md:w-auto overflow-x-auto">
          <TabsTrigger className="cursor-pointer text-xs md:text-sm" value="membership">
            <UsersIcon className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            Membership
          </TabsTrigger>
          <TabsTrigger className="cursor-pointer text-xs md:text-sm" value="giving">
            <DollarSignIcon className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            Giving
          </TabsTrigger>
          <TabsTrigger className="cursor-pointer text-xs md:text-sm" value="attendance">
            <CalendarIcon className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            Attendance
          </TabsTrigger>
        </TabsList>

        {/* Membership Tab */}
        <TabsContent value="membership" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          {!demographics || demographics.totalMembers === 0 ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <p className="text-muted-foreground text-center">
                Please enter membership records to view analytics
              </p>
            </div>
          ) : (
            <>
              {/* Gender Distribution */}
              {demographics.gender.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                      <UsersIcon className="h-4 w-4 md:h-5 md:w-5" />
                      Gender Distribution
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Total active members: {demographics.totalMembers}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                      <PieChart>
                        <Pie
                          data={demographics.gender}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {demographics.gender.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Age Group Distribution */}
              {demographics.ageGroups.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                      <BarChart3Icon className="h-4 w-4 md:h-5 md:w-5" />
                      Age Group Distribution
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">Members grouped by age ranges</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                      <BarChart data={demographics.ageGroups}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8884d8" name="Members" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Household Type Distribution */}
              {demographics.householdTypes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                      <UsersIcon className="h-4 w-4 md:h-5 md:w-5" />
                      Household Type Distribution
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">Members grouped by household type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                      <PieChart>
                        <Pie
                          data={demographics.householdTypes}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                          outerRadius={80}
                          fill="#82ca9d"
                          dataKey="value"
                        >
                          {demographics.householdTypes.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Member Status Distribution */}
              {demographics.memberStatus && demographics.memberStatus.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                      <BarChart3Icon className="h-4 w-4 md:h-5 md:w-5" />
                      Member Status Distribution
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">Total number of members by participation status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                      <BarChart data={demographics.memberStatus}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8884d8" name="Members" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Giving Tab */}
        <TabsContent value="giving" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          {!givingAnalytics || givingAnalytics.totalRecords === 0 ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <p className="text-muted-foreground text-center">
                Please enter giving records to view analytics
              </p>
            </div>
          ) : (
            <>
              {/* Date Range Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Date Range</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="giving-date-range">Preset Range</Label>
                      <Select value={givingDateRange} onValueChange={(value) => setGivingDateRange(value as DateRangePreset)}>
                        <SelectTrigger id="giving-date-range" className="w-full md:w-[250px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="current-month">Current Month</SelectItem>
                          <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                          <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                          <SelectItem value="current-year">Current Year</SelectItem>
                          <SelectItem value="custom">Custom Date Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {givingDateRange === "custom" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="giving-start-date">Start Date</Label>
                          <Input
                            id="giving-start-date"
                            type="date"
                            value={givingStartDate}
                            onChange={(e) => setGivingStartDate(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="giving-end-date">End Date</Label>
                          <Input
                            id="giving-end-date"
                            type="date"
                            value={givingEndDate}
                            onChange={(e) => setGivingEndDate(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Giving</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(givingAnalytics.totalGiving)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{givingAnalytics.totalRecords} records</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Average Per Record</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(
                        givingAnalytics.totalRecords > 0
                          ? givingAnalytics.totalGiving / givingAnalytics.totalRecords
                          : 0
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Period</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {givingAnalytics.year || `${new Date(givingStartDate).getFullYear()}`}
                    </div>
                    {givingDateRange === "custom" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(givingStartDate).toLocaleDateString()} - {new Date(givingEndDate).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Giving Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <TrendingUpIcon className="h-4 w-4 md:h-5 md:w-5" />
                    Monthly Giving Trend
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">Total giving amount by month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                    <LineChart data={monthlyGivingTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="totalAmount"
                        stroke="#8884d8"
                        name="Total Giving"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Monthly Giving by Service Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <BarChart3Icon className="h-4 w-4 md:h-5 md:w-5" />
                    Monthly Giving by Service Type
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">Giving trends by service type per month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300} className="md:h-[400px]">
                    <BarChart data={monthlyGivingByServiceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="Divine Service" fill="#8884d8" />
                      <Bar dataKey="Midweek Lent" fill="#82ca9d" />
                      <Bar dataKey="Midweek Advent" fill="#ffc658" />
                      <Bar dataKey="Festival" fill="#ff7300" />
                      <Bar dataKey="Other" fill="#00ff00" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Giving by Service Type */}
              {givingAnalytics.serviceTypeData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                        <BarChart3Icon className="h-4 w-4 md:h-5 md:w-5" />
                        Total Giving by Service Type
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm">Total giving amount per service type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                        <BarChart data={givingAnalytics.serviceTypeData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Bar dataKey="totalAmount" fill="#8884d8" name="Total Amount" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                        <BarChart3Icon className="h-4 w-4 md:h-5 md:w-5" />
                        Average Giving by Service Type
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm">Average giving amount per service type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                        <BarChart data={givingAnalytics.serviceTypeData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Bar dataKey="averageAmount" fill="#82ca9d" name="Average Amount" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Giving by Age Group */}
              {givingAnalytics.ageGroupData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                        <UsersIcon className="h-4 w-4 md:h-5 md:w-5" />
                        Total Giving by Age Group
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm">Total giving amount by age group</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                        <BarChart data={givingByAgeGroupData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Bar dataKey="totalAmount" fill="#8884d8" name="Total Amount" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                        <UsersIcon className="h-4 w-4 md:h-5 md:w-5" />
                        Average Giving by Age Group
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm">Average giving amount per record by age group</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                        <BarChart data={givingByAgeGroupData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Bar dataKey="averageAmount" fill="#82ca9d" name="Average Amount" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Category Breakdown */}
              {givingAnalytics.categoryBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                      <DollarSignIcon className="h-4 w-4 md:h-5 md:w-5" />
                      Giving Category Breakdown
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">Distribution of giving across different categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                      <PieChart>
                        <Pie
                          data={givingAnalytics.categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {givingAnalytics.categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          {!analytics || analytics.attendancePerService.length === 0 ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <p className="text-muted-foreground text-center">
                Please enter attendance records to view analytics
              </p>
            </div>
          ) : (
            <>
              {/* Date Range Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Date Range</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="attendance-date-range">Preset Range</Label>
                      <Select value={attendanceDateRange} onValueChange={(value) => setAttendanceDateRange(value as DateRangePreset)}>
                        <SelectTrigger id="attendance-date-range" className="w-full md:w-[250px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="current-month">Current Month</SelectItem>
                          <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                          <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                          <SelectItem value="current-year">Current Year</SelectItem>
                          <SelectItem value="custom">Custom Date Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {attendanceDateRange === "custom" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="attendance-start-date">Start Date</Label>
                          <Input
                            id="attendance-start-date"
                            type="date"
                            value={attendanceStartDate}
                            onChange={(e) => setAttendanceStartDate(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="attendance-end-date">End Date</Label>
                          <Input
                            id="attendance-end-date"
                            type="date"
                            value={attendanceEndDate}
                            onChange={(e) => setAttendanceEndDate(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Attendance Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <TrendingUpIcon className="h-4 w-4 md:h-5 md:w-5" />
                    Monthly Attendance Trend (Average Per Service)
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">Average attendance and communion per service by month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                    <LineChart data={monthlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number, name: string, props?: { payload?: { serviceCount?: number } }) => {
                          const serviceCount = props?.payload?.serviceCount || 0;
                          if (name === "Avg Attendance/Service" || name === "Avg Communion/Service") {
                            return [`${typeof value === 'number' ? value.toFixed(1) : value}${serviceCount > 0 ? ` (${serviceCount} service${serviceCount !== 1 ? 's' : ''})` : ''}`, name];
                          }
                          return [typeof value === 'number' ? value.toFixed(1) : value, name];
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="attendance"
                        stroke="#8884d8"
                        name="Avg Attendance/Service"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="communion"
                        stroke="#82ca9d"
                        name="Avg Communion/Service"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Monthly Member vs Guest Trend */}
              {monthlyMemberVsGuestData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                      <TrendingUpIcon className="h-4 w-4 md:h-5 md:w-5" />
                      Monthly Member vs Guest Trend (Average Per Service)
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">Average member and guest attendance per service by month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                      <LineChart data={monthlyMemberVsGuestData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number, name: string, props?: { payload?: { serviceCount?: number } }) => {
                            const serviceCount = props?.payload?.serviceCount || 0;
                            if (name === "Members" || name === "Guests") {
                              return [`${typeof value === 'number' ? value.toFixed(1) : value}${serviceCount > 0 ? ` (${serviceCount} service${serviceCount !== 1 ? 's' : ''})` : ''}`, name];
                            }
                            return [typeof value === 'number' ? value.toFixed(1) : value, name];
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="members"
                          stroke="#8884d8"
                          name="Members"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="guests"
                          stroke="#ff7300"
                          name="Guests"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Divine Service vs Other Services */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                      <BarChart3Icon className="h-4 w-4 md:h-5 md:w-5" />
                      Total Attendance Comparison
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">Divine Service vs Other Service Types</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200} className="md:h-[250px]">
                      <BarChart data={divineVsOtherData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="total" fill="#8884d8" name="Total Attendance" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                      <BarChart3Icon className="h-4 w-4 md:h-5 md:w-5" />
                      Average Attendance Comparison
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">Average attendance per service type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200} className="md:h-[250px]">
                      <BarChart data={divineVsOtherData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="average" fill="#82ca9d" name="Average Attendance" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Member vs Guest Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                      <BarChart3Icon className="h-4 w-4 md:h-5 md:w-5" />
                      Total Attendance: Members vs Guests
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">Total member and guest attendance comparison</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200} className="md:h-[250px]">
                      <BarChart data={memberVsGuestData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="total" fill="#8884d8" name="Total Attendance" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                      <BarChart3Icon className="h-4 w-4 md:h-5 md:w-5" />
                      Average Attendance: Members vs Guests
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">Average attendance per service</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200} className="md:h-[250px]">
                      <BarChart data={memberVsGuestData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="average" fill="#82ca9d" name="Average Attendance" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Member vs Guest Pie Chart */}
              {memberVsGuestPieData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                      <UsersIcon className="h-4 w-4 md:h-5 md:w-5" />
                      Member vs Guest Distribution
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">Overall percentage breakdown of members vs guests</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                      <PieChart>
                        <Pie
                          data={memberVsGuestPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {memberVsGuestPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Service Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <CalendarIcon className="h-4 w-4 md:h-5 md:w-5" />
                    Service Type Distribution
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">Number of services and total attendance by type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                    <BarChart data={serviceTypeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="services" fill="#8884d8" name="Number of Services" />
                      <Bar yAxisId="right" dataKey="attendance" fill="#82ca9d" name="Total Attendance" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Gender Distribution (from attendance) */}
              {genderPieData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                      <UsersIcon className="h-4 w-4 md:h-5 md:w-5" />
                      Gender Distribution (Attendance)
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">Overall male vs female attendance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                      <PieChart>
                        <Pie
                          data={genderPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {genderPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Recent Services Attendance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <BarChart3Icon className="h-4 w-4 md:h-5 md:w-5" />
                    Recent Services Attendance
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">Attendance and communion for the last 20 services</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300} className="md:h-[400px]">
                    <BarChart data={attendancePerServiceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <p className="font-medium">{data.date}</p>
                                {data.serviceType && (
                                  <p className="text-sm text-muted-foreground">{data.serviceType}</p>
                                )}
                                {payload.map((entry, index) => (
                                  <p key={index} style={{ color: entry.color }}>
                                    {entry.name}: {entry.value}
                                  </p>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="attendance" fill="#8884d8" name="Attendance" />
                      <Bar dataKey="communion" fill="#82ca9d" name="Communion" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
