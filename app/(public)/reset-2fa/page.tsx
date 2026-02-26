"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function Reset2FAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      setError("Invalid or missing reset token. Please request a new 2FA reset.");
    } else {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const handleReset = async () => {
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/2fa-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset 2FA");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/?login=true");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset 2FA");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 py-16 relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl animate-float-slow"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl animate-float-reverse"></div>
        </div>
        <div className="relative z-10 max-w-lg">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6 border border-accent/20">
              <Shield className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">2FA Reset</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tight mb-4">
              Complete{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">2FA Reset</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Click the button below to complete your 2FA reset. You will then sign in and set up 2FA again.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12 lg:px-12">
        <div className="w-full max-w-md">
          <Card className="border-2 shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-3xl font-bold">Reset 2FA</CardTitle>
              <CardDescription className="text-base">
                Complete the 2FA reset process
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="space-y-4">
                  <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 text-sm text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <p className="font-medium">2FA Reset Successful</p>
                    </div>
                    <p>
                      Your 2FA has been reset. You will be redirected to the login page to sign in and set up 2FA again.
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push("/?login=true")}
                    className="w-full"
                  >
                    Go to Login
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Click the button below to reset your two-factor authentication. After resetting, you will need to sign in and set up 2FA again.
                  </p>

                  {error && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <Button
                    onClick={handleReset}
                    className="w-full h-11 cursor-pointer text-base font-semibold"
                    disabled={isSubmitting || !token}
                  >
                    {isSubmitting ? "Resetting..." : "Reset 2FA"}
                  </Button>

                  {!token && (
                    <div className="text-center">
                      <Link
                        href="/forgot-2fa"
                        className="text-sm text-primary hover:underline font-medium"
                      >
                        Request a new reset link
                      </Link>
                    </div>
                  )}
                </div>
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
