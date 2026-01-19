import type { Metadata } from "next";
import { Playfair_Display, Inter, Geist_Mono } from "next/font/google";

import "./globals.css";
import AuthLayout from "@/components/auth-layout";

const playfairDisplay = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${playfairDisplay.variable} ${inter.variable} ${geistMono.variable} antialiased`}>
        <AuthLayout>{children}</AuthLayout>
      </body>
    </html>
  );
}
