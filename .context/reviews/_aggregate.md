# Aggregate Review — Cycle r4 (2026-04-23)

## Methodology

Cycle r4 fused a multi-agent source review with a browser-driven UI/UX probe
(user-injected TODO **U-2026-04-23-01**). Eleven source-side lanes ran in
parallel (code-reviewer, perf, security, critic, verifier, test-engineer,
tracer, architect, debugger, document-specialist, accessibility) plus the
designer lane which is the authoritative UI/UX reviewer and drove a real
Chromium session against `npm run start` at `http://localhost:3737/travelback/`.

Per-agent reviews are preserved at:

- `./.context/reviews/cycle-r4-ui-ux-browser-2026-04-23.md` (authoritative browser-driven findings, with hard evidence)
- `./.context/reviews/cycle-r4-designer-2026-04-23.md`
- `./.context/reviews/cycle-r4-code-reviewer-2026-04-23.md`
- `./.context/reviews/cycle-r4-perf-2026-04-23.md`
- `./.context/reviews/cycle-r4-security-2026-04-23.md`
- `./.context/reviews/cycle-r4-critic-2026-04-23.md`
- `./.context/reviews/cycle-r4-verifier-2026-04-23.md`
- `./.context/reviews/cycle-r4-test-engineer-2026-04-23.md`
- `./.context/reviews/cycle-r4-tracer-2026-04-23.md`
- `./.context/reviews/cycle-r4-architect-2026-04-23.md`
- `./.context/reviews/cycle-r4-debugger-2026-04-23.md`
- `./.context/reviews/cycle-r4-document-specialist-2026-04-23.md`
- `./.context/reviews/cycle-r4-accessibility-2026-04-23.md`

Browser JSON evidence: `/tmp/tb-uiux-review.json` (1,219 lines / 43 KB), probe
script authored at `e2e/_tmp-uiux-review.mjs` and removed after collection.

---

## GATE STATUS — all green at the start of cycle r4

- ESLint: **PASS** (0 errors, 0 warnings)
- TypeScript (`tsc --noEmit`): **PASS**
- Next.js build: **PASS**; `harden-static-export` hardened 3 HTML files
- `npm audit --audit-level=high`: **PASS**
- `npm run smoke:static`: **PASS**
- `npm run test:e2e:static:ci`: **PASS**

---

## NEW FINDINGS — SCHEDULED THIS CYCLE

### R4-AGG-1 (MEDIUM, HIGH) — Drop `frame-ancestors 'none'` from meta CSP (dev + prod hardened output)

- **Files**: `src/app/layout.tsx:62`, `scripts/harden-static-export.mjs:12`.
- **Agreement**: designer/UX (BUI-1), security (SEC-1), tracer (T-1), architect (AR-2), document-specialist (DS-1, DS-4), test-engineer (TE-1).
- **Evidence**: browser console emits `The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a <meta> element.` on every page load. Defense remains via the JS frame-buster (`src/app/layout.tsx:49`) and host-level headers documented in `.context/project/02-architecture.md:117`.
- **Fix**: remove directive from both meta CSP sites; add a short note in `.context/project/02-architecture.md`; extend `scripts/smoke-static.mjs` to assert the emitted HTML contains NO `frame-ancestors` substring in the CSP meta (regression guard).
- **Schedule**: YES.

### R4-AGG-2 (MEDIUM, HIGH) — Root wrapper should be `<main>` not `<div>` (WCAG 1.3.1, 2.4.1)

- **Files**: `src/app/page.tsx:314`.
- **Agreement**: designer/UX (BUI-2), code-reviewer (CR-1), architect (AR-1), accessibility (A11Y-1).
- **Evidence**: CDP AX tree lists only the Map region. No `main` landmark.
- **Fix**: `<div>` → `<main>`. The `ModalDialog` inert-toggling code targets `[data-travelback-app-root="true"]` via attribute selector; change is source-compatible.
- **Schedule**: YES.

### R4-AGG-3 (MEDIUM, HIGH) — Landing drop-zone has no role / aria-label (WCAG 1.3.1, 2.4.6, 4.1.2)

- **Files**: `src/components/FileUpload.tsx:153-165`.
- **Agreement**: designer/UX (BUI-3), accessibility (A11Y-2).
- **Evidence**: landing DOM probe returns `dropZoneRole: null, dropZoneAriaLabel: null, dropZoneTag: "DIV"`.
- **Fix**: add `role="group" aria-labelledby="fileupload-title" aria-describedby="fileupload-drop-hint"`; wire matching `id`s on the h2 and the drop-hint `<p>`.
- **Schedule**: YES.

### R4-AGG-4 (LOW, HIGH) — Sample-preview button: caption concatenates into accessible name (WCAG 4.1.2)

- **Files**: `src/components/FileUpload.tsx:176-195`.
- **Agreement**: designer/UX (BUI-4), code-reviewer (CR-2), critic (CT-1), tracer (T-3), accessibility (A11Y-3).
- **Evidence**: tab-order entry at 1440w shows `text: "Sample output previewTry with a sample tripLoad demo"` while `aria-label` says "Try with a sample trip".
- **Fix**: wrap the caption `<div>` with `aria-hidden="true"`.
- **Schedule**: YES.

