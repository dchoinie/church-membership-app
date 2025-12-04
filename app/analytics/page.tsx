"use client";

import { useState, useEffect } from "react";
import { Loader2, BarChart3Icon, UsersIcon, CalendarIcon, TrendingUpIcon } from "lucide-react";
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

interface AttendanceAnalytics {
  attendancePerService: Array<{
    serviceId: string;
    serviceDate: string;
    serviceType: string;
    totalAttendance: number;
    totalCommunion: number;
    maleCount: number;
    femaleCount: number;
    malePercent: number;
    femalePercent: number;
    childrenCount: number;
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
  monthlyTrend: Array<{
    month: string;
    attendance: number;
    communion: number;
    serviceCount: number;
  }>;
  year: number;
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

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00"];

interface Demographics {
  gender: Array<{ name: string; value: number }>;
  ageGroups: Array<{ name: string; value: number }>;
  householdTypes: Array<{ name: string; value: number }>;
  totalMembers: number;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null);
  const [demographics, setDemographics] = useState<Demographics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [attendanceResponse, demographicsResponse] = await Promise.all([
          fetch("/api/reports/attendance"),
          fetch("/api/reports/demographics"),
        ]);

        if (attendanceResponse.ok) {
          const data = await attendanceResponse.json();
          setAnalytics(data);
        }

        if (demographicsResponse.ok) {
          const data = await demographicsResponse.json();
          setDemographics(data);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  if (!analytics && !demographics) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  // Prepare data for charts (only if analytics data exists)
  const monthlyTrendData = analytics?.monthlyTrend.map((item) => ({
    month: item.month.substring(0, 3), // Short month name
    attendance: item.attendance,
    communion: item.communion,
    serviceCount: item.serviceCount,
  })) || [];

  const attendancePerServiceData = analytics?.attendancePerService
    .slice()
    .reverse()
    .slice(0, 20) // Show last 20 services
    .map((service) => ({
      date: formatDate(service.serviceDate),
      attendance: service.totalAttendance,
      communion: service.totalCommunion,
      serviceType: formatServiceType(service.serviceType),
    })) || [];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Attendance trends and demographic insights{analytics ? ` for ${analytics.year}` : ""}
        </p>
      </div>

      {/* Monthly Attendance Trend */}
      {analytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5" />
              Monthly Attendance Trend (Average Per Service)
            </CardTitle>
            <CardDescription>Average attendance and communion per service by month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => {
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
      )}

      {/* Divine Service vs Other Services */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3Icon className="h-5 w-5" />
                Total Attendance Comparison
              </CardTitle>
              <CardDescription>Divine Service vs Other Service Types</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
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
              <CardTitle className="flex items-center gap-2">
                <BarChart3Icon className="h-5 w-5" />
                Average Attendance Comparison
              </CardTitle>
              <CardDescription>Average attendance per service type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
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
      )}

      {/* Service Type Distribution */}
      {analytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Service Type Distribution
            </CardTitle>
            <CardDescription>Number of services and total attendance by type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
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
      )}

      {/* Gender Distribution (from attendance) */}
      {analytics && genderPieData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Gender Distribution (Attendance)
            </CardTitle>
            <CardDescription>Overall male vs female attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
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
      {analytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3Icon className="h-5 w-5" />
              Recent Services Attendance
            </CardTitle>
            <CardDescription>Attendance and communion for the last 20 services</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={attendancePerServiceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="attendance" fill="#8884d8" name="Attendance" />
                <Bar dataKey="communion" fill="#82ca9d" name="Communion" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Member Demographics Section */}
      {demographics && (
        <>
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Member Demographics</h2>
            <p className="text-muted-foreground mb-6">
              Breakdown of active members by gender, age, and household type
            </p>
          </div>

          {/* Gender Distribution */}
          {demographics.gender.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="h-5 w-5" />
                  Gender Distribution
                </CardTitle>
                <CardDescription>
                  Total active members: {demographics.totalMembers}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
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
                <CardTitle className="flex items-center gap-2">
                  <BarChart3Icon className="h-5 w-5" />
                  Age Group Distribution
                </CardTitle>
                <CardDescription>Members grouped by age ranges</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
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
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="h-5 w-5" />
                  Household Type Distribution
                </CardTitle>
                <CardDescription>Members grouped by household type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
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
        </>
      )}
    </div>
  );
}

