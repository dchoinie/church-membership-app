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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, CreditCard } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/pricing";
import { isSetupComplete } from "@/lib/setup-helpers";

interface Church {
  id: string;
  name: string;
  subdomain: string;
  subscriptionStatus: "active" | "trialing" | "past_due" | "canceled" | "unpaid";
  subscriptionPlan: "free" | "basic" | "premium";
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  denomination?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
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

export default function SetupPage() {
  const router = useRouter();
  const [church, setChurch] = useState<Church | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // Track which step we're on
  const [churchSettingsSaved, setChurchSettingsSaved] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    subscriptionPlan: "free" as "free" | "basic" | "premium",
    address: "",
    city: "",
    state: "",
    zip: "",
    denomination: "",
    otherDenomination: "",
    phone: "",
    logoUrl: "",
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
          subscriptionPlan: data.church.subscriptionPlan,
          address: data.church.address || "",
          city: data.church.city || "",
          state: data.church.state || "",
          zip: data.church.zip || "",
          denomination: data.church.denomination || "",
          otherDenomination: data.church.denomination && !DENOMINATIONS.includes(data.church.denomination as typeof DENOMINATIONS[number]) 
            ? data.church.denomination 
            : "",
          phone: data.church.phone || "",
          logoUrl: data.church.logoUrl || "",
        });
        
        // Check if church settings are already saved (has address, city, state, etc.)
        // If so, start on step 2
        const hasChurchSettings = data.church.address || data.church.city || data.church.state || 
                                  data.church.denomination || data.church.phone || data.church.logoUrl;
        if (hasChurchSettings) {
          setChurchSettingsSaved(true);
          setStep(2);
        }
        
        // Check if setup is complete - redirect to dashboard if it is
        if (isSetupComplete(data.church)) {
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
      const planConfig = SUBSCRIPTION_PLANS[formData.subscriptionPlan];
      
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

  const handleSaveSetup = async (): Promise<boolean> => {
    if (!church) return false;

    setSaving(true);
    setError(null);

    try {
      // Determine denomination value
      const denominationValue = formData.denomination === "Other" 
        ? formData.otherDenomination 
        : formData.denomination;

      const response = await fetch("/api/setup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionPlan: formData.subscriptionPlan,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          zip: formData.zip || null,
          denomination: denominationValue || null,
          phone: formData.phone || null,
          logoUrl: formData.logoUrl || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save setup");
      }

      const data = await response.json();
      setChurch(data.church);
      
      // Update form data with saved values (preserve subscriptionPlan from formData)
      setFormData({
        ...formData,
        subscriptionPlan: formData.subscriptionPlan, // Preserve user's selection
        denomination: data.church.denomination || "",
        otherDenomination: data.church.denomination && !DENOMINATIONS.includes(data.church.denomination as typeof DENOMINATIONS[number]) 
          ? data.church.denomination 
          : "",
        phone: data.church.phone || "",
        logoUrl: data.church.logoUrl || "",
      });
      
      // Mark church settings as saved and advance to step 2 (only if we're on step 1)
      if (step === 1) {
        setChurchSettingsSaved(true);
        setStep(2);
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save setup");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleActivateFree = async () => {
    // Save setup first, then activate
    const saved = await handleSaveSetup();
    if (!saved) return; // Don't proceed if save failed
    
    setSaving(true);
    setError(null);

    try {
      // Call API to activate free plan
      const response = await fetch("/api/setup/activate-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to activate free plan");
      }

      const data = await response.json();
      
      // Update church state with activated subscription
      setChurch(data.church);
      
      // Redirect to dashboard after successful activation
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate free plan");
      setSaving(false);
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
    // Don't return null - show loading state instead
    // Returning null can cause Next.js to redirect away
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading church data...</span>
      </div>
    );
  }

  const isFreePlan = formData.subscriptionPlan === "free";

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {step === 1 ? "Step 1: Church Information" : "Step 2: Activate Your Subscription"}
          </CardTitle>
          <CardDescription>
            {step === 1 
              ? "Enter your church details to get started"
              : "Select your subscription plan and complete payment to activate your account"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 ? (
            /* Step 1: Church Details Form */
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSaveSetup(); }}>
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Church Information</h3>
                
                {/* Church Name - Not Editable */}
                <div className="space-y-2">
                  <Label htmlFor="churchName">Church Name</Label>
                  <Input
                    id="churchName"
                    value={church.name}
                    disabled
                    className="bg-muted"
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

                {/* Logo URL */}
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Church Logo URL</Label>
                  <Input
                    id="logoUrl"
                    type="url"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a URL to your church logo image. The image should be publicly accessible.
                  </p>
                  {formData.logoUrl && (
                    <div className="mt-2">
                      <img 
                        src={formData.logoUrl} 
                        alt="Logo preview" 
                        className="max-w-[200px] max-h-[100px] object-contain border rounded p-2"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Subdomain Info */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div>
                  <span className="text-sm text-muted-foreground">Subdomain:</span>
                  <p className="font-medium">{church.subdomain}.simplechurchtools.com</p>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  {error}
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
                    "Save Church Settings"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            /* Step 2: Subscription Activation */
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Select Your Subscription Plan</h3>
                
                {/* Subscription Plan Selection */}
                <div className="space-y-2">
                  <Label htmlFor="subscriptionPlan">Subscription Plan</Label>
                  <Select
                    value={formData.subscriptionPlan}
                    onValueChange={(value: "free" | "basic" | "premium") => 
                      setFormData({ ...formData, subscriptionPlan: value })
                    }
                  >
                    <SelectTrigger id="subscriptionPlan" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free - ${SUBSCRIPTION_PLANS.free.price}/month</SelectItem>
                      <SelectItem value="basic">Basic - ${SUBSCRIPTION_PLANS.basic.price}/month</SelectItem>
                      <SelectItem value="premium">Premium - ${SUBSCRIPTION_PLANS.premium.price}/month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Plan Details */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{SUBSCRIPTION_PLANS[formData.subscriptionPlan].name} Plan</span>
                    <span className="text-lg font-bold">${SUBSCRIPTION_PLANS[formData.subscriptionPlan].price}/month</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {SUBSCRIPTION_PLANS[formData.subscriptionPlan].features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {isFreePlan ? (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Your free plan is ready to activate. Click the button below to get started.
                    </p>
                    <Button
                      onClick={handleActivateFree}
                      className="w-full"
                      size="lg"
                      disabled={saving}
                    >
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Activate Free Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Click the button below to securely enter your payment information and activate your {SUBSCRIPTION_PLANS[formData.subscriptionPlan].name} plan.
                    </p>
                    <Button
                      onClick={async () => {
                        // Update subscription plan in settings first
                        const saved = await handleSaveSetup();
                        if (saved) {
                          handleCheckout();
                        }
                      }}
                      disabled={isCreatingCheckout || saving}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

