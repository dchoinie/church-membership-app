"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { authClient } from "@/lib/auth-client";
import { Shield, Users, DollarSign, FileText } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  
  // Redirect to signup if on root domain
  useEffect(() => {
    const hostname = window.location.hostname;
    // If not a subdomain (localhost or root domain), redirect to signup
    if (!hostname.includes(".") || hostname.split(".").length <= 2) {
      router.push("/signup");
    }
  }, [router]);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!formData.email || !formData.password) {
      setError("Email and password are required");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error: signInError, data: signInData } = await authClient.signIn.email({
        email: formData.email,
        password: formData.password,
        callbackURL: "/dashboard",
      });

      if (signInError) {
        throw new Error(signInError.message || "Failed to sign in");
      }

      // Check email verification status
      if (signInData?.user && !signInData.user.emailVerified) {
        // User is not verified, redirect to verification page
        router.push("/verify-email");
      } else {
        // User is verified, redirect to dashboard
        router.push("/dashboard");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
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
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Secure Admin Portal</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tight mb-4">
              Welcome to{" "}
              <span className="text-primary">Good Shepherd</span> Admin
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Manage your church membership, track giving, generate reports, and more.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Member Directory</h3>
                <p className="text-sm text-muted-foreground">
                  Manage member profiles, track household relationships, and maintain up-to-date contact information for your congregation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Giving Management</h3>
                <p className="text-sm text-muted-foreground">
                  Record and track donations, manage recurring gifts, and maintain detailed giving history for each member.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Generate comprehensive reports on membership, giving, and other key metrics to help guide your church&apos;s decisions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Sign in form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 lg:px-12">
        <div className="w-full max-w-md">
          <Card className="border-2 shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-3xl font-bold">Sign In</CardTitle>
              <CardDescription className="text-base">
                Enter your credentials to access the admin dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link 
                      href="/forgot-password" 
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                    className="h-11"
                  />
                </div>

                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-11 cursor-pointer text-base font-semibold" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing In..." : "Sign In"}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                <p>
                  Need an account?{" "}
                  <Link href="/signup" className="text-primary hover:underline font-medium">
                    Sign up with an invitation
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
