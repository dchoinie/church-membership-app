import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { churches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";

const getBaseURL = () => {
    // Check for environment-specific URLs first
    if (process.env.NODE_ENV === "development") {
        const devUrl = process.env.BETTER_AUTH_DEV_URL || "localhost:3000"
        // Ensure URL has a protocol
        if (devUrl.startsWith("http://") || devUrl.startsWith("https://")) {
            return devUrl
        }
        return `http://${devUrl}`
    }
    
    // Production - use BETTER_AUTH_PROD_URL or fallback
    // IMPORTANT: baseURL should be the root domain (not a subdomain) for better-auth
    // to properly validate subdomain origins
    const prodUrl = process.env.BETTER_AUTH_PROD_URL || process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "localhost:3000"
    
    let url: string
    if (prodUrl.startsWith("http://") || prodUrl.startsWith("https://")) {
        url = prodUrl
    } else {
        // Default to https in production
        url = `https://${prodUrl}`
    }
    
    // Extract root domain if URL contains a subdomain
    try {
        const urlObj = new URL(url)
        const hostname = urlObj.hostname
        
        // Extract root domain (e.g., "example.com" from "subdomain.example.com")
        const domainParts = hostname.split('.')
        if (domainParts.length > 2) {
            // Has subdomain, extract root domain
            const rootDomain = domainParts.slice(-2).join('.')
            return `${urlObj.protocol}//${rootDomain}${urlObj.port ? `:${urlObj.port}` : ''}`
        }
        
        // No subdomain or already root domain
        return url
    } catch {
        // If URL parsing fails, return as-is
        return url
    }
}

const getCookieDomain = () => {
    if (process.env.NODE_ENV === "development") {
        // For localhost subdomains, use .localhost with dot prefix
        // This allows cookies to be shared across *.localhost subdomains
        return ".localhost"
    }
    
    // For production, use the root domain with dot prefix for subdomain support
    // Check same env vars as getBaseURL() for consistency
    const domain = process.env.BETTER_AUTH_PROD_URL || process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_DOMAIN || "simplechurchtools.com"
    
    // Extract root domain if URL contains a subdomain (same logic as getBaseURL)
    let cleanDomain: string
    try {
        // Remove protocol and port if present, extract just the domain
        const domainOnly: string = domain.replace(/^https?:\/\//, "").split(":")[0].split("/")[0]
        
        // Extract root domain (e.g., "example.com" from "subdomain.example.com")
        const domainParts = domainOnly.split('.')
        if (domainParts.length > 2) {
            // Has subdomain, extract root domain
            cleanDomain = domainParts.slice(-2).join('.')
        } else {
            cleanDomain = domainOnly
        }
    } catch {
        // If parsing fails, fallback to simple extraction
        cleanDomain = domain.replace(/^https?:\/\//, "").split(":")[0].split("/")[0]
    }
    
    // Add dot prefix if not already present (for subdomain cookie sharing)
    if (!cleanDomain.startsWith(".")) {
        cleanDomain = `.${cleanDomain}`
    }
    
    return cleanDomain
}

const getTrustedOrigins = (): string[] | undefined => {
    if (process.env.NODE_ENV === "development") {
        // In development, allow localhost origins
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    }
    
    // In production, explicitly allow root domain and all subdomains using wildcards
    // Better-auth supports wildcard patterns like "https://*.example.com" to trust all subdomains
    const baseUrl = getBaseURL()
    
    try {
        const urlObj = new URL(baseUrl)
        const rootDomain = urlObj.hostname
        const protocol = urlObj.protocol // "https:" or "http:"
        
        // Build trusted origins array with root domain and wildcard subdomain pattern
        const origins: string[] = [
            `${protocol}//${rootDomain}`, // Root domain
            `${protocol}//*.${rootDomain}`, // All subdomains (wildcard)
        ]
        
        // Also include without protocol for flexibility (though better-auth prefers full URLs)
        // But better-auth expects full URLs, so we'll stick with protocol-prefixed
        
        return origins
    } catch {
        // If URL parsing fails, return undefined to let better-auth use default
        return undefined
    }
}

export const auth = betterAuth({
    baseURL: getBaseURL(),
    secret: process.env.BETTER_AUTH_SECRET, // Required for production
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    emailAndPassword: { 
        enabled: true,
        autoSignIn: false,
        sendResetPassword: async ({ user, url }) => {
            try {
                await sendPasswordResetEmail({
                    email: user.email,
                    resetUrl: url,
                    userName: user.name || undefined,
                    churchId: (user as any).churchId || null,
                });
            } catch (error) {
                console.error("Error sending password reset email:", error);
                // Don't throw - betterauth will handle the error appropriately
                throw error;
            }
        },
    },
    emailVerification: {
        sendVerificationEmail: async ({ user, url, token }, request) => {
            try {
                // Get church subdomain to build correct callback URL
                let callbackUrl: string;
                const churchId = (user as any).churchId;
                
                if (churchId) {
                    // Fetch church subdomain
                    const church = await db.query.churches.findFirst({
                        where: eq(churches.id, churchId),
                    });
                    
                    if (church?.subdomain) {
                        // Build subdomain-aware callback URL
                        const baseUrl = getBaseURL();
                        const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
                        
                        if (isLocalhost) {
                            const port = baseUrl.includes(':') ? baseUrl.split(':')[2] : '3000';
                            callbackUrl = `http://${church.subdomain}.localhost:${port}/?verified=true&signin=true`;
                        } else {
                            const domain = baseUrl.replace(/^https?:\/\//, '').split(':')[0];
                            callbackUrl = `https://${church.subdomain}.${domain}/?verified=true&signin=true`;
                        }
                    } else {
                        // Fallback to root domain
                        const baseUrl = getBaseURL();
                        callbackUrl = `${baseUrl}/?verified=true&signin=true`;
                    }
                } else {
                    // No churchId, use root domain
                    const baseUrl = getBaseURL();
                    callbackUrl = `${baseUrl}/?verified=true&signin=true`;
                }
                
                // Append callbackURL if not already present
                const verificationUrl = url.includes("callbackURL") 
                    ? url 
                    : `${url}${url.includes("?") ? "&" : "?"}callbackURL=${encodeURIComponent(callbackUrl)}`;
                
                await sendVerificationEmail({
                    email: user.email,
                    verificationUrl: verificationUrl,
                    userName: user.name || undefined,
                    churchId: churchId || null,
                });
            } catch (error) {
                console.error("Error sending verification email:", error);
                throw error;
            }
        },
        sendOnSignUp: false, // We'll handle sending manually for invite signups
        autoSignInAfterVerification: false,
    },
    trustedOrigins: getTrustedOrigins(),
    advanced: {
        useSecureCookies: process.env.NODE_ENV === "production",
        crossSubDomainCookies: process.env.NODE_ENV === "development"
            ? undefined // Don't set cookie domain in dev - browsers handle *.localhost automatically
            : {
                enabled: true,
                domain: getCookieDomain(), // Returns ".yourdomain.com" in prod
            },
    },
});