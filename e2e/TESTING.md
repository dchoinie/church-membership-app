# E2E Testing Guide

## Current Status

✅ **Critical flows** - Smoke, auth basics (forgot password, verified email)

## Running Tests

```bash
# Run all tests
npm run test:e2e

# Run smoke tests only
npx playwright test smoke

# Run in UI mode
npm run test:e2e:ui

# Run with debug mode
npm run test:e2e:debug
```

## Test Structure

| Spec | Tests |
|------|-------|
| `smoke.spec.ts` | Root page load, sign-in modal |
| `auth-flow.spec.ts` | Forgot password form, verified email param |

## Environment Variables

- `BETTER_AUTH_SECRET` - Auth (for forgot password flow)

## Debugging

```bash
npx playwright test --debug
npx playwright codegen http://localhost:3000
```
