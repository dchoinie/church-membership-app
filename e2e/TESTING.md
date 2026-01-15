# E2E Testing Guide

## Current Status

✅ **Basic setup complete** - Playwright is configured and smoke tests pass
⚠️ **Auth tests need test data** - Auth flow tests require test users/churches to be set up

## Running Tests

```bash
# Run all tests
npm run test:e2e

# Run smoke tests only (these work without setup)
npx playwright test smoke

# Run in UI mode (recommended for debugging)
npm run test:e2e:ui

# Run specific test file
npx playwright test auth-flow

# Run with debug mode
npm run test:e2e:debug
```

## Test Structure

### Smoke Tests (`smoke.spec.ts`)
- ✅ Basic page loading
- ✅ UI interactions (modals, buttons)
- ✅ No database setup required

### Auth Flow Tests (`auth-flow.spec.ts`)
- ⚠️ Requires test users and churches
- ⚠️ Needs database setup/teardown
- Tests:
  - Login from root domain → subdomain redirect
  - No double login bug
  - Session persistence
  - Protected route access

## Making Auth Tests Work

To make the auth flow tests fully functional, you need:

1. **Test Database Setup**
   - Create a test database or use a separate schema
   - Set up test users and churches before tests
   - Clean up after tests

2. **Test User Creation**
   - Create verified test users (or mock email verification)
   - Create test churches with subdomains
   - Set up test subscriptions

3. **Environment Variables**
   ```env
   # Test database
   DATABASE_URL_TEST=...
   
   # Test email (for verification)
   TEST_EMAIL_VERIFICATION=true
   ```

## Current Issues

The auth flow tests are timing out because:
- They try to create/login with users that may not exist
- Email verification is required but not mocked
- Database state isn't reset between tests

## Next Steps

1. Set up test database fixtures
2. Create test user/church helpers that work with your database
3. Mock or skip email verification for tests
4. Add proper cleanup between tests

## Example Test Helper (to implement)

```typescript
// e2e/test-helpers.ts
export async function createTestUserWithChurch(
  db: Database,
  user: TestUser,
  church: TestChurch
): Promise<void> {
  // Create church in database
  // Create user in database  
  // Mark email as verified
  // Set up subscription
}
```

