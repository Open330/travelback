# Active Implementation Plans

Plans addressing unremediated findings from `.context/reviews/`. See `archive/` for completed plan waves.

## Wave 4 — From 2026-04-19 review

| Plan | Scope | Priority | Source reviews |
|------|-------|----------|---------------|
| `p0-critical-correctness-2026-04-19.md` | Worker segment remapping, parser format detection, antimeridian lerp, TimelineSelector stale closure, worker dispatcher alignment | P0 | deep-code-review-2026-04-19 (N-1, N-3, N-4, N-5, N-21) |
| `p1-robustness-and-quality-2026-04-19.md` | Pre-scene gap jitter, coordinate bounds validation, error codes, normalization feedback, style change stale closure, FPS options, download resilience, depth check coverage, playback final frame, export cleanup | P1 | deep-code-review-2026-04-19 (N-2, N-7, N-9, N-10, N-11, N-12, N-13, N-14, N-8, N-16) |

## Execution order

1. `p0-critical-correctness` — immediate, produces wrong output
2. `p1-robustness-and-quality` — next iteration, edge cases and robustness

## Previously completed

- **Wave 3** (2026-04-18b): p0-p1-critical-bugfixes, p2-code-quality-and-robustness, p3-infra-and-polish, code-maintainability (partial) — all archived
- **Wave 2** (2026-04-18): p0-critical-crash-and-correctness, security-hardening, ui-ux-polish, code-maintainability (partial) — all archived
- **Wave 1** (2026-04-17): p0-critical-fixes, mobile-layout-redesign, interaction-state-correctness, accessibility-contrast-i18n, code-quality-infrastructure — all archived
