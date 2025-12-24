"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { CheckCircle2, XCircle, Mail, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "success" | "error">("pending");

  const verified = searchParams.get("verified");
  const error = searchParams.get("error");

  // Check if user is already verified
  useEffect(() => {
    if (!sessionPending && session?.user) {
      if (session.user.emailVerified) {
        // Already verified, redirect to dashboard
        router.push("/dashboard");
      }
    }
  }, [session, sessionPending, router]);

  // Handle verified query param (from callback URL after clicking email link)
  useEffect(() => {
    if (verified === "true") {
      setVerificationStatus("success");
      // Refresh session to get updated emailVerified status
      authClient.getSession().then(() => {
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      });
    } else if (error) {
      setVerificationStatus("error");
    }
  }, [verified, error, router]);

  const handleResend = async () => {
    if (!session?.user?.email) {
      setResendError("You must be logged in to resend verification email");
      return;
    }

    setIsResending(true);
    setResendError(null);
    setResendSuccess(false);

    try {
      const response = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend verification email");
      }

      setResendSuccess(true);
    } catch (error) {
      setResendError(error instanceof Error ? error.message : "Failed to resend verification email");
    } finally {
      setIsResending(false);
    }
  };

  // Show loading state while checking session
  if (sessionPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!session?.user) {
    router.push("/");
    return null;
  }

  // If already verified, show success briefly before redirect
  if (session.user.emailVerified && verificationStatus === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-center text-muted-foreground">Your email is already verified. Redirecting...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
          <CardDescription>
            Please verify your email address to continue using Good Shepherd Admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {verificationStatus === "success" && (
            <div className="rounded-md bg-green-50 p-4 border border-green-200">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium text-green-800">
                  Email verified successfully! Redirecting to dashboard...
                </p>
              </div>
            </div>
          )}

          {verificationStatus === "error" && (
            <div className="rounded-md bg-destructive/10 p-4 border border-destructive/20">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <p className="text-sm font-medium text-destructive">
                  Verification failed. The link may have expired. Please request a new verification email.
                </p>
              </div>
            </div>
          )}

          {verificationStatus === "pending" && (
            <>
              <div className="flex flex-col items-center space-y-4 py-4">
                <Mail className="h-16 w-16 text-muted-foreground" />
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    We sent a verification email to:
                  </p>
                  <p className="font-medium">{session.user.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Click the link in the email to verify your account.
                  </p>
                </div>
              </div>

              {resendSuccess && (
                <div className="rounded-md bg-green-50 p-3 border border-green-200">
                  <p className="text-sm text-green-800">
                    Verification email sent! Please check your inbox.
                  </p>
                </div>
              )}

              {resendError && (
                <div className="rounded-md bg-destructive/10 p-3 border border-destructive/20">
                  <p className="text-sm text-destructive">{resendError}</p>
                </div>
              )}

              <div className="space-y-4">
                <Button
                  onClick={handleResend}
                  disabled={isResending}
                  className="w-full cursor-pointer"
                  variant="outline"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend Verification Email
                    </>
                  )}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  <p>
                    Didn't receive the email? Check your spam folder or try resending.
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

