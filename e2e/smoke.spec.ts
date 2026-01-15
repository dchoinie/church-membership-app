import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should load the root page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Check for the main heading - use getByRole for more specific matching
    await expect(page.getByRole('heading', { name: /Complete Church Management/i })).toBeVisible({ timeout: 10000 });
  });

  test('should open sign in modal when clicking Sign In button', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Click Sign In button
    await page.locator('button:has-text("Sign In")').first().click();
    
    // Wait for login dialog
    await expect(page.locator('text=Sign in to your account')).toBeVisible({ timeout: 10000 });
  });
});

