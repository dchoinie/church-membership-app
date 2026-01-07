"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
import { CheckCircle2, XCircle, Loader2, Church, Users, Shield, Sparkles } from "lucide-react";

export default function SignupPage() {
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
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create church");
      }

      // If checkout URL provided, redirect to Stripe
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      // Otherwise, redirect to subdomain login
      const baseUrl = window.location.origin;
      const subdomainUrl = `${baseUrl.replace(
        /^https?:\/\//,
        `https://${data.subdomain}.`
      )}/dashboard`;
      window.location.href = subdomainUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create church");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side - Hero section */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 py-16 relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-lg">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Get Started Today</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tight mb-4">
              Create Your{" "}
              <span className="text-primary">Simple Church Tools</span> Account
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of churches managing their members, tracking giving, and growing their communities.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Church className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Complete Church Management</h3>
                <p className="text-sm text-muted-foreground">
                  Manage member directories, track attendance, handle giving, and generate comprehensive reports all in one place with Simple Church Tools.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Member Directory</h3>
                <p className="text-sm text-muted-foreground">
                  Keep track of all your members with detailed profiles, household relationships, and contact information.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Secure & Private</h3>
                <p className="text-sm text-muted-foreground">
                  Your church data is protected with enterprise-grade security. Each church gets its own secure subdomain.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Signup form */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 lg:px-12 lg:py-16 overflow-y-auto">
        <div className="w-full max-w-2xl">
          <Card className="border-2 shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-2">
                <div className="p-3 rounded-full bg-primary/10">
                  <Church className="w-8 h-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">Create Your Church</CardTitle>
              <CardDescription className="text-base">
                Sign up to get started with Simple Church Tools
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
                    <option value="free">Free - Up to 50 members</option>
                    <option value="basic">Basic - $29/month - Up to 500 members</option>
                    <option value="premium">Premium - $99/month - Unlimited members</option>
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

                <Button
                  type="submit"
                  className="w-full h-11 cursor-pointer text-base font-semibold"
                  disabled={isSubmitting || subdomainAvailable === false}
                >
                  {isSubmitting ? "Creating Church..." : "Create Church"}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                <p>
                  Already have an account?{" "}
                  <Link href="/" className="text-primary hover:underline font-medium">
                    Sign in to your church
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
