/**
 * Playwright fixtures for test data management
 */

import { test as base } from "@playwright/test";
import {
  createTestSetup,
  cleanupTestData,
  generateTestIdentifiers,
  TestUserData,
  TestChurchData,
} from "./test-db";

type TestFixtures = {
  testUser: TestUserData & { userId: string; email: string };
  testChurch: TestChurchData & { churchId: string; subdomain: string };
  testSetup: {
    userId: string;
    churchId: string;
    email: string;
    subdomain: string;
    password: string;
  };
};

export const test = base.extend<TestFixtures>({
  // Auto-create test user for each test
  testUser: async ({}, use) => {
    const identifiers = generateTestIdentifiers("user");
    const userData: TestUserData = {
      email: identifiers.email,
      password: "TestPassword123!",
      name: identifiers.name,
      emailVerified: true, // Auto-verify for tests
    };

    const { userId, email } = await createTestSetup(userData, {
      name: identifiers.name + " Church",
      subdomain: identifiers.subdomain,
    });

    await use({
      ...userData,
      userId,
      email,
    });

    // Cleanup
    await cleanupTestData({
      userIds: [userId],
      emails: [email],
    });
  },

  // Auto-create test church for each test
  testChurch: async ({}, use) => {
    const identifiers = generateTestIdentifiers("church");
    const churchData: TestChurchData = {
      name: identifiers.name + " Church",
      subdomain: identifiers.subdomain,
      subscriptionStatus: "trialing",
      subscriptionPlan: "basic",
    };

    const setup = await createTestSetup(
      {
        email: identifiers.email,
        password: "TestPassword123!",
        name: identifiers.name,
        emailVerified: true,
      },
      churchData
    );

    await use({
      ...churchData,
      churchId: setup.churchId,
      subdomain: setup.subdomain,
    });

    // Cleanup
    await cleanupTestData({
      userIds: [setup.userId],
      churchIds: [setup.churchId],
      emails: [setup.email],
      subdomains: [setup.subdomain],
    });
  },

  // Complete test setup: user + church + link
  testSetup: async ({}, use) => {
    const identifiers = generateTestIdentifiers("setup");
    const password = "TestPassword123!";

    const setup = await createTestSetup(
      {
        email: identifiers.email,
        password,
        name: identifiers.name,
        emailVerified: true,
      },
      {
        name: identifiers.name + " Church",
        subdomain: identifiers.subdomain,
        subscriptionStatus: "trialing",
        subscriptionPlan: "basic",
      }
    );

    await use({
      ...setup,
      password,
    });

    // Cleanup
    await cleanupTestData({
      userIds: [setup.userId],
      churchIds: [setup.churchId],
      emails: [setup.email],
      subdomains: [setup.subdomain],
    });
  },
});

export { expect } from "@playwright/test";

