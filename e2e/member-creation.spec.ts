import { test, expect } from './test-fixtures';
import { loginFromRootDomain, waitForSessionLoad } from './auth-helpers';

test.describe('Member Creation', () => {
  test.beforeEach(async ({ context }) => {
    // Clear all cookies before each test
    await context.clearCookies();
  });

  test('should create a member in an existing household', async ({ page, testSetup }) => {
    // Login and navigate to membership page
    await loginFromRootDomain(page, testSetup.email, testSetup.password);
    await waitForSessionLoad(page);

    // Navigate to membership page
    await page.goto(`http://${testSetup.subdomain}.localhost:3000/membership`, {
      waitUntil: 'networkidle',
    });

    // Wait for page to load
    await expect(
      page.locator('h1:has-text("Member Directory"), button:has-text("Create Household")')
    ).toBeVisible({ timeout: 10000 });

    // First, create a household to add the member to
    const householdName = `Test Household ${Date.now()}`;
    
    // Click the "Create Household" button
    await page.click('button:has-text("Create Household")');
    
    // Wait for the dialog to open
    await expect(page.locator('text=Create New Household')).toBeVisible({ timeout: 5000 });
    
    // Fill in household name
    await page.getByLabel('Household Name').fill(householdName);
    
    // Submit the form
    const submitButton = page
      .locator('[role="dialog"] button[type="submit"]:has-text("Create Household")')
      .first();
    await submitButton.click();
    
    // Wait for the dialog to close
    await expect(page.locator('text=Create New Household')).not.toBeVisible({ timeout: 10000 });
    
    // Wait for the list to refresh
    await page.waitForTimeout(1000);
    
    // Verify the household appears in the list
    await expect(page.locator(`text=${householdName}`)).toBeVisible({ timeout: 10000 });
    
    // Click on the household row to navigate to its page
    // The table row is clickable and navigates to the household page
    const householdRow = page.locator(`tr:has-text("${householdName}")`).first();
    await householdRow.click();
    
    // Wait for navigation to household page
    await page.waitForURL(/\/membership\/household\/[^/]+/, { timeout: 10000 });
    
    // Wait for the household page to load
    await expect(page.locator('text=Add Member')).toBeVisible({ timeout: 10000 });
    
    // Click "Add Member" button to open the dialog
    await page.click('button:has-text("Add Member")');
    
    // Wait for the dialog to open
    await expect(page.locator('text=Add Member to Household')).toBeVisible({ timeout: 5000 });
    
    // Fill in required member fields
    const firstName = 'John';
    const lastName = 'Doe';
    
    await page.getByLabel('First Name *').fill(firstName);
    await page.getByLabel('Last Name *').fill(lastName);
    
    // Optionally fill in additional fields
    await page.getByLabel('Email').fill('john.doe@example.com');
    await page.getByLabel('Phone').fill('555-1234');
    
    // Submit the form
    const addMemberSubmitButton = page
      .locator('[role="dialog"] button[type="submit"]:has-text("Add Member")')
      .first();
    await addMemberSubmitButton.click();
    
    // Wait for the dialog to close
    await expect(page.locator('text=Add Member to Household')).not.toBeVisible({ timeout: 10000 });
    
    // Wait a moment for the list to refresh
    await page.waitForTimeout(1000);
    
    // Verify the member appears in the household members list
    // The member should be displayed with their name
    await expect(page.locator(`text=${firstName} ${lastName}`)).toBeVisible({ timeout: 10000 });
  });

  test('should create a member with minimal required fields', async ({ page, testSetup }) => {
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

    // Create a household first
    const householdName = `Test Household ${Date.now()}`;
    
    await page.click('button:has-text("Create Household")');
    await expect(page.locator('text=Create New Household')).toBeVisible({ timeout: 5000 });
    await page.getByLabel('Household Name').fill(householdName);
    
    const submitButton = page
      .locator('[role="dialog"] button[type="submit"]:has-text("Create Household")')
      .first();
    await submitButton.click();
    
    await expect(page.locator('text=Create New Household')).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    await expect(page.locator(`text=${householdName}`)).toBeVisible({ timeout: 10000 });
    
    // Navigate to household page by clicking the table row
    const householdRow = page.locator(`tr:has-text("${householdName}")`).first();
    await householdRow.click();
    await page.waitForURL(/\/membership\/household\/[^/]+/, { timeout: 10000 });
    await expect(page.locator('text=Add Member')).toBeVisible({ timeout: 10000 });
    
    // Open add member dialog
    await page.click('button:has-text("Add Member")');
    await expect(page.locator('text=Add Member to Household')).toBeVisible({ timeout: 5000 });
    
    // Fill in only required fields
    const firstName = `Jane${Date.now()}`;
    const lastName = `Smith${Date.now()}`;
    
    await page.getByLabel('First Name *').fill(firstName);
    await page.getByLabel('Last Name *').fill(lastName);
    
    // Submit the form
    const addMemberSubmitButton = page
      .locator('[role="dialog"] button[type="submit"]:has-text("Add Member")')
      .first();
    await addMemberSubmitButton.click();
    
    // Wait for the dialog to close
    await expect(page.locator('text=Add Member to Household')).not.toBeVisible({ timeout: 10000 });
    
    // Wait for the list to refresh
    await page.waitForTimeout(1000);
    
    // Verify the member appears in the list
    await expect(page.locator(`text=${firstName} ${lastName}`)).toBeVisible({ timeout: 10000 });
  });
});
