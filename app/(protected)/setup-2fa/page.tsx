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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Copy, Check } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ChurchLoadingIndicator } from "@/components/ui/church-loading";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";

type Step = "password" | "qr" | "verify" | "verify-only" | "backup-codes" | "done";

export default function Setup2FAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isVerifyOnly = searchParams.get("verify") === "1";
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const [step, setStep] = useState<Step>(isVerifyOnly ? "verify-only" : "password");
  const [password, setPassword] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Check authentication (skip for verify-only mode - user has pending 2FA)
  useEffect(() => {
    if (isVerifyOnly) return; // Allow verify-only without full session
    if (!isSessionPending && !session?.user) {
      router.replace("/?login=true");
      return;
    }
    // If user already has 2FA enabled and not in verify mode, redirect to dashboard
    if (session?.user && (session.user as { twoFactorEnabled?: boolean }).twoFactorEnabled && !isVerifyOnly) {
      router.replace("/dashboard");
    }
  }, [session, isSessionPending, router, isVerifyOnly]);

  // Generate QR code when we have totpUri
  useEffect(() => {
    if (!totpUri) return;
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(totpUri, { width: 200, margin: 2 })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(null));
    }).catch(() => setQrDataUrl(null));
  }, [totpUri]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { data, error: enableError } = await authClient.twoFactor.enable({
        password,
        issuer: "Simple Church Tools",
      });

      if (enableError) {
        setError(enableError.message || "Failed to enable 2FA. Please check your password.");
        setIsSubmitting(false);
        return;
      }

      if (data?.totpURI) {
        setTotpUri(data.totpURI);
        setBackupCodes(data.backupCodes || []);
        setStep("qr");
      } else {
        setError("Failed to get QR code. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode || totpCode.length !== 6) {
      setError("Please enter the 6-digit code from your authenticator app.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const { data, error: verifyError } = await authClient.twoFactor.verifyTotp({
        code: totpCode,
        trustDevice: true,
      });

      if (verifyError) {
        setError(verifyError.message || "Invalid code. Please try again.");
        setIsSubmitting(false);
        return;
      }

      if (data) {
        if (isVerifyOnly) {
          // Verification-only flow - redirect to dashboard
          await authClient.getSession();
          router.replace("/dashboard");
        } else {
          setStep("backup-codes");
        }
      } else {
        setError("Verification failed. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueToDashboard = async () => {
    setIsSubmitting(true);
    try {
      // Clear requires2FASetup via API
      await fetch("/api/user/complete-2fa-setup", { method: "POST", credentials: "include" });
      await authClient.getSession();
      router.replace("/dashboard");
    } catch {
      // Still redirect - 2FA is enabled, middleware will allow
      router.replace("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyBackupCodes = () => {
    if (backupCodes.length > 0) {
      navigator.clipboard.writeText(backupCodes.join("\n"));
      setCopiedCodes(true);
      toast.success("Backup codes copied to clipboard");
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  if (isSessionPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <ChurchLoadingIndicator size="lg" label="Loading..." centered />
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-8 text-primary" />
            <div>
              <CardTitle className="text-xl">Set Up Two-Factor Authentication</CardTitle>
              <CardDescription>
                {step === "password" && "Enter your password to continue"}
                {step === "qr" && "Scan the QR code with your authenticator app"}
                {(step === "verify" || step === "verify-only") && "Enter the 6-digit code from your app"}
                {step === "backup-codes" && "Save your backup codes in a secure place"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {step === "password" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Enabling 2FA...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          )}

          {step === "qr" && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                {qrDataUrl ? (
                  <div className="rounded-lg border bg-white p-4">
                    <img src={qrDataUrl} alt="QR Code" className="size-48" />
                  </div>
                ) : (
                  <div className="flex size-48 items-center justify-center rounded-lg border bg-muted">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                  </div>
                )}
                <p className="text-center text-sm text-muted-foreground">
                  Scan this QR code with Google Authenticator, Authy, or another authenticator app.
                </p>
              </div>
              <Button onClick={() => setStep("verify")} className="w-full">
                I&apos;ve Scanned the Code
              </Button>
            </div>
          )}

          {(step === "verify" || step === "verify-only") && (
            <form onSubmit={handleVerifyTotp} className="space-y-4">
              <div className="space-y-2">
                <Label>Enter 6-digit code</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={totpCode}
                    onChange={setTotpCode}
                    containerClassName="gap-1"
                  >
                    <InputOTPGroup className="gap-1">
                      {[...Array(6)].map((_, i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting || totpCode.length !== 6}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </Button>
            </form>
          )}

          {step === "backup-codes" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Store these backup codes in a secure place. Each code can only be used once if you
                lose access to your authenticator app.
              </p>
              <div className="rounded-md border bg-muted/50 p-4 font-mono text-sm">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, i) => (
                    <div key={i} className="truncate">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={copyBackupCodes}
                type="button"
              >
                {copiedCodes ? (
                  <>
                    <Check className="mr-2 size-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 size-4" />
                    Copy Backup Codes
                  </>
                )}
              </Button>
              <Button
                className="w-full"
                onClick={handleContinueToDashboard}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Continuing...
                  </>
                ) : (
                  "Continue to Dashboard"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
