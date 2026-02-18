/**
 * Generates a static sitemap.xml in the public directory from lib/sitemap-config.ts
 * Run with: pnpm tsx scripts/generate-sitemap.ts
 */

import { config } from "dotenv";
import { writeFileSync } from "fs";
import { join } from "path";
import { SITEMAP_ENTRIES } from "../lib/sitemap-config";

// Load env vars so getBaseUrl gets NEXT_PUBLIC_APP_URL
config();

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function getSitemapEntries(): { url: string; lastModified: Date; changeFrequency: string; priority: number }[] {
  const baseUrl = getBaseUrl();

  return SITEMAP_ENTRIES.map((entry) => ({
    url: entry.path === "/" ? baseUrl : `${baseUrl}${entry.path}`,
    lastModified: new Date(),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}

function generateSitemapXml(): string {
  const entries = getSitemapEntries();

  const urlEntries = entries
    .map((entry) => {
      const lastmod = entry.lastModified
        ? entry.lastModified.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      const changefreq = entry.changeFrequency ?? "weekly";
      const priority = entry.priority ?? 0.5;

      return `  <url>
    <loc>${escapeXml(entry.url)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const outputPath = join(process.cwd(), "public", "sitemap.xml");
const xml = generateSitemapXml();

writeFileSync(outputPath, xml, "utf-8");

const entries = getSitemapEntries();
console.log(`Generated sitemap at ${outputPath}`);
console.log(`Base URL: ${getBaseUrl()}`);
console.log(`Entries: ${entries.length}`);
