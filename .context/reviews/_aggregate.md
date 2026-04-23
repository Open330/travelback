# Aggregate Review — Cycle 1 (2026-04-23, orchestrator run)

## Methodology
Multi-perspective deep review across all 12 review angles (code quality, security, performance, architecture, accessibility, test engineering, debugger, verification, documentation, tracing, critique, UI/UX). Every `src/` file re-examined; gates run end-to-end; deferred-findings list cross-checked against current code; commit history reviewed for regressions.

Per-agent review files from this cycle are preserved under `.context/reviews/cycle1-<agent>-2026-04-23.md` (from earlier partial attempts) and `.context/reviews/cycle2-<agent>-2026-04-23.md` (from an immediately preceding partial cycle). Those files remain valid for their specialist angles; this aggregate supersedes them where conflicts exist and documents the GATE REGRESSION that they missed.

---

## GATE STATUS

- ESLint: **PASS** (0 errors, 0 warnings)
- TypeScript (`tsc --noEmit`): **PASS** (0 errors)
- Next.js build: **PASS** (static pages generated, harden-static-export completed)
- `npm audit --audit-level=high`: **PASS** (0 vulnerabilities)
- `npm run smoke:static`: **FAIL** — `bright.json still declares external basemap sources: carto-voyager-bright`
- `npm run test:e2e:static:ci`: webServer startup contention observed during parallel gate run; re-run required after smoke fix.

The smoke failure is the **single blocking gate for this cycle** and must be fixed before commit.

---

## NEW FINDINGS

### C1-F1 — All 5 bundled map styles ship remote CARTO/OSM raster sources, violating the offline/local-only product contract and failing the smoke gate

- **Severity / Confidence**: CRITICAL / HIGH
- **Files**:
  - `public/map-styles/bright.json` — `sources.carto-voyager-bright.tiles` → `https://*.basemaps.cartocdn.com/...`
  - `public/map-styles/voyager.json` — `sources.carto-voyager.tiles` → `https://*.basemaps.cartocdn.com/...`
  - `public/map-styles/positron.json` — `sources.carto-light.tiles` → `https://*.basemaps.cartocdn.com/...`
  - `public/map-styles/dark.json` — `sources.carto-dark.tiles` → `https://*.basemaps.cartocdn.com/...`
  - `public/map-styles/liberty.json` — `sources.osm-standard.tiles` → `https://*.tile.openstreetmap.org/...`
  - `scripts/smoke-static.mjs:108-133` — enforces zero-source contract
  - `src/app/layout.tsx:62` — CSP placeholder still lists `cartocdn.com` (left over from the regression)
  - `scripts/harden-static-export.mjs:11-20` — hardened CSP still lists `cartocdn.com`
- **Agreement**: gate-detected; confirmed by comparing against git history and `.context/project/02-architecture.md`.
- **Evidence (history)**:
  - `ba5bd23 feat(local-map): remove the last external network path and restore offline map context` — committed the zero-source contract, updated docs, tightened CSP, and made the smoke assertion `assertMapStylesPinnedLocally` effective.
  - `5788949 fix(map): replace stub map styles with CARTO/OSM raster tile sources` — added remote tile sources back, with commit message describing the previous state as "empty stubs" and ignoring the established product contract.
  - The reintroduction of remote tiles:
    - violates `.context/project/02-architecture.md` (**"Local style JSON, palette choices, and layer definitions are bundled with the app, so normal map display no longer needs any third-party map requests."** and **"Works offline after initial page load"**),
    - causes `npm run smoke:static` to fail every run,
    - re-establishes a third-party data leak to CARTO / OSM tileservers on every map render (privacy regression also called out in `.context/plans/deferred-findings-cycle2-2026-04-19.md` DF-C2-010).
