"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChurch } from "@/lib/hooks/use-church";
import { apiFetch } from "@/lib/api-client";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, CreditCard, Settings as SettingsIcon, AlertCircle } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/pricing";
import { usePermissions } from "@/lib/hooks/use-permissions";

interface Church {
  id: string;
  name: string;
  subdomain: string;
  subscriptionStatus: "active" | "past_due" | "canceled" | "unpaid";
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
  taxId?: string | null;
  is501c3?: boolean | null;
  taxStatementDisclaimer?: string | null;
  goodsServicesProvided?: boolean | null;
  goodsServicesStatement?: string | null;
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
  const router = useRouter();
  const { canManageUsers, isLoading: permissionsLoading } = usePermissions();
  const { church, isLoading: loading, error: churchError, mutate: mutateChurch } = useChurch();
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
    taxId: "",
    is501c3: true,
    taxStatementDisclaimer: "",
    goodsServicesProvided: false,
    goodsServicesStatement: "",
  });

  // Redirect viewers away from settings page
  useEffect(() => {
    if (!permissionsLoading && !canManageUsers) {
      router.push("/dashboard");
    }
  }, [canManageUsers, permissionsLoading, router]);

  useEffect(() => {
    if (church) {
      setFormData({
        phone: church.phone || "",
        email: church.email || "",
        address: church.address || "",
        city: church.city || "",
        state: church.state || "",
        zip: church.zip || "",
        denomination: church.denomination || "",
        otherDenomination: church.denomination && !DENOMINATIONS.includes(church.denomination as typeof DENOMINATIONS[number])
          ? church.denomination
          : "",
        taxId: church.taxId || "",
        is501c3: church.is501c3 ?? true,
        taxStatementDisclaimer: church.taxStatementDisclaimer || "",
        goodsServicesProvided: church.goodsServicesProvided ?? false,
        goodsServicesStatement: church.goodsServicesStatement || "",
      });
    }
  }, [church]);

  useEffect(() => {
    if (churchError) {
      setError(churchError.message || "Failed to load church data");
    }
  }, [churchError]);

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

      const response = await apiFetch("/api/church/settings", {
        method: "PUT",
        body: JSON.stringify({
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          zip: formData.zip || null,
          denomination: denominationValue || null,
          taxId: formData.taxId || null,
          is501c3: formData.is501c3,
          taxStatementDisclaimer: formData.taxStatementDisclaimer || null,
          goodsServicesProvided: formData.goodsServicesProvided,
          goodsServicesStatement: formData.goodsServicesStatement || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      const data = await response.json();
      mutateChurch(data.church);
      
      // Update form data with saved values
      setFormData({
        ...formData,
        denomination: data.church.denomination || "",
        otherDenomination: data.church.denomination && !DENOMINATIONS.includes(data.church.denomination as typeof DENOMINATIONS[number]) 
          ? data.church.denomination 
          : "",
        taxId: data.church.taxId || "",
        is501c3: data.church.is501c3 ?? true,
        taxStatementDisclaimer: data.church.taxStatementDisclaimer || "",
        goodsServicesProvided: data.church.goodsServicesProvided ?? false,
        goodsServicesStatement: data.church.goodsServicesStatement || "",
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
        // Extract root domain (remove any existing subdomain like 'www')
        const url = new URL(baseUrl);
        const hostname = url.hostname;
        const parts = hostname.split('.');
        // Get root domain (last 2 parts: domain.com)
        const rootHostname = parts.slice(-2).join('.');
        successUrl = `https://${church.subdomain}.${rootHostname}${url.port ? `:${url.port}` : ''}/settings?checkout=success`;
      }
      
      const cancelUrl = `${baseUrl}/settings`;

      const response = await apiFetch("/api/stripe/create-checkout", {
        method: "POST",
        body: JSON.stringify({
          customerId: church.stripeCustomerId,
          plan: targetPlan, // Send target plan (opposite of current)
          churchId: church.id,
          successUrl,
          cancelUrl,
          allowPromotionCodes: true, // Enable promotion code field in checkout
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

  // Show loading while checking permissions
  if (permissionsLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Don't render page content for viewers (they'll be redirected)
  if (!canManageUsers) {
    return null;
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

  const hasActiveSubscription = church.subscriptionStatus === "active";
  
  // Show upgrade button if user has a subscription (regardless of status)
  // This allows managing subscriptions even if status is "unpaid" (e.g., after promo code application)
  const canManageSubscription = church.stripeSubscriptionId !== null;

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          Church Settings
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
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

                {/* Tax Information Section */}
                <div className="pt-6 border-t space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Tax Information</h3>
                    <p className="text-sm text-muted-foreground">
                      Required for generating IRS-compliant year-end giving statements
                    </p>
                  </div>

                  {/* Tax ID / EIN */}
                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID / EIN</Label>
                    <Input
                      id="taxId"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      placeholder="XX-XXXXXXX"
                      maxLength={10}
                    />
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Required by IRS for year-end tax statements. Format: XX-XXXXXXX
                    </p>
                  </div>

                  {/* 501(c)(3) Status */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="is501c3">501(c)(3) Tax-Exempt Status</Label>
                        <p className="text-xs text-muted-foreground">
                          Indicates if your church is recognized as tax-exempt
                        </p>
                      </div>
                      <Switch
                        id="is501c3"
                        checked={formData.is501c3}
                        onCheckedChange={(checked) => setFormData({ ...formData, is501c3: checked })}
                      />
                    </div>
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Required by IRS for donors to claim tax deductions
                    </p>
                  </div>

                  {/* Tax Statement Disclaimer */}
                  <div className="space-y-2">
                    <Label htmlFor="taxStatementDisclaimer">Tax Statement Disclaimer</Label>
                    <Textarea
                      id="taxStatementDisclaimer"
                      value={formData.taxStatementDisclaimer}
                      onChange={(e) => setFormData({ ...formData, taxStatementDisclaimer: e.target.value })}
                      placeholder="This letter acknowledges that [Church Name] is a tax-exempt organization under Section 501(c)(3) of the Internal Revenue Code. No goods or services were provided in exchange for your contributions, except for intangible religious benefits."
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Legal statement that appears on giving statements
                    </p>
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Required by IRS to confirm tax-exempt status and goods/services disclosure
                    </p>
                  </div>

                  {/* Goods/Services Provided */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="goodsServicesProvided">Goods or Services Provided</Label>
                        <p className="text-xs text-muted-foreground">
                          Did donors receive anything of value in exchange for contributions?
                        </p>
                      </div>
                      <Switch
                        id="goodsServicesProvided"
                        checked={formData.goodsServicesProvided}
                        onCheckedChange={(checked) => setFormData({ ...formData, goodsServicesProvided: checked })}
                      />
                    </div>
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Required disclosure by IRS (typically &quot;No&quot; for most churches)
                    </p>
                  </div>

                  {/* Goods/Services Statement (conditional) */}
                  {formData.goodsServicesProvided && (
                    <div className="space-y-2">
                      <Label htmlFor="goodsServicesStatement">Goods/Services Statement</Label>
                      <Textarea
                        id="goodsServicesStatement"
                        value={formData.goodsServicesStatement}
                        onChange={(e) => setFormData({ ...formData, goodsServicesStatement: e.target.value })}
                        placeholder="Describe the goods or services provided and their estimated fair market value..."
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Describe what donors received and the estimated value
                      </p>
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Required by IRS if goods/services were provided
                      </p>
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

            {canManageSubscription && (
              <div className="space-y-2">
                {hasActiveSubscription && church.subscriptionPlan === "premium" && (
                  <div className="rounded-md bg-blue-500/10 p-3 text-sm text-blue-600 border border-blue-500/20">
                    <p className="font-medium mb-1">Downgrade Notice</p>
                    <p>
                      Your subscription will be downgraded to the Basic plan at the end of your current billing cycle. 
                      You&apos;ll continue to have access to Premium features until then.
                    </p>
                  </div>
                )}
                {church.subscriptionStatus === "unpaid" && church.stripeSubscriptionId && (
                  <div className="rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-600 border border-yellow-500/20">
                    <p className="font-medium mb-1">Subscription Status: Unpaid</p>
                    <p>
                      Your subscription is currently unpaid. You can upgrade or manage your subscription below.
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
