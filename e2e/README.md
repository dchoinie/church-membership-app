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

## Environment Variables

Set these in your `.env.local`:
- `PLAYWRIGHT_BASE_URL` - Base URL for tests (defaults to http://localhost:3000)

## Writing New Tests

1. Use helper functions from `auth-helpers.ts` when possible
2. Clear cookies/storage in `beforeEach` hooks
3. Use descriptive test names that explain the scenario
4. Wait for network idle and session loads when testing auth flows

## Debugging

```bash
# Open Playwright Inspector
npx playwright test --debug

# Generate test code from actions
npx playwright codegen http://localhost:3000
```

