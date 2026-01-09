"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CheckCircle2, CreditCard } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/pricing";

interface Church {
  id: string;
  name: string;
  subdomain: string;
  subscriptionStatus: "active" | "trialing" | "past_due" | "canceled" | "unpaid";
  subscriptionPlan: "free" | "basic" | "premium";
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
}

export default function SetupPage() {
  const router = useRouter();
  const [church, setChurch] = useState<Church | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

  useEffect(() => {
    const fetchChurch = async () => {
      try {
        const response = await fetch("/api/church");
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch church data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setChurch(data.church);
        
        // Check if subscription is active
        const hasActiveSubscription = 
          data.church.subscriptionStatus === "active" ||
          (data.church.subscriptionStatus === "trialing" && data.church.stripeSubscriptionId);
        
        if (hasActiveSubscription) {
          // Redirect to dashboard if subscription is active
          router.push("/dashboard");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load church data");
      } finally {
        setLoading(false);
      }
    };

    fetchChurch();
  }, [router]);

  const handleCheckout = async () => {
    if (!church) return;

    setIsCreatingCheckout(true);
    setError(null);

    try {
      const planConfig = SUBSCRIPTION_PLANS[church.subscriptionPlan];
      
      if (!planConfig.priceId) {
        throw new Error("Invalid subscription plan");
      }

      // Create checkout session
      const baseUrl = window.location.origin;
      const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
      
      let successUrl: string;
      if (isLocalhost) {
        const port = window.location.port ? `:${window.location.port}` : '';
        successUrl = `http://${church.subdomain}.localhost${port}/dashboard?checkout=success`;
      } else {
        successUrl = `${baseUrl.replace(/^https?:\/\//, `https://${church.subdomain}.`)}/dashboard?checkout=success`;
      }
      
      const cancelUrl = `${baseUrl}/setup`;

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: church.stripeCustomerId,
          priceId: planConfig.priceId,
          churchId: church.id,
          successUrl,
          cancelUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create checkout session");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
      setIsCreatingCheckout(false);
    }
  };

  const handleActivateFree = async () => {
    // For free plan, we just need to mark it as active
    // This could be done via an API call if needed
    // For now, redirect to dashboard since free plan doesn't need payment
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !church) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!church) {
    // Don't return null - show loading state instead
    // Returning null can cause Next.js to redirect away
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading church data...</span>
      </div>
    );
  }

  const planConfig = SUBSCRIPTION_PLANS[church.subscriptionPlan];
  const isFreePlan = church.subscriptionPlan === "free";

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Church Setup</CardTitle>
          <CardDescription>
            Finish setting up your church account to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Church Details */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold text-lg">Church Details</h3>
            <div className="grid gap-2">
              <div>
                <span className="text-sm text-muted-foreground">Church Name:</span>
                <p className="font-medium">{church.name}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Subdomain:</span>
                <p className="font-medium">{church.subdomain}.simplechurchtools.com</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Selected Plan:</span>
                <p className="font-medium">{planConfig.name}</p>
              </div>
            </div>
          </div>

          {/* Subscription Activation */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Activate Your Subscription</h3>
            
            {isFreePlan ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Your free plan is ready to activate. Click the button below to get started.
                </p>
                <Button
                  onClick={handleActivateFree}
                  className="w-full"
                  size="lg"
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Activate Free Account
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Complete your subscription setup to activate your {planConfig.name} plan.
                </p>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{planConfig.name} Plan</span>
                    <span className="text-lg font-bold">${planConfig.price}/month</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {planConfig.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                    {error}
                  </div>
                )}
                <Button
                  onClick={handleCheckout}
                  disabled={isCreatingCheckout}
                  className="w-full"
                  size="lg"
                >
                  {isCreatingCheckout ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" />
                      Complete Subscription Setup
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

