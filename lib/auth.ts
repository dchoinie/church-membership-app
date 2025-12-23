import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { sendPasswordResetEmail } from "@/lib/email";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    emailAndPassword: { 
        enabled: true,
        autoSignIn: true,
        sendResetPassword: async ({ user, url, token }, request) => {
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
});