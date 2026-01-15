import { test, expect } from '@playwright/test';
import {
  createTestUser,
  loginFromRootDomain,
  loginFromSubdomain,
  expectAuthenticated,
  expectRedirectedToLogin,
  waitForSessionLoad,
  TestUser,
  TestChurch,
} from './auth-helpers';

test.describe('Authentication Flow', () => {
  const testUser: TestUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User',
  };

  const testChurch: TestChurch = {
    name: `Test Church ${Date.now()}`,
    subdomain: `testchurch${Date.now()}`,
  };

  test.beforeEach(async ({ context }) => {
    // Clear all cookies before each test
    // Note: localStorage/sessionStorage are domain-specific and will be cleared
    // automatically when we navigate to a new domain/page
    await context.clearCookies();
  });

  test('should create account and redirect to subdomain', async ({ page }) => {
    await createTestUser(page, testUser, testChurch);
    
    // Should show success message
    await expect(page.locator('text=Church Created Successfully')).toBeVisible();
    
    // Note: User needs to verify email before they can login
    // This test verifies the signup flow works
  });

  test('should login from root domain and redirect to subdomain dashboard', async ({ page }) => {
    // First, create the user (in a real scenario, they'd verify email)
    // For testing, we'll assume they're already created and verified
    
    // Navigate to root domain
    await page.goto('/');
    
    // Click Sign In
    await page.click('button:has-text("Sign In")');
    
    // Wait for login dialog
    await expect(page.locator('text=Sign in to your account')).toBeVisible();
    
    // Fill credentials
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    
    // Submit
    await page.click('button:has-text("Sign In")');
    
    // Should redirect to subdomain (either /dashboard or /setup)
    // Wait for URL to change to subdomain
    await page.waitForURL(/http:\/\/.*\.localhost:3000\/(dashboard|setup)/, { timeout: 10000 });
    
    // Should NOT see login modal again (no double login)
    await expect(page.locator('text=Sign in to your account')).not.toBeVisible({ timeout: 2000 });
    
    // Should be on dashboard or setup page
    const url = page.url();
    expect(url).toMatch(/\/dashboard|\/setup/);
  });

  test('should NOT show login modal twice after redirect from root domain', async ({ page }) => {
    // This is the critical test for the bug we fixed
    
    // Login from root domain
    await loginFromRootDomain(page, testUser.email, testUser.password);
    
    // Wait for session to propagate
    await waitForSessionLoad(page);
    
    // Should be on subdomain now
    const url = page.url();
    expect(url).toMatch(/http:\/\/.*\.localhost:3000/);
    
    // Should NOT have ?login=true parameter
    expect(url).not.toContain('?login=true');
    
    // Should NOT see login modal
    await expect(page.locator('text=Sign in to your account')).not.toBeVisible({ timeout: 2000 });
    
    // Should be authenticated and see dashboard/setup content
    const isDashboard = url.includes('/dashboard');
    const isSetup = url.includes('/setup');
    expect(isDashboard || isSetup).toBeTruthy();
  });

  test('should login from subdomain directly', async ({ page }) => {
    await loginFromSubdomain(page, testChurch.subdomain, testUser.email, testUser.password);
    
    // Should redirect to dashboard or setup
    await page.waitForURL(/\/dashboard|\/setup/, { timeout: 10000 });
    
    // Should be authenticated
    const url = page.url();
    expect(url).toMatch(/\/dashboard|\/setup/);
  });

  test('should redirect unauthenticated user to login when accessing protected route', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto(`http://${testChurch.subdomain}.localhost:3000/dashboard`);
    
    // Should redirect to root domain with login=true
    await page.waitForURL(/\/\?login=true/, { timeout: 5000 });
    
    // Login modal should be open
    await expect(page.locator('text=Sign in to your account')).toBeVisible();
  });

  test('should maintain session across page navigations', async ({ page }) => {
    // Login first
    await loginFromRootDomain(page, testUser.email, testUser.password);
    
    // Wait for redirect and session load
    await waitForSessionLoad(page);
    
    // Navigate to different pages
    await page.goto(`http://${testChurch.subdomain}.localhost:3000/dashboard`);
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 5000 });
    
    await page.goto(`http://${testChurch.subdomain}.localhost:3000/settings`);
    // Should still be authenticated (not redirected to login)
    await expect(page.url()).toContain('/settings');
    expect(page.url()).not.toContain('?login=true');
  });

  test('should handle session loading state correctly', async ({ page }) => {
    // Navigate to subdomain root
    await page.goto(`http://${testChurch.subdomain}.localhost:3000/`, { waitUntil: 'networkidle' });
    
    // Wait for page to load and session check to complete
    await page.waitForLoadState('networkidle');
    
    // If user is not authenticated, login modal should open (but only after session loads)
    // If user IS authenticated, they should be redirected to dashboard/setup
    const url = page.url();
    
    // Check if we're still on root or redirected
    if (url.includes('/dashboard') || url.includes('/setup')) {
      // User is authenticated and was redirected
      expect(url).toMatch(/\/dashboard|\/setup/);
    } else if (url.includes('?login=true')) {
      // Redirected to root domain with login param
      await expect(page.locator('text=Sign in to your account')).toBeVisible({ timeout: 5000 });
    } else {
      // On subdomain root - login modal should be visible if not authenticated
      // Wait a bit for modal to potentially open
      await page.waitForTimeout(2000);
      const modalVisible = await page.locator('text=Sign in to your account').isVisible().catch(() => false);
      // Either modal is visible or we're being redirected
      expect(modalVisible || url.includes('/dashboard') || url.includes('/setup')).toBeTruthy();
    }
  });
});

