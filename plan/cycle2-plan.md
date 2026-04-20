# Cycle 2 Implementation Plan

## Issues to Fix

### Issue 1: E2E test strict mode violation
- **Root cause**: `e2e/travelback.spec.ts` line 941 uses `page.locator('text=/Unsupported file format|parse|error/i')` which matches both the app error alert (`<p role="alert">Unsupported file format</p>`) AND the Next.js dev overlay label (`<span>Console Error</span>`). Playwright strict mode requires exactly 1 element match.
- **Fix**: Replace the generic text locator with a role-based locator that specifically targets the alert element:
  - Change: `page.locator('text=/Unsupported file format|parse|error/i')`
  - To: `page.getByRole('alert', { name: /Unsupported file format/i })`
  - Or: `page.locator('[role="alert"]', { hasText: /Unsupported file format/i })`
- **File**: `e2e/travelback.spec.ts` line 941
- **Status**: TODO

### Issue 2: Hydration mismatch triggers Next.js dev overlay in E2E tests
- **Root cause**: The bootstrap script in `layout.tsx` sets `data-mode`/`data-mapstyle`/`lang` on `<html>` before React hydrates. The `useState` initializers in `page.tsx` read these attributes, causing child components to render differently than the server-rendered HTML. While `suppressHydrationWarning` is on `<html>`, it only suppresses the top-level element mismatch -- not child component mismatches. In dev mode, this triggers the Next.js error overlay which then interferes with E2E test locators.
- **Fix options**:
  - (A) Add `suppressHydrationWarning` to the `<body>` element and key container elements
  - (B) In the E2E playwright config, dismiss or hide the Next.js dev overlay before assertions (e.g., click the collapse button on the overlay)
  - (C) Preferred: Hide the Next.js dev overlay in E2E by adding a CSS rule or config option. The playwright config already uses headless Chromium, but the dev overlay still renders.
- **Impact**: Dev-only issue. Production static export is unaffected.
- **File**: `e2e/travelback.spec.ts` or `playwright.config.ts`
- **Status**: TODO

## Deferred Items
(none this cycle)
