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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"signin" | "invite">("signin");
  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });
  const [inviteData, setInviteData] = useState({
    inviteCode: "",
    email: "",
    name: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingInvite, setIsValidatingInvite] = useState(false);
  const [inviteValidationError, setInviteValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for invite query parameter when dialog opens
  useEffect(() => {
    if (open) {
      const inviteCode = searchParams.get("invite");
      if (inviteCode) {
        setActiveTab("invite");
        setInviteData((prev) => ({ ...prev, inviteCode }));
        // Clear the invite parameter from URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("invite");
        router.replace(newUrl.pathname + newUrl.search, { scroll: false });
      }
    }
  }, [open, searchParams, router]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setActiveTab("signin");
      setSignInData({ email: "", password: "" });
      setInviteData({ inviteCode: "", email: "", name: "", password: "" });
      setError(null);
      setInviteValidationError(null);
    }
  }, [open]);

  // Validate invitation code when it changes
  useEffect(() => {
    const validateInviteCode = async () => {
      if (!inviteData.inviteCode || inviteData.inviteCode.length < 10) {
        setInviteValidationError(null);
        setInviteData((prev) => ({ ...prev, email: "" }));
        return;
      }

      setIsValidatingInvite(true);
      setInviteValidationError(null);

      try {
        const response = await fetch(
          `/api/invite/validate?code=${encodeURIComponent(inviteData.inviteCode)}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Invalid invitation code");
        }

        if (data.valid && data.email) {
          setInviteData((prev) => ({ ...prev, email: data.email }));
          setInviteValidationError(null);
        } else {
          throw new Error("Invalid invitation code");
        }
      } catch (err) {
        setInviteValidationError(err instanceof Error ? err.message : "Invalid invitation code");
        setInviteData((prev) => ({ ...prev, email: "" }));
      } finally {
        setIsValidatingInvite(false);
      }
    };

    const timeoutId = setTimeout(validateInviteCode, 500);
    return () => clearTimeout(timeoutId);
  }, [inviteData.inviteCode]);

  const handleSignInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignInData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleInviteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInviteData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
    if (name !== "inviteCode" && inviteValidationError) setInviteValidationError(null);
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!signInData.email || !signInData.password) {
      setError("Email and password are required");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error: signInError, data: signInResponse } = await authClient.signIn.email({
        email: signInData.email,
        password: signInData.password,
        callbackURL: "/dashboard",
      });

      if (signInError) {
        throw new Error(signInError.message || "Failed to sign in");
      }

      // Check email verification status
      if (signInResponse?.user && !signInResponse.user.emailVerified) {
        // User is not verified, redirect to verification page
        onOpenChange(false);
        router.push("/verify-email");
      } else {
        // User is verified, redirect to dashboard
        onOpenChange(false);
        router.push("/dashboard");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!inviteData.inviteCode || !inviteData.email || !inviteData.name || !inviteData.password) {
      setError("All fields are required");
      setIsSubmitting(false);
      return;
    }

    if (inviteValidationError) {
      setError("Please enter a valid invitation code");
      setIsSubmitting(false);
      return;
    }

    if (inviteData.password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/invite-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteData.email,
          password: inviteData.password,
          name: inviteData.name,
          inviteCode: inviteData.inviteCode,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create account");
      }

      // Success - user is signed in via the API response
      onOpenChange(false);
      router.push("/verify-email");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Sign In</DialogTitle>
          <DialogDescription>
            Sign in to your account or join with an invitation code
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "signin" | "invite")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="invite">Join with Invitation</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4 mt-4">
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email Address</Label>
                <Input
                  id="signin-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={signInData.email}
                  onChange={handleSignInChange}
                  required
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signin-password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:underline font-medium"
                    onClick={() => onOpenChange(false)}
                  >
                    Forgot Password?
                  </Link>
                </div>
                <Input
                  id="signin-password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  value={signInData.password}
                  onChange={handleSignInChange}
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
          </TabsContent>

          <TabsContent value="invite" className="space-y-4 mt-4">
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-code">Invitation Code</Label>
                <div className="relative">
                  <Input
                    id="invite-code"
                    name="inviteCode"
                    type="text"
                    placeholder="Enter your invitation code"
                    value={inviteData.inviteCode}
                    onChange={handleInviteChange}
                    required
                    disabled={isSubmitting || isValidatingInvite}
                    className="h-11"
                  />
                  {isValidatingInvite && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                {inviteValidationError && (
                  <p className="text-xs text-destructive">{inviteValidationError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter the invitation code you received from your church administrator
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={inviteData.email}
                  onChange={handleInviteChange}
                  required
                  disabled={isSubmitting || isValidatingInvite || !!inviteData.email}
                  className="h-11"
                />
                {inviteData.email && (
                  <p className="text-xs text-muted-foreground">
                    Email pre-filled from invitation
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-name">Your Name</Label>
                <Input
                  id="invite-name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  value={inviteData.name}
                  onChange={handleInviteChange}
                  required
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-password">Password</Label>
                <Input
                  id="invite-password"
                  name="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={inviteData.password}
                  onChange={handleInviteChange}
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
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 cursor-pointer text-base font-semibold"
                disabled={isSubmitting || isValidatingInvite || !!inviteValidationError}
              >
                {isSubmitting ? "Creating Account..." : "Join Church"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

