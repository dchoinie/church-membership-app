"use client";

import { useEffect, useState } from "react";
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
  TrendingUp,
  Activity,
  UserPlus,
  UserMinus,
  Cross,
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { isSetupComplete } from "@/lib/setup-helpers";
import { Badge } from "@/components/ui/badge";

interface Church {
  subscriptionStatus: "active" | "past_due" | "canceled" | "unpaid";
  stripeSubscriptionId: string | null;
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

  // Dashboard data state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentChanges, setRecentChanges] = useState<RecentStatusChange[]>([]);
  const [recentServices, setRecentServices] = useState<RecentService[]>([]);
  const [recentGivingByService, setRecentGivingByService] = useState<
    RecentGivingByService[]
  >([]);
  const [loading, setLoading] = useState(true);

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
        const church: Church = data.church;

        if (isSetupComplete(church)) {
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

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [
          statsResponse,
          changesResponse,
          servicesResponse,
          givingByServiceResponse,
        ] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/dashboard/recent-status-changes"),
          fetch("/api/dashboard/recent-services"),
          fetch("/api/dashboard/recent-giving-by-service"),
        ]);

        if (statsResponse.ok) {
          const data = await statsResponse.json();
          setStats(data);
        }

        if (changesResponse.ok) {
          const data = await changesResponse.json();
          setRecentChanges(data.changes || []);
        }

        if (servicesResponse.ok) {
          const data = await servicesResponse.json();
          setRecentServices(data.services || []);
        }

        if (givingByServiceResponse.ok) {
          const data = await givingByServiceResponse.json();
          setRecentGivingByService(data.services || []);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!isVerifyingSubscription) {
      fetchDashboardData();
    }
  }, [isVerifyingSubscription]);

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

  return (
    <div className="space-y-6 -my-8">
      {/* Header */}
      <div className="pt-4 md:pt-8">
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Welcome to your Simple Church Tools Dashboard
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Members */}
        <Link href="/membership">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  {stats?.metrics.totalMembers || 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.metrics.activeMembers || 0} active,{" "}
                {stats?.metrics.inactiveMembers || 0} inactive
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* This Month's Giving */}
        <Link href="/giving">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                This Month&apos;s Giving
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.metrics.thisMonthGiving || 0)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Year to date: {formatCurrency(stats?.metrics.thisYearGiving || 0)}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Recent Services */}
        <Link href="/attendance">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Services</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  {stats?.metrics.recentServicesCount || 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Services in the last 30 days
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Average Attendance */}
        <Link href="/attendance">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Attendance
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  {Math.round(stats?.metrics.averageAttendance || 0)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Per service (last 6 months)
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* This Year's Giving */}
        <Link href="/giving">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                This Year&apos;s Giving
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.metrics.thisYearGiving || 0)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Total giving this year
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Active Members */}
        <Link href="/membership">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Members</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  {stats?.metrics.activeMembers || 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.metrics.totalMembers
                  ? Math.round(
                      ((stats.metrics.activeMembers || 0) /
                        stats.metrics.totalMembers) *
                        100,
                    )
                  : 0}
                % of total members
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Modules */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {/* Recent Services Module */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <CardTitle>Recent Services</CardTitle>
            </div>
            <Button asChild variant="outline" size="sm">
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Membership Changes</CardTitle>
            </div>
            <Button asChild variant="outline" size="sm">
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              <CardTitle>Giving by Service</CardTitle>
            </div>
            <Button asChild variant="outline" size="sm">
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

      {/* Attendance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Monthly Attendance Trend
          </CardTitle>
          <CardDescription>Average per service (last 6 months)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : stats?.trends.monthlyAttendance.length ? (
            <ChartContainer
              config={{
                average: {
                  label: "Average Attendance",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[250px]"
            >
              <LineChart data={stats.trends.monthlyAttendance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        `${Number(value).toFixed(1)} people`
                      }
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="average"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No attendance data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="pb-8 md:pb-12">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
                <h2 className="text-base md:text-lg font-semibold mb-1">Giving</h2>
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
                <h2 className="text-base md:text-lg font-semibold mb-1">Reports</h2>
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
