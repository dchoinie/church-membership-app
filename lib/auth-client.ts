import { createAuthClient } from "better-auth/react"

const getBaseURL = () => {
    // In browser, use current origin to support subdomains dynamically
    if (typeof window !== "undefined") {
        return window.location.origin;
    }
    
    // Server-side: check for environment-specific URLs
    if (process.env.NODE_ENV === "development") {
        const devUrl = process.env.BETTER_AUTH_DEV_URL || "localhost:3000"
        // Ensure URL has a protocol
        if (devUrl.startsWith("http://") || devUrl.startsWith("https://")) {
            return devUrl
        }
        return `http://${devUrl}`
    }
    
    // Production - use BETTER_AUTH_PROD_URL or fallback
    const prodUrl = process.env.BETTER_AUTH_PROD_URL || process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "localhost:3000"
    
    // Ensure URL has a protocol
    if (prodUrl.startsWith("http://") || prodUrl.startsWith("https://")) {
        return prodUrl
    }
    
    // Default to https in production
    return `https://${prodUrl}`
}

export const authClient = createAuthClient({
    /** The base URL of the server (optional if you're using the same domain) */
    baseURL: getBaseURL()
})