import { test, expect } from './test-fixtures';
import {
  loginFromRootDomain,
  loginFromSubdomain,
  waitForSessionLoad,
} from './auth-helpers';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ context }) => {
    // Clear all cookies before each test
    // Note: localStorage/sessionStorage are domain-specific and will be cleared
    // automatically when we navigate to a new domain/page
    await context.clearCookies();
  });

  test('should create account and redirect to subdomain', async ({ page, testSetup }) => {
    // Navigate to root domain
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Click "Get Started" to open signup dialog
    await page.locator('button:has-text("Get Started")').first().click();
    
    // Wait for signup dialog
    await expect(page.locator('text=Create Your Church')).toBeVisible();
    
    // Fill in church information
    await page.fill('input[name="churchName"]', testSetup.subdomain + ' Church');
    await page.fill('input[name="subdomain"]', testSetup.subdomain);
    
    // Wait for subdomain validation
    await page.waitForTimeout(500);
    
    // Fill in admin account information
    await page.fill('input[name="adminName"]', 'Test Admin');
    await page.fill('input[name="adminEmail"]', testSetup.email);
    await page.fill('input[name="adminPassword"]', testSetup.password);
    
    // Select plan (basic)
    await page.selectOption('select[name="plan"]', 'basic');
    
    // Submit form
    await page.click('button:has-text("Create Church")');
    
    // Should show success message
    await expect(page.locator('text=Church Created Successfully')).toBeVisible({ timeout: 10000 });
  });

  test('should login from root domain and redirect to subdomain dashboard', async ({ page, testSetup }) => {
    // Login from root domain using the test setup
    await loginFromRootDomain(page, testSetup.email, testSetup.password);
    
    // Should redirect to subdomain (either /dashboard or /setup)
    // Wait for URL to change to subdomain
    await page.waitForURL(/http:\/\/.*\.localhost:3000\/(dashboard|setup)/, { timeout: 10000 });
    
    // Should NOT see login modal again (no double login)
    await expect(page.locator('text=Sign in to your account')).not.toBeVisible({ timeout: 2000 });
    
    // Should be on dashboard or setup page
    const url = page.url();
    expect(url).toMatch(/\/dashboard|\/setup/);
  });

  test('should NOT show login modal twice after redirect from root domain', async ({ page, testSetup }) => {
    // This is the critical test for the bug we fixed
    
    // Login from root domain
    await loginFromRootDomain(page, testSetup.email, testSetup.password);
    
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

  test('should login from subdomain directly', async ({ page, testSetup }) => {
    await loginFromSubdomain(page, testSetup.subdomain, testSetup.email, testSetup.password);
    
    // Should redirect to dashboard or setup
    await page.waitForURL(/\/dashboard|\/setup/, { timeout: 10000 });
    
    // Should be authenticated
    const url = page.url();
    expect(url).toMatch(/\/dashboard|\/setup/);
  });

  test('should redirect unauthenticated user to login when accessing protected route', async ({ page, testSetup }) => {
    // Try to access protected route without authentication
    await page.goto(`http://${testSetup.subdomain}.localhost:3000/dashboard`);
    
    // Should redirect to root domain with login=true
    await page.waitForURL(/\/\?login=true/, { timeout: 5000 });
    
    // Login modal should be open
    await expect(page.locator('text=Sign in to your account')).toBeVisible();
  });

  test('should maintain session across page navigations', async ({ page, testSetup }) => {
    // Login first
    await loginFromRootDomain(page, testSetup.email, testSetup.password);
    
    // Wait for redirect and session load
    await waitForSessionLoad(page);
    
    // Navigate to different pages
    await page.goto(`http://${testSetup.subdomain}.localhost:3000/dashboard`);
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 5000 });
    
    await page.goto(`http://${testSetup.subdomain}.localhost:3000/settings`);
    // Should still be authenticated (not redirected to login)
    await expect(page.url()).toContain('/settings');
    expect(page.url()).not.toContain('?login=true');
  });

  test('should handle session loading state correctly', async ({ page, testSetup }) => {
    // Navigate to subdomain root
    await page.goto(`http://${testSetup.subdomain}.localhost:3000/`, { waitUntil: 'networkidle' });
    
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

