# E2E Tests

End-to-end tests for the church membership application using Playwright.

## Setup

1. Install dependencies:
```bash
npm install
npx playwright install
```

2. The dev server starts automatically when running tests.

## Running Tests

```bash
# Run all tests
npm run test:e2e

# Run tests in UI mode
npm run test:e2e:ui

# Run specific test file
npx playwright test smoke
npx playwright test auth-flow

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

## Test Structure

- `smoke.spec.ts` - Root page load, sign-in modal
- `auth-flow.spec.ts` - Forgot password form, verified email redirect param

## Environment Variables

Set these in `.env.local`:
- `BETTER_AUTH_SECRET` - Auth (for forgot password flow)

## Debugging

```bash
npx playwright test --debug
npx playwright codegen http://localhost:3000
```
