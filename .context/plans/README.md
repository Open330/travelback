# Active Implementation Plans

Plans addressing unremediated findings from `.context/reviews/`. See `archive/` for completed plan waves.

## Wave 2 — From 2026-04-18 reviews

| Plan | Scope | Priority | Source reviews |
|------|-------|----------|---------------|
| `p0-critical-crash-and-correctness-2026-04-18.md` | Stack overflow on large tracks, per-frame allocations, degenerate tracks, corrupt exports, XML billion laughs, worker validation | P0 | deep-code-review-04-18, security-review-04-18 |
| `security-hardening-2026-04-18.md` | Self-host font + remove CDN from CSP, Referrer-Policy, dependency update, blob URL cleanup, debug interface, console sanitization | HIGH | security-review-04-18 |
| `ui-ux-polish-2026-04-18.md` | SceneEditor bottom-sheet, elevation interactivity, replace browser confirm(), design tokens, component-specific fixes | P1-P2 | ui-ux-review-04-18, deep-code-review-04-18 |
| `code-maintainability-2026-04-18.md` | Animation stale closures, component decomposition, i18n split, duplicate utilities, P3 polish items | P2-P3 | deep-code-review-04-18, ui-ux-review-04-18 |

## Execution order

1. `p0-critical-crash-and-correctness` — immediate, must fix before release
2. `security-hardening` — can start in parallel with P0 (self-host font is independent)
3. `ui-ux-polish` — after P0, addresses user-facing issues
4. `code-maintainability` — longest-term, least user-facing urgency; can be spread across iterations

## Previously completed

See `archive/` for Wave 1 plans (p0-critical-fixes, mobile-layout-redesign, interaction-state-correctness, accessibility-contrast-i18n, code-quality-infrastructure — all from 2026-04-17 reviews, all fully implemented).
