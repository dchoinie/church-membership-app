"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Users, DollarSign, Calendar, BarChart3, FileText, Settings, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { isSetupComplete } from "@/lib/setup-helpers";

interface Church {
  subscriptionStatus: "active" | "past_due" | "canceled" | "unpaid";
  stripeSubscriptionId: string | null;
}

export default function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const checkoutSuccess = searchParams.get("checkout");
  const [isVerifyingSubscription, setIsVerifyingSubscription] = useState(checkoutSuccess === "success");
  const [verificationMessage, setVerificationMessage] = useState("Processing your subscription...");

  // Handle checkout success - poll for subscription update
  useEffect(() => {
    if (checkoutSuccess !== "success") {
      return;
    }

    let pollCount = 0;
    const maxPolls = 20; // Poll for up to 20 seconds (20 * 1 second intervals)
    const pollInterval = 1000; // Poll every 1 second

    const checkSubscription = async () => {
      try {
        const response = await fetch("/api/church");
        if (!response.ok) {
          throw new Error("Failed to fetch church data");
        }

        const data = await response.json();
        const church: Church = data.church;

        // Check if subscription is now active
        if (isSetupComplete(church)) {
          setVerificationMessage("Subscription activated successfully!");
          
          // Wait a moment to show success message, then remove query param
          setTimeout(() => {
            router.replace("/dashboard");
            setIsVerifyingSubscription(false);
          }, 1500);
          return;
        }

        pollCount++;
        if (pollCount >= maxPolls) {
          // Timeout - subscription might not have been updated yet
          setVerificationMessage("Subscription is being processed. Please refresh the page in a moment.");
          setIsVerifyingSubscription(false);
          // Remove query param after showing message
          setTimeout(() => {
            router.replace("/dashboard");
          }, 5000);
          return;
        }

        // Continue polling
        setTimeout(checkSubscription, pollInterval);
      } catch (error) {
        console.error("Error checking subscription:", error);
        setVerificationMessage("Error verifying subscription. Please refresh the page.");
        setIsVerifyingSubscription(false);
        setTimeout(() => {
          router.replace("/dashboard");
        }, 3000);
      }
    };

    // Start polling after a short delay to give webhook time to process
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
                <h2 className="text-xl font-semibold mb-2">Completing Your Subscription</h2>
                <p className="text-muted-foreground">{verificationMessage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="md:h-[calc(100vh-4rem)] md:flex md:flex-col -my-8">
      <div className="md:shrink-0 pb-4 md:pb-6 pt-4 md:pt-8">
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Welcome to your Simple Church Tools Dashboard
        </p>
      </div>

      {/* Quick Links */}
      <div className="md:flex-1 grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3 md:min-h-0 pb-4 md:pb-8">
        <Link href="/membership">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer group">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Users className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold mb-2">Member Directory</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                View and manage all church members, their contact information, and household details.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/giving">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer group">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold mb-2">Giving</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                Track and manage all donations, including current, mission, memorials, debt, school, and miscellaneous giving.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/attendance">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer group">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Calendar className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold mb-2">Attendance</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                Record and track member attendance for services and communion participation.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/analytics">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer group">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold mb-2">Analytics</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                View comprehensive analytics and visualizations for attendance, demographics, and giving trends.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/reports">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer group">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold mb-2">Reports</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                Generate and download detailed reports for giving, membership, and other church data.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/manage-admin-access">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer group">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Settings className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold mb-2">Manage Admin Access</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                Invite new administrators, view all admin users, and manage access permissions for Simple Church Tools.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