- **Failure scenario**: User loads the static export. The CSP in the hardened HTML still allows `cartocdn.com`, so the map silently fetches remote tiles — reintroducing the privacy leak and third-party dependency the offline contract was designed to eliminate. The smoke gate blocks the release path entirely.
- **Fix**: restore the pre-`5788949` state of the 5 style JSONs (background-only, zero sources, zero symbol layers) and remove `https://*.basemaps.cartocdn.com` from both CSP policies so the shipped surface matches the contract + smoke test again.
- **Trade-off acknowledged**: reverting the styles visually regresses the maps back to solid backgrounds (same constraint as DF-C2-010). That is the deliberate product contract per `ba5bd23` and `.context/project/02-architecture.md`. Any future richer basemap work must be done in a way that keeps the shipped styles local (offline vector/raster bundle), per that same commit's directive.

---

## PRIOR CYCLE FIX VERIFICATION (still good)

- C12-F1 (GoogleGuide SVG `aria-hidden`) — still fixed (`src/components/GoogleGuide.tsx:26,42,59,76,89,102,115`).
- C11-F1 (ElevationProfile SVG children `aria-hidden`) — still fixed (`src/components/ElevationProfile.tsx:104-125`).
- C10-F8 (Controls progress bar `aria-valuetext`) — still fixed.
- C10-F4 (Toast `role="log"` removed) — still fixed.
- C10-F11 (ExportPanel bitrate conflict) — still fixed.
- C10-F12 (SceneRangeEditor `userSelect`) — still fixed.
- C10-F10 (TimelineSelector shared `ratioToIndex`) — still fixed.
- Prior cycle 1 fixes (C17-P0-1 through C17-P0-8, C17-P1-1, C17-P1-2) — all still applied.

## POSITIVE FINDINGS (no regression since cycle 17 besides the smoke regression above)

- ESLint clean, TypeScript strict clean, `npm audit` clean.
- No `as any`, no `@ts-ignore`, no `@ts-expect-error` in `src/`.
- 28 addEventListener / 28 removeEventListener occurrences — balanced at file counts.
- `URL.createObjectURL` (1) / `URL.revokeObjectURL` (3) — balanced (revoked in callback, pre-create cleanup, and unmount).
- All `localStorage` access wrapped in try/catch (spot-checked: `TimelineSelector.tsx:79-86`, `MapView.tsx:567-571`, `interpolate.ts:150-158`, `i18n.ts:1747-1767`, `page.tsx:41-55,283-304`).
- `dangerouslySetInnerHTML` used only for the theme-bootstrap script, hash-pinned in CSP by the post-build hardening step.
- 10 `eslint-disable` comments, all justified with `--` inline rationale.

---

## PRIOR DEFERRED FINDINGS CARRIED FORWARD

`.context/plans/deferred-findings-cycle17-2026-04-23.md` items DF-C17-001, -002, -003, -004, -005, -006, -008, -009, -010, -011, -013, -014, -015, -016, -017, -018, -019 remain valid and are carried forward.

- DF-C17-007 (SceneEditor `aria-valuetext`) — **RESOLVED** (was resolved earlier; re-confirmed this cycle).
- DF-C17-012 (GoogleGuide keyboard tabs) — **RESOLVED** (was resolved earlier; re-confirmed this cycle).
- DF-C4-001, DF-C4-002 — carried forward.
- DF-C5-001 — carried forward.
- DF-C2-010 (Local-only bundled styles ship without a real basemap layer) — **re-opened and superseded** by C1-F1 above. The deferred trade-off is exactly the one we are re-asserting by reverting the offending commit.

---

## AGENT FAILURES

No per-agent failures; the previous cycle's in-memory multi-agent fan-out had already written per-angle review files (`.context/reviews/cycle1-*-2026-04-23.md` and `.context/reviews/cycle2-*-2026-04-23.md`), all of which completed successfully for their own specialist angles. Their single collective blind spot — the smoke gate that verifies the static-export product contract — is corrected in this aggregate and scheduled for remediation in `.context/plans/cycle1-implementation-2026-04-23.md`.
