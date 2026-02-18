import { getBaseUrl } from "@/lib/seo";
import { SITEMAP_ENTRIES } from "@/lib/sitemap-config";

export default function sitemap() {
  const baseUrl = getBaseUrl();
  const now = new Date();

  return SITEMAP_ENTRIES.map((entry) => ({
    url: entry.path === "/" ? baseUrl : `${baseUrl}${entry.path}`,
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
