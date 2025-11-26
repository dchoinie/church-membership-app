"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatusChange {
  id: string;
  firstName: string;
  lastName: string;
  type: "transferred" | "new";
  date: string | null;
  householdName: string | null;
}

interface RecentGiving {
  id: string;
  dateGiven: string;
  householdName: string;
}

export default function Dashboard() {
  const [statusChanges, setStatusChanges] = useState<StatusChange[]>([]);
  const [recentGiving, setRecentGiving] = useState<RecentGiving[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statusResponse, givingResponse] = await Promise.all([
          fetch("/api/dashboard/recent-status-changes"),
          fetch("/api/dashboard/recent-giving"),
        ]);

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setStatusChanges(statusData.changes || []);
        }

        if (givingResponse.ok) {
          const givingData = await givingResponse.json();
          setRecentGiving(givingData.giving || []);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to Good Shepherd Church Admin Dashboard
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/membership" className="rounded-lg border bg-card p-6 hover:bg-accent transition-colors">
          <h2 className="text-lg font-semibold">Member Directory</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Manage church members and their information
          </p>
        </Link>
        <Link href="/giving" className="rounded-lg border bg-card p-6 hover:bg-accent transition-colors">
          <h2 className="text-lg font-semibold">Giving</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Manage donations and giving records
          </p>
        </Link>
        <Link href="/reports" className="rounded-lg border bg-card p-6 hover:bg-accent transition-colors">
          <h2 className="text-lg font-semibold">Reports</h2>
          <p className="text-sm text-muted-foreground mt-2">
            View and generate reports
          </p>
        </Link>
      </div>

      {/* Widgets */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Member Status Changes */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Member Status Changes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading...
              </div>
            ) : statusChanges.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No recent status changes
              </div>
            ) : (
              <div className="space-y-3">
                {statusChanges.map((change) => (
                  <div
                    key={change.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {change.firstName} {change.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {change.type === "transferred" ? (
                          <span className="text-orange-600">Transferred</span>
                        ) : (
                          <span className="text-green-600">New Member</span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(change.date)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Giving */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Giving</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading...
              </div>
            ) : recentGiving.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No recent giving records
              </div>
            ) : (
              <div className="space-y-3">
                {recentGiving.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                  >
                    <div className="font-medium">{record.householdName}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(record.dateGiven)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

