/**
 * Script to create the first super admin user
 * Usage: tsx scripts/create-super-admin.ts <email> <password> <name>
 */

import "dotenv/config";
import { db } from "../db";
import { user } from "../auth-schema";
import { auth } from "../lib/auth";
import { eq } from "drizzle-orm";

async function createSuperAdmin() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error("Usage: tsx scripts/create-super-admin.ts <email> <password> <name>");
    process.exit(1);
  }

  const [email, password, name] = args;

  try {
    // Check if user already exists
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    });

    if (existingUser) {
      console.error(`User with email ${email} already exists`);
      process.exit(1);
    }

    // Create user via Better Auth
    const signupResponse = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
      headers: new Headers(),
      asResponse: true,
    });

    if (!signupResponse.ok) {
      const errorData = await signupResponse.json().catch(() => ({}));
      console.error("Failed to create user:", errorData);
      process.exit(1);
    }

    const signupData = await signupResponse.json();
    const userId = signupData.user?.id;

    if (!userId) {
      console.error("Failed to get user ID after signup");
      process.exit(1);
    }

    // Update user to be super admin
    await db
      .update(user)
      .set({
        isSuperAdmin: true,
        role: "super_admin",
      })
      .where(eq(user.id, userId));

    console.log(`✅ Super admin user created successfully!`);
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log(`   User ID: ${userId}`);
  } catch (error) {
    console.error("Error creating super admin:", error);
    process.exit(1);
  }
}

createSuperAdmin();

