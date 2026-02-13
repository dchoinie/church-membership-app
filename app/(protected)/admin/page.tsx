"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Building2,
  Users,
  AlertTriangle,
  TrendingUp,
  LayoutDashboard,
} from "lucide-react";

interface DashboardStats {
  totalChurches: number;
  totalMembers: number;
  churchesWithIssues: number;
}

interface ChurchNeedingAttention {
  id: string;
  name: string;
  subdomain: string;
  subscriptionStatus: string;
  isRecentlyCanceled?: boolean;
}

interface RecentChurch {
  id: string;
  name: string;
  subdomain: string;
  createdAt: string;
}

interface DashboardData {
  stats: DashboardStats;
  churchesNeedingAttention: ChurchNeedingAttention[];
  recentChurches: RecentChurch[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/dashboard");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard");
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { stats, churchesNeedingAttention, recentChurches } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview for client debugging and support
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Churches
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalChurches}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Members
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Churches with Issues
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.churchesWithIssues}</div>
            <p className="text-xs text-muted-foreground mt-1">
              past_due, canceled, or unpaid
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/churches">
              <Button variant="outline">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                View All Churches
              </Button>
            </Link>
            <Button variant="ghost" disabled>
              Create super admin: npm run create-super-admin
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Churches Needing Attention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Churches Needing Attention
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Past due, canceled, or unpaid subscriptions
          </p>
        </CardHeader>
        <CardContent>
          {churchesNeedingAttention.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No churches need attention at this time.
            </p>
          ) : (
            <div className="space-y-2">
              {churchesNeedingAttention.map((church) => (
                <Link
                  key={church.id}
                  href={`/admin/churches/${church.id}`}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{church.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {church.subdomain}.simplechurchtools.com
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        ["past_due", "canceled", "unpaid"].includes(
                          church.subscriptionStatus
                        )
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {church.subscriptionStatus}
                    </Badge>
                    {church.isRecentlyCanceled && (
                      <Badge variant="secondary">Canceled recently</Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Signups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Signups (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentChurches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No new churches in the last 7 days.
            </p>
          ) : (
            <div className="space-y-2">
              {recentChurches.map((church) => (
                <Link
                  key={church.id}
                  href={`/admin/churches/${church.id}`}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{church.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {church.subdomain}.simplechurchtools.com
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(church.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