### R4-AGG-5 (LOW, HIGH) — `Reload Page` button in map-error fallback is 38px tall (WCAG 2.2 2.5.8)

- **Files**: `src/components/MapView.tsx:949`.
- **Agreement**: designer/UX (BUI-18), code-reviewer (CR-3), accessibility (A11Y-5), tracer (T-4).
- **Fix**: add `min-h-11`.
- **Schedule**: YES.

### R4-AGG-6 (LOW, HIGH) — Sample-preview button has no visible focus outline (WCAG 2.4.7)

- **Files**: `src/components/FileUpload.tsx:176-195`.
- **Agreement**: designer/UX (BUI-19), code-reviewer (CR-4), accessibility (A11Y-4).
- **Fix**: add `focus-visible:ring-2 focus-visible:ring-[rgb(var(--gl))] focus-visible:ring-offset-2`.
- **Schedule**: YES.

### R4-AGG-7 (LOW, HIGH) — Smoke test should assert meta CSP has no `frame-ancestors`

- **Files**: `scripts/smoke-static.mjs`.
- **Agreement**: test-engineer (TE-1).
- **Fix**: extend the existing walk to fail if any HTML file's CSP `meta` content contains `frame-ancestors`.
- **Schedule**: YES.

---

## NEW FINDINGS — DEFERRED

### R4-AGG-D1 (MEDIUM, MEDIUM) — Primary CTA contrast 3.08:1 below WCAG AA 4.5:1

- Defer (BUI-8 / A11Y-6). Visual-brand change requires owner sign-off.
- Exit criterion: design-owner decides whether to darken cyan to at least `rgb(8,145,178)` (white-on-cyan-700 ≈ 4.78:1) OR accept as an out-of-scope AA gap and document.

### R4-AGG-D2 (LOW, MEDIUM) — Tab order in WebGL-fail path puts map-error controls before the upload overlay

- Defer (T-2 / DB-1).
- Exit criterion: if we add an SSR-safe pre-MapView mount for the upload overlay OR raise the upload overlay's document order, revisit.

### R4-AGG-D3 (LOW, MEDIUM) — 320w + ko touch-target audit not yet performed

- Defer (BUI-11b).
- Exit criterion: next UI-UX cycle runs the probe script at 320×640 with `localStorage['travelback-locale']='ko'`.

### R4-AGG-D4 (LOW, MEDIUM) — Real-WebGL LCP / CLS / INP numbers not captured this cycle

- Defer (BUI-11c). Playwright SwiftShader did not emit LargestContentfulPaint entries.
- Exit criterion: retry with Chromium `--use-gl=angle` or real hardware.

### R4-AGG-D5 (LOW, MEDIUM) — Forced-colors audit incomplete for brand-colored buttons

- Defer (A11Y-8). Needs Windows High Contrast probe.

### R4-AGG-D6 (LOW, MEDIUM) — Landmark e2e test not authored

- Defer (TE-2). Would require axe-core or aria-landmark assertions.

### R4-AGG-D7 (LOW, MEDIUM) — `preserveDrawingBuffer=true` as default; documented trade-off

- Defer (PR-2 / AR-3). Carryover.

### R4-AGG-D8 (LOW, MEDIUM) — `videoEncoder.ts` `window as unknown as …` casts

- Defer (CR-6). Cycle-r3 carryover.

### R4-AGG-D9 (LOW, MEDIUM) — Nominatim search CSP

- Defer (SEC-2). Cycle-r3 carryover.

### R4-AGG-D10 (LOW, MEDIUM) — Language `<select>` shows 2-letter codes instead of native names

- Defer (BUI-7 / CT-4). Stylistic.

### R4-AGG-D11 (LOW, MEDIUM) — "Need help finding your file?" button could mention Google Location History in aria-label

- Defer (BUI-5). Copy question.

### R4-AGG-D12 (LOW, MEDIUM) — Playwright spec for `prefers-reduced-motion` not authored

- Defer (TE-4).

### R4-AGG-D13 (LOW, MEDIUM) — Lighthouse / LCP / INP e2e spec not authored

- Defer (TE-3).

---

## USER-INJECTED INPUT — U-2026-04-23-01

Ingested verbatim from `.context/plans/user-injected/pending-next-cycle.md`.

- Browser-driven review delivered at `./.context/reviews/cycle-r4-ui-ux-browser-2026-04-23.md`.
- Shorter restatement in `./.context/reviews/cycle-r4-designer-2026-04-23.md`.
- Six schedulable findings this cycle: R4-AGG-1 through R4-AGG-6 (all sourced from the browser probe).
- Deferred items with exit criteria: R4-AGG-D1 through R4-AGG-D5.
- Entry removed from the user-injected pending queue after ingestion (see plan PROMPT 2).

---

## CARRY-OVER STATUS (cycle r3 → r4)

- R3-AGG-1, R3-AGG-2, R3-AGG-3 all verified present and correct — no regressions (see verifier V-2).
- Cycle-r3 deferred items unchanged (R3-AGG-4/5/6/7/...): each remains in `deferred-findings-cycle-r3-2026-04-23.md`; re-evaluated here with no status change.

---

## AGENT FAILURES

None this cycle.
