"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Default church icon SVG (Building2 from Lucide) as data URL
const DEFAULT_CHURCH_ICON_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`)}`;

export function DynamicFavicon() {
  const pathname = usePathname();

  useEffect(() => {
    // Extract subdomain from current hostname
    const hostname = window.location.hostname;
    const parts = hostname.split(".");
    
    // Check if we're on a subdomain (not root domain)
    const isSubdomain = parts.length >= 3 && parts[0] !== "www";
    
    if (!isSubdomain) {
      // On root domain - remove custom favicon if it exists
      const existingLink = document.querySelector('link[rel="icon"][data-custom="true"]');
      if (existingLink) {
        existingLink.remove();
      }
      return;
    }

    // Fetch church data to get logo
    const fetchChurchLogo = async () => {
      try {
        const response = await fetch("/api/church", {
          credentials: "include",
        });

        if (!response.ok) {
          // Use default church icon if fetch fails
          setFavicon(DEFAULT_CHURCH_ICON_SVG);
          return;
        }

        const data = await response.json();
        const church = data.church;

        if (!church?.logoUrl) {
          // No logo - use default church icon
          setFavicon(DEFAULT_CHURCH_ICON_SVG);
          return;
        }

        // Use church logo as favicon
        setFavicon(church.logoUrl);
      } catch (error) {
        console.error("Error fetching church logo for favicon:", error);
        // Use default church icon on error
        setFavicon(DEFAULT_CHURCH_ICON_SVG);
      }
    };

    fetchChurchLogo();
  }, [pathname]);

  return null; // This component doesn't render anything
}

function setFavicon(url: string) {
  // Remove existing custom favicon if it exists
  const existingLink = document.querySelector('link[rel="icon"][data-custom="true"]');
  if (existingLink) {
    existingLink.remove();
  }

  // Create new favicon link
  const link = document.createElement("link");
  link.rel = "icon";
  link.href = url;
  link.type = url.startsWith("data:") ? "image/svg+xml" : "image/png";
  link.setAttribute("data-custom", "true");
  document.head.appendChild(link);
}
