import type { Metadata } from "next";
import { Source_Serif_4, Inter, Geist_Mono } from "next/font/google";

import "./globals.css";
import AuthLayout from "@/components/auth-layout";
import { Toaster } from "@/components/ui/sonner";

const sourceSerif = Source_Serif_4({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Simple Church Tools",
  description: "Church management system for membership, giving, and attendance.",
  icons: {
    icon: "/church.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sourceSerif.variable} ${inter.variable} ${geistMono.variable} antialiased`}>
        <AuthLayout>{children}</AuthLayout>
        <Toaster />
      </body>
    </html>
  );
}
