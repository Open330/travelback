# Active Implementation Plans

Plans addressing unremediated findings from `.context/reviews/`. See `archive/` for completed plan waves.

## Wave 3 — From 2026-04-18b reviews

| Plan | Scope | Priority | Source reviews |
|------|-------|----------|---------------|
| `p0-p1-critical-bugfixes-2026-04-18b.md` | Blob URL auto-revoke, worker lat/lng divergence, antimeridian, codec guard, Toast timer, Safari download, share memory, scene edge cases, parser validation, segmentStartIndices | P0-P1 | deep-code-review-04-18b |
| `p2-code-quality-and-robustness-2026-04-18b.md` | Animation effect refs, distance-based elevation seek, parser robustness (depth check, JSON.parse, some() perf), Haversine NaN, duplicate computations, SceneEditor undo/warnings, deferred refactors | P2 | deep-code-review-04-18b, code-maintainability-04-18 (deferred) |
| `p3-infra-and-polish-2026-04-18b.md` | Security headers in dev server, CSP hardening verification, ARIA accessibility (JourneyCreator search, ElevationProfile keyboard, TrackToolbar menu), minor guards | P3 | deep-code-review-04-18b |

## Execution order

1. `p0-p1-critical-bugfixes` — immediate, must fix before release
2. `p2-code-quality-and-robustness` — next iteration, improves robustness
3. `p3-infra-and-polish` — can be spread across multiple iterations

## Previously completed

- **Wave 2** (2026-04-18): p0-critical-crash-and-correctness, security-hardening, ui-ux-polish, code-maintainability (partial) — all archived
- **Wave 1** (2026-04-17): p0-critical-fixes, mobile-layout-redesign, interaction-state-correctness, accessibility-contrast-i18n, code-quality-infrastructure — all archived

## Notes

- The `code-maintainability-2026-04-18.md` plan was PARTIAL (Phase 1 + partial Phase 3 done). Its deferred items (MapView effect deps, page.tsx useReducer, TrackWorkspace prop grouping, i18n split, eslint-disable comments) are carried forward into `p2-code-quality-and-robustness-2026-04-18b.md` Phase 4.
- The `ui-ux-polish-2026-04-18.md` plan had 1 deferred item (Track name integration into TrackToolbar). This remains a low-priority cosmetic issue — not carried forward as it requires a TrackToolbar refactor with no user-facing urgency.
