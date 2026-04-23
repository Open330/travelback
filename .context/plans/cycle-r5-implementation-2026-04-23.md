# Cycle r5 — Implementation Plan (2026-04-23)

## Inputs

- Aggregate: `.context/reviews/_aggregate.md`
- Per-agent lanes: `.context/reviews/cycle-r5-*.md` (12 files)
- User-injected TODO queue: empty at cycle start
- Cycle-r4 carryovers: `.context/plans/deferred-findings-cycle-r4-2026-04-23.md`

## Scheduled items

### P-1 (LOW) — Drop the duplicate `menuRef` from TrackToolbar mobile menu

- **Source**: R5-AGG-1 / CR-1 / CT-1 / T-1 / DB-1.
- **File**: `src/components/TrackToolbar.tsx:155`.
- **Change**: delete the `ref={menuRef}` attribute on the inner `<div role="menu">` (keep only the outer wrapper ref at L134). Add a one-line comment explaining the single-ref invariant.
- **Risk**: very low. `useFocusFirstOnOpen` still resolves the first `<button>` descendant through the outer wrapper.
- **Verification**: e2e test `'mobile header layout keeps the action bar compact after a track loads'` still passes; manual tap on the Settings gear should toggle open→closed cleanly without flicker.

### P-2 (LOW) — FileUpload `handleDragLeave` should debounce via `scheduleDragEnd`

- **Source**: R5-AGG-2 / CR-2 / CT-2 / T-2 / DB-2.
- **File**: `src/components/FileUpload.tsx:116-119`.
- **Change**: replace the body of `handleDragLeave` with `e.preventDefault(); scheduleDragEnd()`. Remove the synchronous `setIsDragging(false)`.
- **Risk**: very low. The behavior becomes "exit then bounce-back does not flicker". Existing e2e coverage does not exercise drag events; change is invisible to tests.

### P-3 (LOW) — `GlobalToolbar` language select focus-visible ring

- **Source**: R5-AGG-3 / CR-3 / UX-2 / A11Y-2.
- **File**: `src/components/GlobalToolbar.tsx:53`.
- **Change**: append ` focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]` to the `className`.
- **Risk**: none.

### P-4 (LOW) — `TimelineSelector` reset button focus-visible ring

- **Source**: R5-AGG-4 / CT-3 / UX-1 / A11Y-1.
- **File**: `src/components/TimelineSelector.tsx:498-511`.
- **Change**: append ` focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))] rounded-md` to the `className` on the reset button. Use `rounded-md` to keep the outline shape crisp for a small icon button.
- **Risk**: none.

### P-5 (LOW) — Add landmark roles to SceneEditor and JourneyCreator panels

- **Source**: R5-AGG-5 / AR-3 / AR-4 / UX-4 / A11Y-3 / A11Y-4.
- **Files**:
  - `src/components/SceneEditor.tsx:352-356`:
    - Add `role="region" aria-labelledby="scene-editor-title"` to the outer `<div data-testid="scene-editor-panel">`.
    - Add `id="scene-editor-title"` to the existing `<h3>` at L356.
  - `src/components/JourneyCreator.tsx:537-544`:
    - Add `role="region" aria-labelledby="journey-creator-title"` to the outer `<div data-testid="journey-creator-panel">`.
    - Add `id="journey-creator-title"` to the existing `<span>` at L542-544.
- **Risk**: very low. Both regions become reachable by landmark navigation; no visual change.

### P-6 (LOW) — JourneyCreator "Cancel" button `type="button"`

- **Source**: R5-AGG-6 / CT-4 / UX-3 / A11Y-5.
- **File**: `src/components/JourneyCreator.tsx:546`.
- **Change**: add `type="button"` to the `<button>`.
- **Risk**: none.

### P-7 (LOW) — e2e `<main>` landmark assertion

- **Source**: R5-AGG-7 / TE-1 / A11Y-8.
- **File**: `e2e/travelback.spec.ts`.
- **Change**: add a new test near the top of the describe:

```ts
test('exposes a main landmark at the app root', async ({ page }) => {
  const main = page.locator('main#app[data-travelback-app-root="true"]')
  await expect(main).toBeAttached()
})
```

- **Risk**: none.

### P-8 (LOW) — Smoke static CSP assertions for `object-src` / `base-uri`

- **Source**: R5-AGG-8 / TE-2.
- **File**: `scripts/smoke-static.mjs:76-110` (`assertStaticCspWasHardened`).
- **Change**: add two assertions:

```js
if (!csp.includes("object-src 'none'")) {
  throw new Error("Static CSP must declare object-src 'none'")
}
if (!csp.includes("base-uri 'none'")) {
  throw new Error("Static CSP must declare base-uri 'none'")
}
```

- **Risk**: none; `harden-static-export.mjs` already emits both directives.

### P-9 (DOC) — Architecture doc note for new region landmarks

- **Source**: R5-AGG-9 / DS-5.
- **File**: `.context/project/02-architecture.md`.
- **Change**: append one sentence to the "Security hardening note" / accessibility section stating that as of cycle r5, the Scene Editor and Journey Creator panels are named regions (via `role="region"` + `aria-labelledby`) for screen-reader landmark navigation.

## Deferred

See `.context/plans/deferred-findings-cycle-r5-2026-04-23.md`. Strict rules applied:
- Every finding has file+line, original severity/confidence (no downgrade), concrete reason, exit criterion.
- Security/correctness/data-loss items are deferred only where repo rules permit (R4-AGG-D9 Nominatim carryover has the `.context/project/02-architecture.md` host-layer exception already documented).
- No new refactor/feature ideas added under "deferred" — only real findings.

## Progress

- P-1 — DONE
- P-2 — DONE
- P-3 — DONE
- P-4 — DONE
- P-5 — DONE
- P-6 — DONE (bundled with P-5 in the JourneyCreator commit)
- P-7 — DONE
- P-8 — DONE
- P-9 — DONE

All nine scheduled items implemented in cycle r5.

## Gates after implementation

Will be re-run at the end of cycle r5:
- ESLint
- TypeScript
- Next.js build (+ `harden-static-export`)
- `npm run smoke:static` (with new object-src/base-uri assertions)
- `npm run test:e2e:static:ci` (with new landmark spec)
- `npm audit --audit-level=high`

## Deployment

DEPLOY_MODE was `none` — no deployment executed.
