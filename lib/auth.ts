import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { sendPasswordResetEmail } from "@/lib/email";

const getBaseURL = () => {
    // Use localhost:3000 for local development
    if (process.env.NODE_ENV === "development") {
        return "http://localhost:3000"
    }
    // Use environment variable for production
    return process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
}

export const auth = betterAuth({
    baseURL: getBaseURL(),
    secret: process.env.BETTER_AUTH_SECRET, // Required for production
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    emailAndPassword: { 
        enabled: true,
        autoSignIn: true,
        sendResetPassword: async ({ user, url }) => {
            try {
                await sendPasswordResetEmail({
                    email: user.email,
                    resetUrl: url,
                    userName: user.name || undefined,
                });
            } catch (error) {
                console.error("Error sending password reset email:", error);
                // Don't throw - betterauth will handle the error appropriately
                throw error;
            }
        },
    },
    trustedOrigins: process.env.NODE_ENV === "production" 
        ? ["https://admin.goodshepherdmankato.org", "https://goodshepherdmankato.org"]
        : undefined,
    advanced: {
        useSecureCookies: process.env.NODE_ENV === "production",
        // If you need cookies to work across subdomains:
        // crossSubDomainCookies: {
        //     enabled: true,
        //     domain: "goodshepherdmankato.org",
        // },
    },
});