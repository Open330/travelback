# Cycle 2 Implementation Plan

**Date:** 2026-04-19
**Source review:** `.context/reviews/_aggregate.md`

## Scope
This cycle plans the currently active findings from the cycle-2 aggregate. Historical review docs remain as provenance, but only findings that are still current in `main` are carried forward here.

Every active finding is either:
- scheduled for implementation in this plan, or
- explicitly recorded in `.context/plans/deferred-findings-cycle2-2026-04-19.md`.

Security findings are scheduled unless the fix requires host-level deployment controls outside the repo; in that case this plan must still add the strongest in-repo mitigation and document the remaining host requirement.

---

## Planned for implementation this cycle

### C2-AGG-001 — Closed export UI eagerly imports export code and probes codecs on startup
- **Severity:** HIGH
- **Confidence:** HIGH
- **Primary files:** `src/app/page.tsx`, `src/components/ExportPanel.tsx`
- **Status:** TODO
- **Plan:**
  1. Stop mounting `ExportPanel` until the user opens it.
  2. Ensure codec probing only runs while the export UI is actually open.
  3. Re-run build/static tests to confirm export still works once opened.
- **Exit criteria:**
  - Landing route no longer mounts `ExportPanel` while closed.
  - Closed startup path no longer triggers codec probing.
  - Export flow still opens and starts successfully.

### C2-AGG-002 — Static anti-framing protection is incomplete on plain static hosts
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Primary files:** `src/app/layout.tsx`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`
- **Status:** TODO
- **Plan:**
  1. Add a client-side anti-framing fallback to the early bootstrap path.
  2. Document that real deployments must still provide `frame-ancestors 'none'` / `X-Frame-Options: DENY` as response headers.
  3. Keep the mitigation compatible with the existing CSP hardening flow.
- **Exit criteria:**
  - Framed execution is actively rejected by the shipped app.
  - Docs clearly call out the required host-level anti-framing headers.

### C2-AGG-003 — Hidden OMX tool-state residue can ship from `public/`
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Primary files:** `public/fonts/.omc/state/last-tool-error.json`, `scripts/smoke-static.mjs`
- **Status:** TODO
- **Plan:**
  1. Remove the leaked `.omc` artifact from the public asset tree.
  2. Add a static-build guard that fails if `.omc`, `.codex`, `.git`, or similar hidden tool-state paths appear under `public/` or `out/`.
  3. Verify the guard passes on a clean build.
- **Exit criteria:**
  - No tool-state residue remains in `public/` or `out/`.
  - `npm run smoke:static` enforces the guard.

### C2-AGG-004 — Production debug surface is still exposed via `navigator.webdriver`
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Primary files:** `src/components/MapView.tsx`, `e2e/travelback.spec.ts`
- **Status:** TODO
- **Plan:**
  1. Remove the implicit webdriver-based production debug hook.
  2. Replace it with an explicit test-only opt-in flag that the E2E suite can request.
  3. Update Playwright helpers to use the explicit opt-in path.
- **Exit criteria:**
  - Default production/static sessions do not expose `window.__travelbackDebug`.
  - E2E coverage still has access to the debug surface when explicitly requested.

### C2-AGG-007 — Google phone-export `semanticSegments` lose real segment boundaries
- **Severity:** HIGH
- **Confidence:** HIGH
- **Primary files:** `src/lib/parser.ts`, `public/workers/trackParser.worker.js`
- **Status:** TODO
- **Plan:**
  1. Record `segmentStartIndices` when `semanticSegments` append points after prior data.
  2. Keep main-thread and worker behavior in sync.
  3. Verify the parsed track preserves disconnected segment boundaries.
- **Exit criteria:**
  - `semanticSegments` imports no longer fabricate connecting lines between unrelated segments.
  - Main-thread and worker parsing stay consistent.

### C2-AGG-008 — Antimeridian routes interpolate/render through the wrong side of the world
- **Severity:** HIGH
- **Confidence:** HIGH
- **Primary files:** `src/lib/interpolate.ts`, `src/components/MapView.tsx`
- **Status:** TODO
- **Plan:**
  1. Use wrapped shortest-path longitude deltas for interpolation and bearing.
  2. Build rendered route/trail geometry with wrapped longitudes so dateline crossings stay local.
  3. Re-run build/static tests to confirm no regression in map rendering.
- **Exit criteria:**
  - Dateline-crossing tracks interpolate across the short path.
  - Rendered route/trail geometry no longer spans the globe for ±180 crossings.

### C2-AGG-009 — `<html lang>` never follows the selected locale
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Primary files:** `src/app/page.tsx`
- **Status:** TODO
- **Plan:**
  1. Sync `document.documentElement.lang` with the active locale.
  2. Keep the default English behavior for first paint.
- **Exit criteria:**
  - Changing locale updates the document language metadata during the session.

---

## Deferred in this cycle
See `.context/plans/deferred-findings-cycle2-2026-04-19.md`.

---

## Progress log
- 2026-04-19 — Cycle 2 plan created from the current aggregate review.
