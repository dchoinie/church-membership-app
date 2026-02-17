import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";
import LandingPageClient from "./landing-page-client";

export const metadata: Metadata = createPageMetadata({
  title: "Simple Church Tools – Church Management Made Simple",
  description:
    "Manage your members, track giving, monitor attendance, view analytics, and generate reports—all in one powerful, easy-to-use platform designed for small churches.",
  path: "/",
  keywords: [
    "church management",
    "church software",
    "membership management",
    "church giving",
    "attendance tracking",
    "church reports",
    "small church",
  ],
});

export default function LandingPage() {
  return <LandingPageClient />;
}
