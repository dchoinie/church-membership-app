/**
 * Test to verify fixtures work correctly
 * This is a simple test to ensure test data creation and cleanup works
 */

import { test, expect } from "./test-fixtures";
import { loginFromRootDomain } from "./auth-helpers";

test.describe("Test Fixtures", () => {
  test("should create and cleanup test setup", async ({ testSetup, page }) => {
    // Verify test setup was created
    expect(testSetup.email).toBeTruthy();
    expect(testSetup.subdomain).toBeTruthy();
    expect(testSetup.userId).toBeTruthy();
    expect(testSetup.churchId).toBeTruthy();

    // Use the login helper function
    await loginFromRootDomain(page, testSetup.email, testSetup.password);

    // Verify we're on the correct subdomain
    expect(page.url()).toContain(testSetup.subdomain);
  });

  test("should create separate test setups for each test", async ({ testSetup: setup1 }) => {
    // This test will have a different testSetup
    expect(setup1.email).toBeTruthy();
    expect(setup1.subdomain).toBeTruthy();
  });
});

