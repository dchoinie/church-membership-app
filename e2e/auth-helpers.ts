import { Page, expect } from '@playwright/test';

/**
 * Helper functions for authentication testing
 */

export interface TestUser {
  email: string;
  password: string;
  name: string;
}

export interface TestChurch {
  name: string;
  subdomain: string;
}

/**
 * Create a test user account
 */
export async function createTestUser(
  page: Page,
  user: TestUser,
  church: TestChurch
): Promise<void> {
  // Navigate to root domain
  await page.goto('/');
  
  // Click "Get Started" to open signup dialog
  await page.click('button:has-text("Get Started")');
  
  // Wait for signup dialog
  await expect(page.locator('text=Create Your Church')).toBeVisible();
  
  // Fill in church information
  await page.fill('input[name="churchName"]', church.name);
  await page.fill('input[name="subdomain"]', church.subdomain);
  
  // Wait for subdomain validation
  await page.waitForTimeout(500);
  
  // Fill in admin account information
  await page.fill('input[name="adminName"]', user.name);
  await page.fill('input[name="adminEmail"]', user.email);
  await page.fill('input[name="adminPassword"]', user.password);
  
  // Select plan (basic)
  await page.selectOption('select[name="plan"]', 'basic');
  
  // Submit form
  await page.click('button:has-text("Create Church")');
  
  // Wait for success message
  await expect(page.locator('text=Church Created Successfully')).toBeVisible({ timeout: 10000 });
}

/**
 * Login from root domain
 */
export async function loginFromRootDomain(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  // Navigate to root domain
  await page.goto('/');
  
  // Click "Sign In" button - use first() to handle multiple buttons
  await page.locator('button:has-text("Sign In")').first().click();
  
  // Wait for login dialog
  await expect(page.locator('text=Sign in to your account')).toBeVisible({ timeout: 10000 });
  
  // Fill in credentials - use specific selectors for login dialog
  const emailInput = page.locator('[role="dialog"] input[type="email"], dialog input[type="email"]').first();
  const passwordInput = page.locator('[role="dialog"] input[type="password"], dialog input[type="password"]').first();
  
  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill(email);
  await passwordInput.waitFor({ state: 'visible' });
  await passwordInput.fill(password);
  
  // Submit login form - target the submit button (type="submit"), not the tab
  await page.locator('[role="dialog"] button[type="submit"]:has-text("Sign In"), dialog button[type="submit"]:has-text("Sign In")').click();
  
  // Wait for navigation (should redirect to subdomain)
  // Allow both root domain redirects and subdomain redirects
  await page.waitForURL(/\/dashboard|\/setup|http:\/\/.*\.localhost:3000\/(dashboard|setup)/, { timeout: 30000 });
}

/**
 * Login from subdomain
 */
export async function loginFromSubdomain(
  page: Page,
  subdomain: string,
  email: string,
  password: string
): Promise<void> {
  // Navigate to subdomain
  await page.goto(`http://${subdomain}.localhost:3000/`, { waitUntil: 'networkidle' });
  
  // Wait for page to load and session check
  await page.waitForLoadState('networkidle');
  
  // Wait for login dialog to auto-open (if not authenticated)
  // It should wait for session to load first
  await expect(page.locator('text=Sign in to your account')).toBeVisible({ timeout: 10000 });
  
  // Fill in credentials - use specific selectors for login dialog
  const emailInput = page.locator('[role="dialog"] input[type="email"], dialog input[type="email"]').first();
  const passwordInput = page.locator('[role="dialog"] input[type="password"], dialog input[type="password"]').first();
  
  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill(email);
  await passwordInput.waitFor({ state: 'visible' });
  await passwordInput.fill(password);
  
  // Submit login form - target the submit button
  await page.locator('[role="dialog"] button[type="submit"]:has-text("Sign In"), dialog button[type="submit"]:has-text("Sign In")').click();
  
  // Wait for navigation
  await page.waitForURL(/\/dashboard|\/setup/, { timeout: 10000 });
}

/**
 * Check if user is authenticated (on subdomain)
 */
export async function expectAuthenticated(page: Page, subdomain: string): Promise<void> {
  await page.goto(`http://${subdomain}.localhost:3000/dashboard`);
  await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 5000 });
}

/**
 * Check if user is redirected to login
 */
export async function expectRedirectedToLogin(page: Page): Promise<void> {
  // Should be on root domain with login modal open
  await expect(page).toHaveURL(/\/\?login=true/);
  await expect(page.locator('text=Sign in to your account')).toBeVisible();
}

/**
 * Wait for session to load (check for loading state to disappear)
 */
export async function waitForSessionLoad(page: Page): Promise<void> {
  // Wait for any loading indicators to disappear
  await page.waitForLoadState('networkidle');
  // Small delay to ensure session state is updated
  await page.waitForTimeout(500);
}

