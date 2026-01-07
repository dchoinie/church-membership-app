import { createAuthClient } from "better-auth/react"

const getBaseURL = () => {
    // In browser, use current origin to support subdomains
    if (typeof window !== "undefined") {
        return window.location.origin;
    }
    // Use localhost:3000 for local development (server-side)
    if (process.env.NODE_ENV === "development") {
        return "http://localhost:3000"
    }
    // Use environment variable for production
    const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    
    // Ensure URL has a protocol
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
        // Default to https in production, http in development
        return `https://${url}`
    }
    
    return url
}

export const authClient = createAuthClient({
    /** The base URL of the server (optional if you're using the same domain) */
    baseURL: getBaseURL()
})