import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";
import { SEOJsonLd } from "@/components/seo-json-ld";
import { PublicLayoutClient } from "@/components/public-layout-client";

export const metadata: Metadata = createPageMetadata({
  title: "Simple Church Tools",
  description:
    "Church management system for membership, giving, and attendance. Manage members, track giving, monitor attendance, and generate reports.",
  path: "/",
  keywords: [
    "church management",
    "church software",
    "membership management",
    "church giving",
    "attendance tracking",
    "church reports",
  ],
});

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SEOJsonLd />
      <PublicLayoutClient>{children}</PublicLayoutClient>
    </>
  );
}
