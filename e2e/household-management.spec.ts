import { test, expect } from './test-fixtures';
import { loginFromRootDomain, waitForSessionLoad } from './auth-helpers';

test.describe('Household Management', () => {
  test.beforeEach(async ({ context }) => {
    // Clear all cookies before each test
    await context.clearCookies();
  });

  test('should create a household successfully', async ({ page, testSetup }) => {
    // Login and navigate to membership page
    await loginFromRootDomain(page, testSetup.email, testSetup.password);
    await waitForSessionLoad(page);

    // Navigate to membership page
    await page.goto(`http://${testSetup.subdomain}.localhost:3000/membership`, {
      waitUntil: 'networkidle',
    });

    // Wait for page to load - check for either "Member Directory" heading or the Create Household button
    await expect(
      page.locator('h1:has-text("Member Directory"), button:has-text("Create Household")')
    ).toBeVisible({ timeout: 10000 });

    // Click the "Create Household" button to open the dialog
    await page.click('button:has-text("Create Household")');

    // Wait for the dialog to open
    await expect(page.locator('text=Create New Household')).toBeVisible({ timeout: 5000 });

    // Fill in household name using the form field
    await page.getByLabel('Household Name').fill('Smith Family');

    // Select household type - click the select trigger and then select "Family"
    await page.getByLabel('Household Type').click();
    await page.getByRole('option', { name: 'Family' }).click();

    // Optionally fill in address fields (not required, but good to test)
    await page.getByLabel('Address').fill('123 Main St');
    await page.getByLabel('Address 2').fill('Apt 4B');
    await page.getByLabel('City').fill('Springfield');

    // Select state
    await page.getByLabel('State').click();
    await page.getByRole('option', { name: 'IL - Illinois' }).click();

    await page.getByLabel('ZIP Code').fill('62701');

    // Submit the form - find the submit button in the dialog footer
    const submitButton = page
      .locator('[role="dialog"] button[type="submit"]:has-text("Create Household")')
      .first();
    await submitButton.click();

    // Wait for the dialog to close (indicates successful submission)
    await expect(page.locator('text=Create New Household')).not.toBeVisible({ timeout: 10000 });

    // Wait a moment for the list to refresh
    await page.waitForTimeout(1000);

    // Verify the household appears in the list
    await expect(page.locator('text=Smith Family')).toBeVisible({ timeout: 10000 });

    // Verify the household type is displayed (should be in the same row)
    await expect(page.locator('text=Family')).toBeVisible();
  });

  test('should create a household with minimal required fields', async ({ page, testSetup }) => {
    // Login and navigate to membership page
    await loginFromRootDomain(page, testSetup.email, testSetup.password);
    await waitForSessionLoad(page);

    await page.goto(`http://${testSetup.subdomain}.localhost:3000/membership`, {
      waitUntil: 'networkidle',
    });

    // Wait for page to load
    await expect(
      page.locator('h1:has-text("Member Directory"), button:has-text("Create Household")')
    ).toBeVisible({ timeout: 10000 });

    // Open create household dialog
    await page.click('button:has-text("Create Household")');
    await expect(page.locator('text=Create New Household')).toBeVisible({ timeout: 5000 });

    // Fill in only household name (type defaults to "single")
    const householdName = `Test Household ${Date.now()}`;
    await page.getByLabel('Household Name').fill(householdName);

    // Submit the form
    const submitButton = page
      .locator('[role="dialog"] button[type="submit"]:has-text("Create Household")')
      .first();
    await submitButton.click();

    // Wait for the dialog to close
    await expect(page.locator('text=Create New Household')).not.toBeVisible({ timeout: 10000 });

    // Wait a moment for the list to refresh
    await page.waitForTimeout(1000);

    // Verify the household appears in the list
    await expect(page.locator(`text=${householdName}`)).toBeVisible({ timeout: 10000 });
  });
});
