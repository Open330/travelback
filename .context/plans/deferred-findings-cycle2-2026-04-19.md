# Deferred Findings — Cycle 2

These entries come from the current review set (`.context/reviews/_aggregate.md`, fresh `security-reviewer.md`, fresh `perf-reviewer.md`, and the latest carried-forward designer review). Every active review finding not scheduled in `cycle2-implementation-2026-04-19.md` is recorded here.

## DF-C2-001 — Mobile information architecture gaps (designer carry-forward)
- **Source finding:** `C2-AGG-005`
- **Original severity / confidence:** MEDIUM / HIGH
- **File citations:**
  - `src/components/FileUpload.tsx:193-197`
  - `src/components/TrackWorkspace.tsx:115-121`
  - `src/components/TrackToolbar.tsx:123-220`
- **Reason for deferral:** This cycle is focused on security hardening, startup-path performance, and test-surface preservation. The mobile IA issues are real but are not security, correctness, or data-loss blockers.
- **Exit criterion:** Re-open in the next UX-focused cycle once the blocking security/startup fixes are merged.

## DF-C2-002 — Playback progress still drives whole-app rerenders and per-frame trail rebuilds
- **Source finding:** `perf-reviewer.md` finding 2
- **Original severity / confidence:** HIGH / HIGH
- **File citations:**
  - `src/lib/usePlaybackController.ts:71-87`
  - `src/app/page.tsx:295-417`
  - `src/components/MapView.tsx:775-882`
- **Reason for deferral:** The fix is a deeper architecture/performance refactor touching playback state ownership and map update strategy. It is too broad for this security/startup-focused cycle.
- **Exit criterion:** Re-open when a dedicated performance cycle can safely restructure playback state and map animation ownership.

## DF-C2-003 — Large GPX/KML imports still parse on the main thread
- **Source finding:** `perf-reviewer.md` finding 3
- **Original severity / confidence:** HIGH / HIGH
- **File citations:**
  - `src/lib/parser.ts:484-535`
  - `src/lib/parser.ts:102-162`
  - `src/components/FileUpload.tsx:34-79`
- **Reason for deferral:** Workerizing XML parsing or redefining file-size product limits is broader than this cycle and needs careful regression coverage across supported formats.
- **Exit criterion:** Re-open when a parser-performance cycle can either workerize XML parsing or intentionally lower/document XML limits.

## DF-C2-004 — Manual route dragging is O(n) on every pointer move
- **Source finding:** `perf-reviewer.md` finding 4
- **Original severity / confidence:** MEDIUM / HIGH
- **File citations:**
  - `src/components/JourneyCreator.tsx:129-149`
  - `src/components/JourneyCreator.tsx:294-301`
  - `src/components/JourneyCreator.tsx:468-479`
- **Reason for deferral:** Valuable, but not blocking compared with the current security/startup/test preservation work.
- **Exit criterion:** Re-open during the next map-interaction or journey-creator performance pass.

## DF-C2-005 — Export settings still permit browser-hostile workload combinations
- **Source finding:** `C2-AGG-006`
- **Original severity / confidence:** HIGH / HIGH
- **File citations:**
  - `src/types.ts:52-79`
  - `src/components/ExportPanel.tsx:84-119,298-312`
  - `src/lib/videoEncoder.ts:52-91`
- **Reason for deferral:** Fixing this cleanly requires a product decision on the supported export matrix and may impact UX copy, validation, and possibly encoder strategy. It is not a direct security/correctness/data-loss bug in the current cycle instructions.
- **Exit criterion:** Re-open when the product/export matrix is defined and can be enforced with matching UI validation and tests.

## DF-C2-006 — Locale/help content remains eagerly bundled
- **Source finding:** `perf-reviewer.md` finding 6
- **Original severity / confidence:** HIGH / HIGH
- **File citations:**
  - `src/lib/i18n.ts:11-1664`
  - `src/components/GoogleGuide.tsx:146-248`
  - `src/app/page.tsx:329-417`
- **Reason for deferral:** Splitting locale payloads and lazily loading modal content is worthwhile but broader than the current focused startup/export/security changes.
- **Exit criterion:** Re-open in a bundle-size / localization architecture pass.

## DF-C2-007 — Large default variable font payload
- **Source finding:** `perf-reviewer.md` finding 7
- **Original severity / confidence:** MEDIUM / HIGH
- **File citations:**
  - `src/app/layout.tsx:47-51`
  - `public/fonts/pretendard.css:1-7`
  - `src/app/globals.css:7-15`
- **Reason for deferral:** Reducing the font payload requires asset-pipeline decisions (subsetting, locale-specific loading, or next/font migration) that are outside this cycle’s scope.
- **Exit criterion:** Re-open when font-loading strategy is explicitly in scope.

## DF-C2-008 — E2E suite remains serialized and sleep-heavy
- **Source finding:** `perf-reviewer.md` finding 8
- **Original severity / confidence:** MEDIUM / HIGH
- **File citations:**
  - `playwright.config.ts:5-12`
  - `playwright.static.config.ts:5-12`
  - `e2e/travelback.spec.ts:138,351,367,586,614,689,704,954,986`
- **Reason for deferral:** The suite currently acts as a broad regression net; parallelizing and de-sleeping it is valuable but larger than the blocking fixes in this cycle.
- **Exit criterion:** Re-open once the current security/startup fixes are stable and the suite can be split safely.

## DF-C2-009 — Residual CSP still allows inline styles
- **Source finding:** `security-reviewer.md` residual risk 4
- **Original severity / confidence:** LOW / HIGH
- **File citations:**
  - `src/app/layout.tsx`
  - `scripts/harden-static-export.mjs`
- **Reason for deferral:** The app intentionally uses inline style attributes across the UI. Tightening this without regression requires a coordinated CSS migration rather than a tactical change.
- **Exit criterion:** Re-open when inline-style removal is intentionally scheduled and verified across the UI.

## DF-C2-010 — Local-only bundled styles still ship without a real basemap layer
- **Source finding:** post-cycle convergence audit
- **Original severity / confidence:** MEDIUM / HIGH
- **File citations:**
  - `public/map-styles/voyager.json:1-29`
  - `public/map-styles/positron.json:1-29`
  - `public/map-styles/dark.json:1-29`
  - `public/map-styles/liberty.json:1-29`
  - `public/map-styles/bright.json:1-29`
  - `scripts/fetch-map-styles.mjs:1-51`
- **Reason for deferral:** Restoring a meaningful basemap while keeping the repo’s local-only/privacy contract requires a larger product and asset-packaging decision (bundle real local vector/raster tiles, ship a new art-directed local basemap, or intentionally revert to a remote provider and rewrite the contract/tests). That decision is broader than the current bug-fix loop.
- **Exit criterion:** Re-open when the project chooses a durable basemap strategy and can implement the matching assets, CSP, docs, and smoke/static expectations together.
