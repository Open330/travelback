# Deferred Cycle 1 Review Items — 2026-04-25

Repo rules consulted before deferral:

- `.context/development/01-conventions.md` — no new dependencies without need, minimal footprint, build/lint/E2E gates, GPG-signed semantic commits.
- `.context/project/02-architecture.md` — client-only/static trust boundary; GitHub Pages cannot attach custom response headers, so anti-framing currently relies on JS fallback unless fronted by a header-capable CDN.

## D1 — Generate/share the Google parser worker instead of hand-mirroring logic

- Source finding: `.context/reviews/_aggregate.md` F15; `.context/reviews/cycle1-code-reviewer-2026-04-25.md:88`; `.context/reviews/cycle1-architect-2026-04-25.md:60`.
- File+line: `src/lib/parser.ts:253-545`, `public/workers/trackParser.worker.js:1-334`, `scripts/smoke-static.mjs:172-202`.
- Original severity/confidence: High / High.
- Deferral reason: This is an architectural build-pipeline refactor, not a remaining confirmed behavior regression after F1/F2 were fixed in both copies. It likely needs a shared worker bundling strategy; adding build tooling or dependencies would violate the repo's minimal-dependency/small-diff guidance for this remediation cycle.
- Exit criterion: Any future change to Google parser semantics, or a planned build-system pass, must either generate the worker from shared source or add a direct main-parser-vs-worker parity harness for all Google fixtures and negative cases.

## D2 — Replace full JSON/XML parsing with true streaming or worker-bounded parser paths

- Source finding: `.context/reviews/_aggregate.md` F16; `.context/reviews/cycle1-architect-2026-04-25.md:88`, `.context/reviews/cycle1-perf-reviewer-2026-04-25.md:56`.
- File+line: `src/lib/parser.ts:158-209`, `src/lib/parser.ts:487-546`, `src/lib/parser.ts:647-701`.
- Original severity/confidence: High / Medium-High.
- Deferral reason: The confirmed regressions were fixed by removing the false-positive JSON pre-scan and restoring the 4 MB XML safety cap. A streaming parser/workerized XML implementation is a larger scalability project and may require dependency/build changes not authorized in this cycle. The security review item was handled in-cycle by preserving bounded XML parsing and entity stripping/rejection behavior; this deferred item tracks only the remaining scalability work.
- Exit criterion: Re-open when XML imports above 4 MB are required, when JSON memory pressure is observed in production/testing, or when the repo explicitly approves a parser worker/shared parser refactor.

## D3 — Narrow MapView ownership and remove raw MapLibre access from feature code

- Source finding: `.context/reviews/_aggregate.md` F17; `.context/reviews/cycle1-architect-2026-04-25.md:138`.
- File+line: `src/components/MapView.tsx:26-34`, `src/lib/useExportController.ts:136-186`, `src/components/JourneyCreator.tsx:183-430`.
- Original severity/confidence: Medium-High / High.
- Deferral reason: This is a cross-component architecture refactor. The cycle fixed the confirmed Journey Creator click-suppression bug while leaving the broader boundary redesign for a dedicated plan.
- Exit criterion: Re-open before adding new map overlays, changing export resize/capture behavior, or modifying MapLibre style reload lifecycle.

## D4 — Consolidate preference state into one provider

- Source finding: `.context/reviews/_aggregate.md` F18; `.context/reviews/cycle1-architect-2026-04-25.md:165`.
- File+line: `src/app/layout.tsx:53-66`, `src/app/page.tsx:32-441`, `src/components/ThemeToggle.tsx:7-57`.
- Original severity/confidence: Medium / High.
- Deferral reason: Non-blocking maintainability work. Current behavior remains covered by theme/map-style E2E tests, and this cycle preserved the existing controlled/uncontrolled behavior.
- Exit criterion: Re-open when adding another persisted preference or changing theme/map-style coupling.

## D5 — Header-level anti-framing for GitHub Pages deployment

- Source finding: `.context/reviews/_aggregate.md` F19; `.context/reviews/cycle1-security-reviewer-2026-04-25.md:31`.
- File+line: `.context/project/02-architecture.md:103-118`, `scripts/harden-static-export.mjs:1-35`, `.github/workflows/deploy-pages.yml:1-34`.
- Original severity/confidence: Medium / High.
- Deferral reason: Repo architecture explicitly records that GitHub Pages cannot attach custom headers. The current deploy target therefore cannot enforce `frame-ancestors`/`X-Frame-Options` without moving behind a header-capable CDN. The JS frame-buster remains the documented mitigation.
- Exit criterion: Re-open if deployment moves to a header-capable host/CDN or if GitHub Pages adds custom response-header support.

## D6 — Remaining E2E hardening backlog

- Source finding: `.context/reviews/_aggregate.md` F20; `.context/reviews/cycle1-test-engineer-2026-04-25.md:31-111`.
- File+line: `e2e/travelback.spec.ts` (coverage gaps across parser parity, fixed sleeps, export cancel, drag/drop, full frame encoding).
- Original severity/confidence: High for parser/frame coverage; Medium for most UI gaps / High.
- Deferral reason: This cycle added targeted regressions for the confirmed parser, XML, export-probing, focus, and timeline no-op bugs. Replacing all fixed sleeps and adding full export/cancel/drag-drop/parity harnesses is broad test-infrastructure work, not required to prove the fixed cycle regressions.
- Exit criterion: Re-open before refactoring parser/worker code, export cancellation/frame encoding, file-drop handling, or playback timing tests.
