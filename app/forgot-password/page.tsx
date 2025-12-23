"use client";

import { useState } from "react";
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
import { Shield, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    if (!email) {
      setError("Email is required");
      setIsSubmitting(false);
      return;
    }

    try {
      const baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const { error: resetError } = await authClient.requestPasswordReset({
        email: email,
        redirectTo: `${baseURL}/reset-password`,
      });

      if (resetError) {
        throw new Error(resetError.message || "Failed to send password reset email");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send password reset email");
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
              <span className="text-sm font-medium">Secure Password Reset</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tight mb-4">
              Reset Your{" "}
              <span className="text-primary">Password</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 lg:px-12">
        <div className="w-full max-w-md">
          <Card className="border-2 shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-3xl font-bold">Forgot Password</CardTitle>
              <CardDescription className="text-base">
                Enter your email address to receive a password reset link
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="space-y-4">
                  <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 text-sm text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800">
                    <p className="font-medium mb-2">Check your email</p>
                    <p>
                      If an account exists with the email <strong>{email}</strong>, we've sent you a password reset link. 
                      Please check your inbox and follow the instructions to reset your password.
                    </p>
                    <p className="mt-3 text-xs">
                      The reset link will expire in 1 hour.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => router.push("/")}
                      className="w-full"
                      variant="outline"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Login
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
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
                    {isSubmitting ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              )}

              <div className="mt-6 text-center text-sm text-muted-foreground">
                <Link href="/" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" />
                  Back to Sign In
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
