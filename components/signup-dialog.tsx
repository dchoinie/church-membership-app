"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Loader2, Shield, Mail } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/pricing";

interface SignupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignupDialog({ open, onOpenChange }: SignupDialogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    churchName: "",
    subdomain: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    plan: "basic",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(
    null
  );
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupData, setSignupData] = useState<{ subdomain: string } | null>(null);

  // Check for error/cancel params
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const canceled = searchParams.get("canceled");
    if (errorParam === "church_not_found") {
      setError("Church not found. Please sign up to create your church.");
    } else if (canceled) {
      setError("Subscription setup was canceled. You can complete it later in settings.");
    }
  }, [searchParams]);

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
    if (
      !formData.churchName ||
      !formData.subdomain ||
      !formData.adminName ||
      !formData.adminEmail ||
      !formData.adminPassword
    ) {
      setError("All fields are required");
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

    if (formData.adminPassword.length < 8) {
      setError("Password must be at least 8 characters");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include", // Ensure cookies are included
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create church");
      }

      // Show success message - user must verify email before signing in
      setSignupSuccess(true);
      setSignupData({ subdomain: data.subdomain });
      setIsSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create church");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create Your Church</DialogTitle>
          <DialogDescription>
            Sign up to get started with Simple Church Tools
          </DialogDescription>
        </DialogHeader>
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
                pattern="[a-z0-9-]+"
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

          <div className="border-t pt-5 mt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Admin Account
            </h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminName">Your Name</Label>
            <Input
              id="adminName"
              name="adminName"
              type="text"
              placeholder="John Doe"
              value={formData.adminName}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminEmail">Email Address</Label>
            <Input
              id="adminEmail"
              name="adminEmail"
              type="email"
              placeholder="admin@example.com"
              value={formData.adminEmail}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminPassword">Password</Label>
            <Input
              id="adminPassword"
              name="adminPassword"
              type="password"
              placeholder="Minimum 8 characters"
              value={formData.adminPassword}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              minLength={8}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Password must be at least 8 characters
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              {error}
            </div>
          )}

          {signupSuccess ? (
            <div className="space-y-4">
              <div className="rounded-md bg-green-50 dark:bg-green-950 p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-green-900 dark:text-green-100">
                      Church Created Successfully!
                    </h3>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      We&apos;ve sent a verification email to <strong>{formData.adminEmail}</strong>. 
                      Please check your inbox and click the verification link to verify your email address.
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      After verifying your email, you can sign in at{" "}
                      <strong>
                        {signupData?.subdomain}.simplechurchtools.com
                      </strong>
                    </p>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSignupSuccess(false);
                  setSignupData(null);
                  setFormData({
                    churchName: "",
                    subdomain: "",
                    adminName: "",
                    adminEmail: "",
                    adminPassword: "",
                    plan: "basic",
                  });
                  onOpenChange(false);
                }}
              >
                Close
              </Button>
            </div>
          ) : (
            <Button
              type="submit"
              className="w-full h-11 cursor-pointer text-base font-semibold"
              disabled={isSubmitting || subdomainAvailable === false}
            >
              {isSubmitting ? "Creating Church..." : "Create Church"}
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

