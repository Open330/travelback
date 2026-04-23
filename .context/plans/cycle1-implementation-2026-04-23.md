# Cycle 1 Implementation Plan (2026-04-23, orchestrator run)

Source: `.context/reviews/_aggregate.md` (cycle 1 aggregate, updated 2026-04-23 orchestrator run)

## Status: ONE BLOCKING GATE REGRESSION TO FIX

The cycle 1 aggregate (2026-04-23) found a single blocking issue — a recent map-style regression that:
- reintroduced remote CARTO/OSM tile sources in all 5 bundled style JSONs,
- violates the offline/local-only product contract in `.context/project/02-architecture.md`,
- causes `npm run smoke:static` to FAIL (the gate script asserts zero sources for each style),
- reintroduces a third-party privacy leak (re-opens DF-C2-010).

All other review perspectives report zero new actionable findings.

---

## Tasks

### C1-T1 — Restore local-only bundled map styles and drop CARTO/OSM from CSP

Priority: P0 (blocks the smoke gate, blocks release path, violates product contract)

Files:
- `public/map-styles/bright.json` — remove `sources.carto-voyager-bright`, remove the `carto-voyager-bright-tiles` raster layer, replace with a single `background` layer with a soft light-blue fill matching the prior local-only `#ecf0f8`.
- `public/map-styles/voyager.json` — same treatment, restore the `#e7efe8` background.
- `public/map-styles/positron.json` — restore to local-only with its prior background (look up pre-`5788949` state via `git show 5788949~1:public/map-styles/positron.json`).
- `public/map-styles/dark.json` — restore with the `#0a0d14` background.
- `public/map-styles/liberty.json` — restore with its prior background.
- `src/app/layout.tsx:62` — remove `https://*.basemaps.cartocdn.com` from `img-src` and `connect-src` in the dev CSP placeholder.
- `scripts/harden-static-export.mjs:11-20` — remove the same domain from the production CSP policy.

Acceptance:
- `npm run smoke:static` passes (`[smoke-static] OK`).
- `npm run build` still succeeds.
- `npm run lint`, `npm run typecheck`, `npm audit --audit-level=high` still pass.
- `npm run test:e2e:static:ci` still passes.
- No reference to `cartocdn.com` in `public/map-styles/**`, `src/app/layout.tsx`, or `scripts/harden-static-export.mjs`.
- `.context/project/02-architecture.md` privacy/offline language matches the shipped surface (already accurate; no doc edit required after the revert).

Non-goals (out of scope this cycle; stay deferred):
- DF-C2-010 (shipping a real local basemap) — remains deferred. The explicit product trade-off per `ba5bd23` is that offline-first beats remote basemaps.
- Any user-visible enhancement to the background layers (color tuning, gridlines, etc.). Pure revert to the committed pre-regression state.

Risk / rollback:
- Low. The revert restores a state that was previously shipped and gated green. If any downstream component assumed the new tile sources existed (none identified in review), we'd see a MapLibre warning; the review found no such dependency in `src/`.

---

## Previously Deferred Items — Status

| ID | Status this cycle |
|----|-------------------|
| DF-C2-010 (local-only bundled styles, no basemap) | Re-asserted via C1-T1; remains deferred as a richer-basemap project (exit criterion unchanged). |
| DF-C4-001 (SceneEditor normalize on name keystroke) | Deferred, unchanged. |
| DF-C4-002 (ExportPanel ETA multiplier cosmetic) | Deferred, unchanged. |
| DF-C5-001 (worker constant sync) | Deferred, unchanged. |
| DF-C17-001..019 (minus resolved 007 & 012) | All deferred, unchanged. |
| DF-C17-007 (SceneEditor aria-valuetext) | RESOLVED — confirmed fixed. |
| DF-C17-012 (GoogleGuide keyboard tabs) | RESOLVED — confirmed fixed. |

All remaining deferred items retain the severity / confidence / exit criterion recorded in `.context/plans/deferred-findings-cycle17-2026-04-23.md`. Repo rules (GPG-signed commits, conventional + gitmoji, no `Co-Authored-By`, fine-grained commits) apply whenever they are eventually picked up.

---

## Rationale for scheduling vs. deferring

- C1-F1 is a gate regression that violates a committed product contract (`.context/project/02-architecture.md`). Per the repo policy "Security, correctness, and data-loss findings are NOT deferrable unless the repo's own rules explicitly allow it" — this is a correctness + privacy regression, so it is scheduled, not deferred.
- No other aggregate finding warrants action this cycle. All other perspectives report zero new actionable issues, and the 21 pre-existing deferrals remain with the same exit criteria.

---

## Gate verification plan

- Fix the styles and CSP.
- Run `npm run lint && npm run typecheck && npm run build && npm run smoke:static && npm audit --audit-level=high`.
- Run `npm run test:e2e:static:ci`.
- Commit fine-grained with gitmoji + GPG sign. Push.
