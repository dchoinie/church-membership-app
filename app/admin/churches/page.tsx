"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Users, Calendar } from "lucide-react";

interface Church {
  id: string;
  name: string;
  subdomain: string;
  email: string | null;
  subscriptionStatus: string;
  subscriptionPlan: string;
  trialEndsAt: string | null;
  createdAt: string;
  memberCount: number;
}

export default function AdminChurchesPage() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChurches();
  }, []);

  const fetchChurches = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/churches");
      if (!response.ok) {
        throw new Error("Failed to fetch churches");
      }
      const data = await response.json();
      setChurches(data.churches);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load churches");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      trialing: "secondary",
      canceled: "destructive",
      past_due: "destructive",
      unpaid: "destructive",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Churches</h1>
        <p className="text-muted-foreground mt-2">
          Manage all churches in the system
        </p>
      </div>

      <div className="grid gap-4">
        {churches.map((church) => (
          <Card key={church.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <Building2 className="h-6 w-6 text-muted-foreground mt-1" />
                  <div>
                    <CardTitle className="text-xl">{church.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {church.subdomain}.yourapp.com
                    </p>
                    {church.email && (
                      <p className="text-sm text-muted-foreground">
                        {church.email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(church.subscriptionStatus)}
                  <Badge variant="outline">{church.subscriptionPlan}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{church.memberCount} members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Created {new Date(church.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Link href={`/admin/churches/${church.id}`}>
                  <Button variant="outline">View Details</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {churches.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No churches found
          </CardContent>
        </Card>
      )}
    </div>
  );
}

