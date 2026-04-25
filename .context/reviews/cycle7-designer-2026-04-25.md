# Designer (UI/UX + A11y) -- Cycle 7 (2026-04-25)

## Methodology

Reviewed the Next.js + React + Tailwind UI in source, then verified the main interaction paths in Playwright against the running dev server. Scope covered information architecture, keyboard/focus behavior, WCAG 2.2 a11y patterns, reduced motion, responsive behavior, loading/error states, dark/light mode, and i18n/RTL.

## Findings

### C7-DN-1: Focus is moved to an invisible live region after track load [MEDIUM]

- **Files:** [src/app/page.tsx:200](/Users/hletrd/flash-shared/Travelback/src/app/page.tsx#L200), [src/app/page.tsx:519](/Users/hletrd/flash-shared/Travelback/src/app/page.tsx#L519)
- **Selector / evidence:** `div[role="status"][aria-live="polite"][tabIndex={-1}].sr-only` is focused directly from the `pendingWorkspaceFocus` effect.
- **Scenario:** After loading a sample trip or importing a file, keyboard focus jumps to a status-only element that is visually hidden. Screen readers get the announcement, but sighted keyboard users lose their visible focus target and the next Tab stop is less predictable.
- **Confidence:** High
- **Fix:** Let the live region announce without stealing focus, or move focus to a visible control in the track workspace such as the play button or toolbar. Keep the status node strictly for announcements.

### C7-DN-2: Theme toggle renders the wrong mode icon/label on first paint [LOW]

- **Files:** [src/components/ThemeToggle.tsx:24](/Users/hletrd/flash-shared/Travelback/src/components/ThemeToggle.tsx#L24), [src/components/ThemeToggle.tsx:29](/Users/hletrd/flash-shared/Travelback/src/components/ThemeToggle.tsx#L29), [src/components/ThemeToggle.tsx:33](/Users/hletrd/flash-shared/Travelback/src/components/ThemeToggle.tsx#L33), [src/app/layout.tsx:53](/Users/hletrd/flash-shared/Travelback/src/app/layout.tsx#L53)
- **Selector / evidence:** `const visualMode = hydrated ? effectiveMode : 'light'` forces the SSR/client-pre-hydration icon and aria-label to the light-state branch even when the bootstrap script already set `data-mode="dark"` on `document.documentElement`.
- **Scenario:** Dark-mode users see a light-mode toggle icon and the wrong action label for the first paint/hydration window. The button is technically usable, but the first rendered state is visually inconsistent with the page theme and briefly misleading for assistive tech.
- **Confidence:** Medium
- **Fix:** Derive the visible state from the bootstrapped mode immediately, or render a neutral placeholder until hydration completes. If the current guard is only there to avoid mismatch, align the SSR output with `effectiveMode` instead of hardcoding light.

## Missed-Issue Sweep

- Rechecked the landing page tab order, modal focus trap, file upload validation, map error UI, toast announcements, progress/slider labels, and scene editor semantics. No additional a11y or UX regressions were found.
- The repo’s e2e suite passed for the key UI flows: `PLAYWRIGHT_REUSE_EXISTING_SERVER=1 npm run test:e2e:dev -- --grep "imports GPX file and displays track|loads sample trip from landing CTA|guide modal uses dialog semantics and keeps focus inside the panel"` returned `3 passed`.
- I did not report RTL support as a defect because the app currently exposes only LTR locales (`en`, `ko`, `ja`, `zh`, `es`). That is a product gap for future expansion, not a present bug in the shipped locale set.

## Conclusion

No high-severity UI blockers were found beyond the two issues above. The rest of the UI surface reviewed cleanly under the requested accessibility and responsiveness checks.
