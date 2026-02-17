import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Verify Email | Simple Church Tools",
  description: "Verify your email address for your Simple Church Tools account",
  path: "/verify-email",
  noindex: true,
});

export default function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
