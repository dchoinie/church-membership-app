"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, CreditCard, Settings as SettingsIcon } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/pricing";

interface Church {
  id: string;
  name: string;
  subdomain: string;
  subscriptionStatus: "active" | "trialing" | "past_due" | "canceled" | "unpaid";
  subscriptionPlan: "basic" | "premium";
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  denomination?: string | null;
  phone?: string | null;
  email?: string | null;
}

const DENOMINATIONS = [
  "Catholic",
  "Non-Denominational",
  "Baptist",
  "Methodist",
  "ELCA",
  "LCMS",
  "WELS",
  "Anglican",
  "Episcopal",
  "Presbyterian",
  "ELS",
  "NALC",
  "LCMC",
  "Other",
] as const;

export default function SettingsPage() {
  const [church, setChurch] = useState<Church | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    denomination: "",
    otherDenomination: "",
  });

  useEffect(() => {
    const fetchChurch = async () => {
      try {
        const response = await fetch("/api/church");
        
        if (!response.ok) {
          throw new Error(`Failed to fetch church data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setChurch(data.church);
        
        // Pre-fill form with existing data
        setFormData({
          phone: data.church.phone || "",
          email: data.church.email || "",
          address: data.church.address || "",
          city: data.church.city || "",
          state: data.church.state || "",
          zip: data.church.zip || "",
          denomination: data.church.denomination || "",
          otherDenomination: data.church.denomination && !DENOMINATIONS.includes(data.church.denomination as typeof DENOMINATIONS[number]) 
            ? data.church.denomination 
            : "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load church data");
      } finally {
        setLoading(false);
      }
    };

    fetchChurch();
  }, []);

  const handleSaveSettings = async () => {
    if (!church) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Determine denomination value
      const denominationValue = formData.denomination === "Other" 
        ? formData.otherDenomination 
        : formData.denomination;

      const response = await fetch("/api/church/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          zip: formData.zip || null,
          denomination: denominationValue || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      const data = await response.json();
      setChurch(data.church);
      
      // Update form data with saved values
      setFormData({
        ...formData,
        denomination: data.church.denomination || "",
        otherDenomination: data.church.denomination && !DENOMINATIONS.includes(data.church.denomination as typeof DENOMINATIONS[number]) 
          ? data.church.denomination 
          : "",
      });
      
      setSuccess("Settings saved successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePlan = async () => {
    if (!church) return;

    setIsCreatingCheckout(true);
    setError(null);

    try {
      // Determine target plan (opposite of current plan)
      const targetPlan: "basic" | "premium" = church.subscriptionPlan === "basic" ? "premium" : "basic";
      const planConfig = SUBSCRIPTION_PLANS[targetPlan];
      
      if (!planConfig.priceId) {
        throw new Error("Invalid subscription plan");
      }

      // Create checkout session for plan change
      const baseUrl = window.location.origin;
      const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
      
      let successUrl: string;
      if (isLocalhost) {
        const port = window.location.port ? `:${window.location.port}` : '';
        successUrl = `http://${church.subdomain}.localhost${port}/settings?checkout=success`;
      } else {
        successUrl = `${baseUrl.replace(/^https?:\/\//, `https://${church.subdomain}.`)}/settings?checkout=success`;
      }
      
      const cancelUrl = `${baseUrl}/settings`;

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: church.stripeCustomerId,
          plan: targetPlan, // Send target plan (opposite of current)
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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading church data...</span>
      </div>
    );
  }

  const hasActiveSubscription = 
    church.subscriptionStatus === "active" ||
    (church.subscriptionStatus === "trialing" && church.stripeSubscriptionId !== null);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          Church Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your church information and subscription
        </p>
      </div>

      <div className="space-y-6">
        {/* Church Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Church Information</CardTitle>
            <CardDescription>
              Update your church contact information and details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSaveSettings(); }}>
              <div className="space-y-4">
                {/* Church Name - Read Only */}
                <div className="space-y-2">
                  <Label htmlFor="churchName">Church Name</Label>
                  <Input
                    id="churchName"
                    value={church.name}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Church name cannot be changed after creation
                  </p>
                </div>

                {/* Subdomain - Read Only */}
                <div className="space-y-2">
                  <Label htmlFor="subdomain">Subdomain</Label>
                  <Input
                    id="subdomain"
                    value={`${church.subdomain}.simplechurchtools.com`}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Subdomain cannot be changed after creation
                  </p>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="church@example.com"
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street address"
                  />
                </div>

                {/* City, State, Zip */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="State"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      value={formData.zip}
                      onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                      placeholder="ZIP"
                    />
                  </div>
                </div>

                {/* Denomination */}
                <div className="space-y-2">
                  <Label htmlFor="denomination">Denomination</Label>
                  <Select
                    value={formData.denomination}
                    onValueChange={(value) => 
                      setFormData({ ...formData, denomination: value, otherDenomination: value === "Other" ? formData.otherDenomination : "" })
                    }
                  >
                    <SelectTrigger id="denomination" className="w-full">
                      <SelectValue placeholder="Select denomination" />
                    </SelectTrigger>
                    <SelectContent>
                      {DENOMINATIONS.map((denom) => (
                        <SelectItem key={denom} value={denom}>
                          {denom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.denomination === "Other" && (
                    <div className="mt-2">
                      <Input
                        id="otherDenomination"
                        value={formData.otherDenomination}
                        onChange={(e) => setFormData({ ...formData, otherDenomination: e.target.value })}
                        placeholder="Enter denomination name"
                      />
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 border border-green-500/20">
                  {success}
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>
              Manage your subscription plan and billing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium">{SUBSCRIPTION_PLANS[church.subscriptionPlan].name} Plan</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    hasActiveSubscription 
                      ? "bg-green-500/10 text-green-600 border border-green-500/20"
                      : "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
                  }`}>
                    {church.subscriptionStatus === "active" ? "Active" : 
                     church.subscriptionStatus === "trialing" ? "Trialing" : 
                     church.subscriptionStatus}
                  </span>
                </div>
                <span className="text-lg font-bold">
                  ${SUBSCRIPTION_PLANS[church.subscriptionPlan].price}/month
                </span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 mt-3">
                {SUBSCRIPTION_PLANS[church.subscriptionPlan].features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {hasActiveSubscription && (
              <div className="space-y-2">
                {church.subscriptionPlan === "premium" && (
                  <div className="rounded-md bg-blue-500/10 p-3 text-sm text-blue-600 border border-blue-500/20">
                    <p className="font-medium mb-1">Downgrade Notice</p>
                    <p>
                      Your subscription will be downgraded to the Basic plan at the end of your current billing cycle. 
                      You'll continue to have access to Premium features until then.
                    </p>
                  </div>
                )}
                <Button
                  variant={church.subscriptionPlan === "basic" ? "default" : "outline"}
                  onClick={handleChangePlan}
                  disabled={isCreatingCheckout}
                >
                  {isCreatingCheckout ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      {church.subscriptionPlan === "basic" ? "Upgrade to Premium" : "Downgrade to Basic"}
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
