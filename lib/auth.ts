import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";

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
                // Better-auth provides the URL with callbackURL already included
                // We'll configure it to redirect to /verify-email?verified=true
                const baseUrl = getBaseURL();
                const callbackUrl = `${baseUrl}/verify-email?verified=true`;
                // Append callbackURL if not already present
                const verificationUrl = url.includes("callbackURL") 
                    ? url 
                    : `${url}${url.includes("?") ? "&" : "?"}callbackURL=${encodeURIComponent(callbackUrl)}`;
                
                await sendVerificationEmail({
                    email: user.email,
                    verificationUrl: verificationUrl,
                    userName: user.name || undefined,
                    churchId: (user as any).churchId || null,
                });
            } catch (error) {
                console.error("Error sending verification email:", error);
                throw error;
            }
        },
        sendOnSignUp: false, // We'll handle sending manually for invite signups
        autoSignInAfterVerification: true,
    },
    trustedOrigins: process.env.NODE_ENV === "production" 
        ? undefined // Will be set dynamically based on subdomain
        : undefined,
    advanced: {
        useSecureCookies: process.env.NODE_ENV === "production",
        crossSubDomainCookies: {
            enabled: true,
            domain: process.env.NEXT_PUBLIC_APP_DOMAIN?.replace(/^https?:\/\//, "") || "localhost",
        },
    },
});