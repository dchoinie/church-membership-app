"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

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
          return;
        }

        const data = await response.json();
        const church = data.church;

        if (!church?.logoUrl) {
          // No logo - remove custom favicon if it exists
          const existingLink = document.querySelector('link[rel="icon"][data-custom="true"]');
          if (existingLink) {
            existingLink.remove();
          }
          return;
        }

        // Remove existing custom favicon if it exists
        const existingLink = document.querySelector('link[rel="icon"][data-custom="true"]');
        if (existingLink) {
          existingLink.remove();
        }

        // Create new favicon link
        const link = document.createElement("link");
        link.rel = "icon";
        link.href = church.logoUrl;
        link.type = "image/png"; // Adjust if needed
        link.setAttribute("data-custom", "true");
        document.head.appendChild(link);
      } catch (error) {
        console.error("Error fetching church logo for favicon:", error);
      }
    };

    fetchChurchLogo();
  }, [pathname]);

  return null; // This component doesn't render anything
}
