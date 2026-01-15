# E2E Tests

End-to-end tests for the church membership application using Playwright.

## Setup

1. Install dependencies:
```bash
npm install -D @playwright/test
npx playwright install
```

2. Make sure your dev server is running (or it will start automatically):
```bash
npm run dev
```

## Running Tests

```bash
# Run all tests
npx playwright test

# Run tests in UI mode (recommended for development)
npx playwright test --ui

# Run specific test file
npx playwright test auth-flow

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests for specific browser
npx playwright test --project=chromium
```

## Test Structure

- `auth-flow.spec.ts` - Tests for authentication flows including:
  - Login from root domain → subdomain redirect
  - No double login bug
  - Session persistence
  - Protected route access

- `auth-helpers.ts` - Reusable helper functions for auth testing

- `test-fixtures.ts` - Playwright fixtures that automatically create and cleanup test data (users, churches)

- `test-db.ts` - Database helpers for creating test users, churches, and linking them together

- `smoke.spec.ts` - Basic smoke tests to verify page loading and modal opening

## Environment Variables

Set these in your `.env.local`:
- `PLAYWRIGHT_BASE_URL` - Base URL for tests (defaults to http://localhost:3000)
- `POSTGRES_URL_NON_POOLING` - Database connection string (required for test fixtures)
- `BETTER_AUTH_SECRET` - Auth secret (required for creating test users)

## Writing New Tests

1. Use helper functions from `auth-helpers.ts` when possible
2. Use the `testSetup` fixture from `test-fixtures.ts` to get pre-created test users/churches
3. Clear cookies/storage in `beforeEach` hooks
4. Use descriptive test names that explain the scenario
5. Wait for network idle and session loads when testing auth flows

### Example Test with Fixtures

```typescript
import { test, expect } from './test-fixtures';
import { loginFromRootDomain } from './auth-helpers';

test('my test', async ({ page, testSetup }) => {
  // testSetup provides:
  // - email, password, name (user credentials)
  // - subdomain, churchId (church info)
  // - userId, churchId (IDs)
  // All automatically cleaned up after the test
  
  await loginFromRootDomain(page, testSetup.email, testSetup.password);
  // ... rest of test
});
```

## Debugging

```bash
# Open Playwright Inspector
npx playwright test --debug

# Generate test code from actions
npx playwright codegen http://localhost:3000
```

