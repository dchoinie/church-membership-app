import { getBaseUrl, SITE_NAME, DEFAULT_DESCRIPTION } from "@/lib/seo";

interface SEOJsonLdProps {
  /** Optional page-specific structured data to include */
  pageData?: Record<string, unknown>;
}

export function SEOJsonLd({ pageData }: SEOJsonLdProps) {
  const baseUrl = getBaseUrl();

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: baseUrl,
    logo: `${baseUrl}/church.svg`,
    description: DEFAULT_DESCRIPTION,
  };

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: baseUrl,
    description: DEFAULT_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const schemas: Record<string, unknown>[] = [
    organizationSchema,
    webSiteSchema,
  ];
  if (pageData) {
    schemas.push({
      "@context": "https://schema.org",
      ...pageData,
    });
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schemas.length === 1 ? schemas[0] : schemas),
      }}
    />
  );
}
