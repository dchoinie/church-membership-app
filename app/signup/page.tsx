"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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

export default function SignupPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const inviteCode = searchParams.get("invite");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    inviteCode: inviteCode || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);

  // Update invite code when URL param changes
  useEffect(() => {
    if (inviteCode) {
      setFormData((prev) => ({ ...prev, inviteCode }));
    }
  }, [inviteCode]);

  // Fetch invite details to pre-fill email
  useEffect(() => {
    if (inviteCode) {
      setIsLoadingInvite(true);
      fetch(`/api/invite/validate?code=${encodeURIComponent(inviteCode)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.valid && data.email) {
            setFormData((prev) => ({ ...prev, email: data.email }));
          } else if (data.error) {
            setError(data.error);
          }
        })
        .catch((err) => {
          console.error("Error fetching invite details:", err);
        })
        .finally(() => {
          setIsLoadingInvite(false);
        });
    }
  }, [inviteCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validation
    if (!formData.email || !formData.password || !formData.name || !formData.inviteCode) {
      setError("All fields are required");
      setIsSubmitting(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/invite-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          inviteCode: formData.inviteCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      // Success - redirect to verify-email page
      router.push("/verify-email");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create Your Account</CardTitle>
          <CardDescription>
            {inviteCode
              ? "You&apos;ve been invited! Complete your registration below."
              : "Enter your invitation code and account details to get started."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invitation Code</Label>
              <Input
                id="inviteCode"
                name="inviteCode"
                type="text"
                placeholder="Enter your invitation code"
                value={formData.inviteCode}
                onChange={handleChange}
                required
                disabled={!!inviteCode || isSubmitting}
                className={inviteCode ? "bg-muted" : ""}
              />
              {inviteCode && (
                <p className="text-xs text-muted-foreground">
                  Invitation code from email link
                </p>
              )}
            </div>

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
                disabled={isSubmitting || isLoadingInvite || !!(inviteCode && formData.email !== "")}
                className={inviteCode && formData.email ? "bg-muted" : ""}
              />
              {isLoadingInvite && (
                <p className="text-xs text-muted-foreground">
                  Validating invitation...
                </p>
              )}
              {inviteCode && formData.email && !isLoadingInvite && (
                <p className="text-xs text-muted-foreground">
                  Email from invitation
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Minimum 8 characters"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                minLength={8}
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

            <Button type="submit" className="w-full cursor-pointer" disabled={isSubmitting}>
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>
              Already have an account?{" "}
              <a href="/login" className="text-primary hover:underline">
                Sign in
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

