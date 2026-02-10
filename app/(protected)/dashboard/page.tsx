"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  DollarSign,
  Calendar,
  BarChart3,
  FileText,
  Settings,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Activity,
  UserPlus,
  UserMinus,
  Cross,
  Building2,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSetupComplete } from "@/lib/setup-helpers";
import { Badge } from "@/components/ui/badge";

interface Church {
  subscriptionStatus: "active" | "past_due" | "canceled" | "unpaid";
  stripeSubscriptionId: string | null;
  name?: string;
  denomination?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

interface DashboardStats {
  metrics: {
    totalMembers: number;
    thisMonthGiving: number;
    thisYearGiving: number;
    recentServicesCount: number;
    averageAttendance: number;
    activeMembers: number;
    inactiveMembers: number;
  };
  trends: {
    monthlyGiving: Array<{ month: string; amount: number }>;
    monthlyAttendance: Array<{ month: string; average: number }>;
  };
}

interface RecentStatusChange {
  id: string;
  firstName: string;
  lastName: string;
  changeType:
    | "confirmation"
    | "baptism"
    | "transfer_in"
    | "transfer_out"
    | "received"
    | "removed";
  date: string;
  receivedBy?: string;
  removedBy?: string;
  householdName: string | null;
}

interface RecentService {
  serviceId: string;
  serviceDate: string;
  serviceType: string;
  serviceTime: string | null;
  attendeesCount: number;
  communionCount: number;
}

interface RecentGivingByService {
  serviceId: string;
  serviceDate: string;
  serviceType: string;
  serviceTime: string | null;
  categoryTotals: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
  }>;
  totalAmount: number;
}

interface AttendanceMonthlyTrend {
  month: string;
  attendance: number;
  communion: number;
  serviceCount: number;
}

interface GivingMonthlyTrend {
  month: string;
  totalAmount: number;
  recordCount: number;
}

type TrendsDateRange = "6months" | "ytd" | "3months" | "custom";

