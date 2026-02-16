import { test, expect } from '@playwright/test';

/**
 * Auth tests - forgot password, verified email redirect
 */
test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('should show forgot password form', async ({ page }) => {
    await page.goto('/forgot-password', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /Reset Your Password/i })).toBeVisible({ timeout: 5000 });
    await page.getByLabel(/email/i).first().fill('test@example.com');
    await page.getByRole('button', { name: /Send Reset Link/i }).click();
    // Either success message or we stay on page (email may not exist)
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toContain('forgot-password');
  });

  test('should handle verified email redirect param', async ({ page }) => {
    await page.goto('/?verified=true&signin=true', { waitUntil: 'networkidle' });
    // Login modal should open for verified users to sign in
    await expect(page.locator('text=Sign in to your account')).toBeVisible({ timeout: 5000 });
  });
});
