import { createAuthClient } from "better-auth/react"

const getBaseURL = () => {
    // Use localhost:3000 for local development
    if (process.env.NODE_ENV === "development") {
        return "http://localhost:3000"
    }
    // Use environment variable for production
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
}

export const authClient = createAuthClient({
    /** The base URL of the server (optional if you're using the same domain) */
    baseURL: getBaseURL()
})