function formatAddress(church: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string {
  const parts = [church.address, church.city, church.state, church.zip].filter(
    Boolean
  );
  return parts.join(", ");
}

export default function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const checkoutSuccess = searchParams.get("checkout");
  const [isVerifyingSubscription, setIsVerifyingSubscription] = useState(
    checkoutSuccess === "success",
  );
  const [verificationMessage, setVerificationMessage] = useState(
    "Processing your subscription...",
  );

  // Trends date range state
  const [trendsDateRange, setTrendsDateRange] =
    useState<TrendsDateRange>("6months");
  const [trendsCustomStart, setTrendsCustomStart] = useState("");
  const [trendsCustomEnd, setTrendsCustomEnd] = useState("");

  // Dashboard data via SWR (cached, revalidates on focus)
  const dashboardFetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  };

  const shouldFetchDashboard = !isVerifyingSubscription;
  const { data: statsData } = useSWR<DashboardStats>(
    shouldFetchDashboard ? "/api/dashboard/stats" : null,
    dashboardFetcher,
  );
  const { data: churchData } = useSWR<{ church: Church }>(
    shouldFetchDashboard ? "/api/church" : null,
    dashboardFetcher,
  );
  const { data: changesData } = useSWR<{ changes?: RecentStatusChange[] }>(
    shouldFetchDashboard ? "/api/dashboard/recent-status-changes" : null,
    dashboardFetcher,
  );
  const { data: servicesData } = useSWR<{ services?: RecentService[] }>(
    shouldFetchDashboard ? "/api/dashboard/recent-services" : null,
    dashboardFetcher,
  );
  const { data: givingByServiceData } = useSWR<{
    services?: RecentGivingByService[];
  }>(
    shouldFetchDashboard ? "/api/dashboard/recent-giving-by-service" : null,
    dashboardFetcher,
  );

  // Compute trends date range
  const getTrendsDateRange = (): { startDate: string; endDate: string } => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const currentYear = today.getFullYear();
    const yearStart = `${currentYear}-01-01`;

    switch (trendsDateRange) {
      case "ytd":
        return { startDate: yearStart, endDate: todayStr };
      case "3months": {
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return {
          startDate: threeMonthsAgo.toISOString().split("T")[0],
          endDate: todayStr,
        };
      }
      case "custom":
        return {
          startDate: trendsCustomStart || yearStart,
          endDate: trendsCustomEnd || todayStr,
        };
      case "6months":
      default: {
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return {
          startDate: sixMonthsAgo.toISOString().split("T")[0],
          endDate: todayStr,
        };
      }
    }
  };

  const { startDate: trendsStartDate, endDate: trendsEndDate } =
    getTrendsDateRange();

  const attendanceKey =
    trendsStartDate && trendsEndDate
      ? `/api/reports/attendance?startDate=${trendsStartDate}&endDate=${trendsEndDate}`
      : null;
  const givingKey =
    trendsStartDate && trendsEndDate
      ? `/api/reports/giving-analytics?startDate=${trendsStartDate}&endDate=${trendsEndDate}`
      : null;

  const { data: attendanceData } = useSWR<{
    monthlyTrend: AttendanceMonthlyTrend[];
  }>(shouldFetchDashboard ? attendanceKey : null, dashboardFetcher);
  const { data: givingData } = useSWR<{
    monthlyTrend: GivingMonthlyTrend[];
  }>(shouldFetchDashboard ? givingKey : null, dashboardFetcher);

  const stats = statsData ?? null;
  const church = churchData?.church ?? null;
  const recentChanges = changesData?.changes ?? [];
  const recentServices = servicesData?.services ?? [];
  const recentGivingByService = givingByServiceData?.services ?? [];
  const attendanceTrend = attendanceData?.monthlyTrend ?? [];
  const givingTrend = givingData?.monthlyTrend ?? [];

  const loading =
    shouldFetchDashboard &&
    statsData === undefined &&
    changesData === undefined &&
    servicesData === undefined &&
    givingByServiceData === undefined;

  // Handle checkout success - poll for subscription update
  useEffect(() => {
    if (checkoutSuccess !== "success") {
      return;
    }

    let pollCount = 0;
    const maxPolls = 20;
    const pollInterval = 1000;

    const checkSubscription = async () => {
      try {
        const response = await fetch("/api/church");
        if (!response.ok) {
          throw new Error("Failed to fetch church data");
        }

        const data = await response.json();
        const churchResponse: Church = data.church;

        if (isSetupComplete(churchResponse)) {
          setVerificationMessage("Subscription activated successfully!");

          setTimeout(() => {
            router.replace("/dashboard");
            setIsVerifyingSubscription(false);
          }, 1500);
          return;
        }

        pollCount++;
        if (pollCount >= maxPolls) {
          setVerificationMessage(
            "Subscription is being processed. Please refresh the page in a moment.",
          );
          setIsVerifyingSubscription(false);
          setTimeout(() => {
            router.replace("/dashboard");
          }, 5000);
          return;
        }

        setTimeout(checkSubscription, pollInterval);
      } catch (error) {
        console.error("Error checking subscription:", error);
        setVerificationMessage(
          "Error verifying subscription. Please refresh the page.",
        );
        setIsVerifyingSubscription(false);
        setTimeout(() => {
          router.replace("/dashboard");
        }, 3000);
      }
    };

    const initialDelay = setTimeout(() => {
      checkSubscription();
    }, 500);

    return () => {
      clearTimeout(initialDelay);
    };
  }, [checkoutSuccess, router]);

  // Show verification screen while checking subscription
  if (isVerifyingSubscription) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  Completing Your Subscription
                </h2>
                <p className="text-muted-foreground">{verificationMessage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatServiceType = (type: string) => {
    const types: Record<string, string> = {
      divine_service: "Divine Service",
      midweek_lent: "Midweek Lent",
      midweek_advent: "Midweek Advent",
      festival: "Festival",
    };
    return types[type] || type;
  };

  const formatChangeType = (
    changeType: RecentStatusChange["changeType"],
  ): string => {
    const types: Record<string, string> = {
      confirmation: "Confirmation",
      baptism: "Baptism",
      transfer_in: "Transfer In",
      transfer_out: "Transfer Out",
      received: "Received",
      removed: "Removed",
    };
    return types[changeType] || changeType;
  };

  const getChangeTypeIcon = (
    changeType: RecentStatusChange["changeType"],
  ) => {
    switch (changeType) {
      case "confirmation":
        return <CheckCircle2 className="h-4 w-4" />;
      case "baptism":
        return <Cross className="h-4 w-4" />;
      case "transfer_in":
        return <UserPlus className="h-4 w-4" />;
      case "transfer_out":
        return <UserMinus className="h-4 w-4" />;
      case "received":
        return <UserPlus className="h-4 w-4" />;
      case "removed":
        return <UserMinus className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getChangeTypeColor = (
    changeType: RecentStatusChange["changeType"],
  ): string => {
    switch (changeType) {
      case "confirmation":
      case "baptism":
      case "transfer_in":
      case "received":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "transfer_out":
      case "removed":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      default:
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    }
  };

  // Trends summary calculations
  const totalServices = attendanceTrend.reduce(
    (sum, m) => sum + m.serviceCount,
    0,
  );
  const totalAttended = attendanceTrend.reduce(
    (sum, m) => sum + m.attendance * m.serviceCount,
    0,
  );
  const totalCommunion = attendanceTrend.reduce(
    (sum, m) => sum + m.communion * m.serviceCount,
    0,
  );
  const avgAttendancePerService =
    totalServices > 0 ? totalAttended / totalServices : 0;
  const communionPct =
    totalAttended > 0 ? (totalCommunion / totalAttended) * 100 : 0;
  const totalGiving = givingTrend.reduce((sum, m) => sum + m.totalAmount, 0);
  const givingMonthCount = givingTrend.length;
  const avgGivingPerMonth =
    givingMonthCount > 0 ? totalGiving / givingMonthCount : 0;

  return (
    <div className="space-y-6 -my-8 min-w-0">
      {/* Header */}
      <div className="pt-4 md:pt-8">
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Welcome to your Simple Church Tools Dashboard
        </p>
      </div>

      {/* Church Overview */}
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Church Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <>
              {church?.name && (
                <p className="text-lg font-semibold">{church.name}</p>
              )}
              {church?.denomination && (
                <p className="text-sm text-muted-foreground">
                  {church.denomination}
                </p>
              )}
              {formatAddress(church ?? {}) && (
                <p className="text-sm text-muted-foreground">
                  {formatAddress(church ?? {})}
                </p>
              )}
              {stats && (
                <p className="text-sm">
                  <span className="font-medium">Total Members:</span>{" "}
                  {stats.metrics.totalMembers} (
                  {stats.metrics.activeMembers} active,{" "}
                  {stats.metrics.inactiveMembers} inactive)
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Activity</h2>
        <div className="grid gap-6 grid-cols-1 md:grid-cols-3 min-w-0">
          {/* Recent Services Module */}
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="h-5 w-5 shrink-0" />
                <CardTitle className="truncate">Recent Services</CardTitle>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href="/attendance">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : recentServices.length > 0 ? (
                  <div className="space-y-3">
                    {recentServices.map((service) => (
                      <Link
                        key={service.serviceId}
                        href={`/attendance/service/${service.serviceId}`}
                        className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {formatServiceType(service.serviceType)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(service.serviceDate)}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-semibold text-sm">
                              {service.attendeesCount}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              attended
                            </p>
                            <p className="font-semibold text-sm mt-1">
                              {service.communionCount}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              communion
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No recent services
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Recent Membership Changes Module */}
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <Users className="h-5 w-5 shrink-0" />
                <CardTitle className="truncate">Membership Changes</CardTitle>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href="/membership">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : recentChanges.length > 0 ? (
                  <div className="space-y-3">
                    {recentChanges.map((change) => (
                      <Link
                        key={change.id}
                        href={`/membership/${change.id}`}
                        className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant="outline"
                                className={`${getChangeTypeColor(change.changeType)} text-xs`}
                              >
                                <span className="flex items-center gap-1">
                                  {getChangeTypeIcon(change.changeType)}
                                  {formatChangeType(change.changeType)}
                                </span>
                              </Badge>
                            </div>
                            <p className="font-medium text-sm truncate">
                              {change.firstName} {change.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(change.date)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No recent membership changes
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Recent Giving by Service Module */}
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <DollarSign className="h-5 w-5 shrink-0" />
                <CardTitle className="truncate">Giving by Service</CardTitle>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href="/giving">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : recentGivingByService.length > 0 ? (
                  <div className="space-y-3">
                    {recentGivingByService.map((service) => (
                      <Link
                        key={service.serviceId}
                        href={`/attendance/service/${service.serviceId}`}
                        className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">
                                {formatServiceType(service.serviceType)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(service.serviceDate)}
                              </p>
                            </div>
                            <p className="font-semibold text-sm">
                              {formatCurrency(service.totalAmount)}
                            </p>
                          </div>
                          {service.categoryTotals.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {service.categoryTotals
                                .slice(0, 3)
                                .map((category) => (
                                  <Badge
                                    key={category.categoryId}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {category.categoryName}:{" "}
                                    {formatCurrency(category.amount)}
                                  </Badge>
                                ))}
                              {service.categoryTotals.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{service.categoryTotals.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No recent giving records
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Trends Section */}
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trends
            </CardTitle>
            <CardDescription>
              Compact summary for the selected period
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select
              value={trendsDateRange}
              onValueChange={(v) => setTrendsDateRange(v as TrendsDateRange)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6months">Past 6 months</SelectItem>
                <SelectItem value="ytd">Year-to-date</SelectItem>
                <SelectItem value="3months">Past 3 months</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
            {trendsDateRange === "custom" && (
              <div className="flex gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="trends-start" className="text-xs">
                    Start
                  </Label>
                  <Input
                    id="trends-start"
                    type="date"
                    value={trendsCustomStart}
                    onChange={(e) => setTrendsCustomStart(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="trends-end" className="text-xs">
                    End
                  </Label>
                  <Input
                    id="trends-end"
                    type="date"
                    value={trendsCustomEnd}
                    onChange={(e) => setTrendsCustomEnd(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {attendanceKey && givingKey ? (
            attendanceData === undefined || givingData === undefined ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : attendanceTrend.length === 0 && givingTrend.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">
                No trend data for this period
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      Attendance
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {avgAttendancePerService.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      avg per service
                      {totalServices > 0 && ` (${totalServices} services)`}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      Giving
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {formatCurrency(totalGiving)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      total
                      {givingMonthCount > 0 &&
                        ` (avg ${formatCurrency(avgGivingPerMonth)}/mo)`}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      Communion
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {communionPct.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      of attendees
                    </p>
                  </div>
                </div>
                <div className="pt-2">
                  <Link
                    href="/analytics"
                    className="text-sm text-primary hover:underline"
                  >
                    View full analytics
                  </Link>
                </div>
              </>
            )
          ) : (
            <p className="text-center text-muted-foreground py-6">
              Select a date range to view trends
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="pb-8 md:pb-12 min-w-0">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
          <Link href="/membership">
            <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer group">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <h2 className="text-base md:text-lg font-semibold mb-1">
                  Member Directory
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground">
                  View and manage all church members, their contact information,
                  and household details.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/giving">
            <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer group">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <h2 className="text-base md:text-lg font-semibold mb-1">
                  Giving
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Track and manage all donations, including current, mission,
                  memorials, debt, school, and miscellaneous giving.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/attendance">
            <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer group">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <h2 className="text-base md:text-lg font-semibold mb-1">
                  Attendance
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Record and track member attendance for services and communion
                  participation.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/analytics">
            <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer group">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <h2 className="text-base md:text-lg font-semibold mb-1">
                  Analytics
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground">
                  View comprehensive analytics and visualizations for
                  attendance, demographics, and giving trends.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/reports">
            <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer group">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <h2 className="text-base md:text-lg font-semibold mb-1">
                  Reports
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Generate and download detailed reports for giving,
                  membership, and other church data.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/manage-admin-access">
            <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer group">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Settings className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <h2 className="text-base md:text-lg font-semibold mb-1">
                  Manage Admin Access
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Invite new administrators, view all admin users, and manage
                  access permissions for Simple Church Tools.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
