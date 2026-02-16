"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Building2 } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/pricing";
import { authClient } from "@/lib/auth-client";

export default function AddChurchPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const [formData, setFormData] = useState({
    churchName: "",
    subdomain: "",
    plan: "basic" as "basic" | "premium",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdChurch, setCreatedChurch] = useState<{ subdomain: string } | null>(null);

  // Check authentication
  useEffect(() => {
    if (!isSessionPending && !session?.user) {
      router.replace("/?login=true");
      return;
    }
  }, [session, isSessionPending, router]);

  // Pre-fill admin name/email from session
  useEffect(() => {
    if (session?.user) {
      // Form will use current user's email/name automatically in API call
    }
  }, [session]);

  // Check subdomain availability
  useEffect(() => {
    const checkSubdomain = async () => {
      if (!formData.subdomain || formData.subdomain.length < 3) {
        setSubdomainAvailable(null);
        return;
      }

      setCheckingSubdomain(true);
      try {
        const response = await fetch(
          `/api/signup/check-subdomain?subdomain=${encodeURIComponent(
            formData.subdomain
          )}`
        );
        const data = await response.json();
        setSubdomainAvailable(data.available);
      } catch (err) {
        setSubdomainAvailable(null);
      } finally {
        setCheckingSubdomain(false);
      }
    };

    const timeoutId = setTimeout(checkSubdomain, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.subdomain]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processedValue = value;

    // Normalize subdomain input
    if (name === "subdomain") {
      processedValue = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    }

    setFormData((prev) => ({ ...prev, [name]: processedValue }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validation
    if (!formData.churchName || !formData.subdomain) {
      setError("Church name and subdomain are required");
      setIsSubmitting(false);
      return;
    }

    if (formData.subdomain.length < 3) {
      setError("Subdomain must be at least 3 characters");
      setIsSubmitting(false);
      return;
    }

    if (subdomainAvailable === false) {
      setError("Subdomain is not available");
      setIsSubmitting(false);
      return;
    }

    try {
      // Call signup API - it will detect authenticated user and link church to account
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          churchName: formData.churchName,
          subdomain: formData.subdomain,
          adminName: session?.user?.name || "",
          adminEmail: session?.user?.email || "",
          adminPassword: "", // Not needed for authenticated users
          plan: formData.plan,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to create church");
      }

      // Show success and redirect
      setSuccess(true);
      setCreatedChurch({ subdomain: data.subdomain });

      // Redirect to new church's subdomain after a short delay
      setTimeout(() => {
        const baseUrl = window.location.origin;
        const isLocalhost = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");
        const isLvhMe = baseUrl.includes("lvh.me");

        let subdomainUrl: string;
        const port = window.location.port ? `:${window.location.port}` : "";
        if (isLvhMe) {
          subdomainUrl = `http://${data.subdomain}.lvh.me${port}/dashboard`;
        } else if (isLocalhost) {
          subdomainUrl = `http://${data.subdomain}.localhost${port}/dashboard`;
        } else {
          const url = new URL(baseUrl);
          const hostname = url.hostname;
          const parts = hostname.split(".");
          const rootHostname = parts.slice(-2).join(".");
          subdomainUrl = `https://${data.subdomain}.${rootHostname}${url.port ? `:${url.port}` : ""}/dashboard`;
        }

        window.location.href = subdomainUrl;
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create church");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSessionPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  if (success && createdChurch) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Church Created Successfully!
            </CardTitle>
            <CardDescription>
              Redirecting you to your new church...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your new church has been added to your account. You&apos;ll be redirected to{" "}
              <strong>{createdChurch.subdomain}.simplechurchtools.com</strong> shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Add a New Church
          </CardTitle>
          <CardDescription>
            Create a new church and add it to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="churchName">Church Name</Label>
              <Input
                id="churchName"
                name="churchName"
                type="text"
                placeholder="Good Shepherd Lutheran Church"
                value={formData.churchName}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="subdomain"
                  name="subdomain"
                  type="text"
                  placeholder="goodshepherd"
                  value={formData.subdomain}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  minLength={3}
                  maxLength={30}
                  pattern="[a-z0-9\-]+"
                  className="flex-1 h-11"
                />
                <span className="text-muted-foreground whitespace-nowrap text-sm">
                  .simplechurchtools.com
                </span>
                {formData.subdomain.length >= 3 && (
                  <div className="flex-shrink-0">
                    {checkingSubdomain ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : subdomainAvailable === true ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : subdomainAvailable === false ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : null}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Choose a unique subdomain for your church (3-30 characters, letters, numbers, and hyphens only)
              </p>
              {subdomainAvailable === false && (
                <p className="text-xs text-red-500">This subdomain is not available</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Subscription Plan</Label>
              <select
                id="plan"
                name="plan"
                value={formData.plan}
                onChange={handleChange}
                disabled={isSubmitting}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="basic">Basic - ${SUBSCRIPTION_PLANS.basic.price}/month - {SUBSCRIPTION_PLANS.basic.features[0]}</option>
                <option value="premium">Premium - ${SUBSCRIPTION_PLANS.premium.price}/month - {SUBSCRIPTION_PLANS.premium.features[0]}</option>
              </select>
            </div>

            <div className="rounded-md bg-muted p-4 text-sm">
              <p className="font-medium mb-1">Admin Account</p>
              <p className="text-muted-foreground">
                This church will be linked to your existing account ({session.user.email}). 
                You&apos;ll be set as the admin for this church.
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting || subdomainAvailable === false}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Church"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
