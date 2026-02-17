import type { Metadata } from "next";

const SITE_NAME = "Simple Church Tools";
const DEFAULT_DESCRIPTION =
  "Church management system for membership, giving, and attendance.";

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export interface CreatePageMetadataOptions {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string;
  noindex?: boolean;
}

export function createPageMetadata(
  options: CreatePageMetadataOptions
): Metadata {
  const { title, description, path, keywords, image, noindex = false } = options;
  const baseUrl = getBaseUrl();
  const canonicalPath = path.startsWith("/") ? path : `/${path}`;
  const canonicalUrl = `${baseUrl}${canonicalPath === "/" ? "" : canonicalPath}`;
  const imageUrl = image
    ? image.startsWith("http")
      ? image
      : `${baseUrl}${image.startsWith("/") ? image : `/${image}`}`
    : undefined;

  const openGraphBase = {
    title,
    description,
    url: canonicalUrl,
    siteName: SITE_NAME,
    type: "website" as const,
    locale: "en_US",
  };

  const twitterBase = {
    card: "summary_large_image" as const,
    title,
    description,
  };

  return {
    title,
    description,
    ...(keywords && keywords.length > 0 && { keywords: keywords.join(", ") }),
    alternates: {
      canonical: canonicalUrl,
    },
    robots: noindex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      ...openGraphBase,
      ...(imageUrl && {
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      }),
    },
    twitter: {
      ...twitterBase,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

export { SITE_NAME, DEFAULT_DESCRIPTION, getBaseUrl };
