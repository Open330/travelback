# Cycle 7 Tracer — 2026-07-17

Reviewed revision `2df151642576b1b662e2fe7695c5723012e88747` read-only.

## Result

One new current user-visible trace terminates in corrupted localized feedback. No security boundary is crossed, and no other new trace survived reproduction and duplicate suppression.

## Finding

### TRACE7-01 — Placeholder-like scene names consume the warning's numeric token

- Severity: Low
- Confidence: High
- Status: Confirmed current defect; actionable source correction
- Classification: Deterministic user-input-to-output trace
- File/region: `src/components/SceneEditor.tsx:40-44,353-402,518-520,643-647,658-660`; `src/lib/i18n.ts:98-99,462-463,826-827,1190-1191,1554-1555`; `src/components/SceneEditor.test.ts:135-188`
- Failure scenario: name a scene `{from}` (or `{to}`), then edit a range so normalization adjusts that scene. English feedback becomes `Scene "50" start adjusted from {from}% to 60%.` instead of preserving the name and filling the actual numeric placeholder. The same token-order defect is reachable in all five locales and appears both visibly and in the polite live region.
- Causal trace:
  1. The editable name input accepts arbitrary text and commits `{from}` through `updateScene` (`SceneEditor.tsx:658-660`).
  2. A later overlapping/out-of-range edit reaches `commitScenes`; `normalizeScenes` changes a boundary and selects a locale template containing `{name}`, `{from}`, and `{to}` (`SceneEditor.tsx:353-390`; locale regions above).
  3. `formatSceneAdjustment` first replaces `{name}` with the user value, creating an earlier `{from}` token inside the already-mutated string (`SceneEditor.tsx:40-42`).
  4. The next single `.replace('{from}', ...)` consumes the token inside the inserted name, so the template's real numeric token remains unresolved; `{to}` names fail analogously at the last replacement (`SceneEditor.tsx:43-44`).
  5. The corrupted string is joined into `statusMessage` and reused by both the live status and visible warnings (`SceneEditor.tsx:518-520,569-570,643-647`).
- Recommended fix: interpolate the original template in one pass, mapping only template-token matches (for example, one regex callback for `name|from|to`) so inserted values are never scanned again. Add a component regression using `{from}` and/or `{to}` as a name and assert both visible and live-region text. React escaping should remain unchanged.

## Closed and rejected traces

- The three Cycle 6 user-visible traces are closed at current HEAD: Retry now carries manual camera state across map generations, the timeline/elevation stacks no longer route Reset clicks into the SVG, and ordinary localized range adjustments render full locale-owned sentences. TRACE7-01 is a narrower interpolation edge introduced by the last correction, not a reopening of the original mixed-language defect.
- A retry-after-retry camera loss hypothesis was rejected: `retryCameraStateRef` is captured once, survives failed replacement generations, and clears only after successful hydration.
- A superseded MapLibre style request was again rejected as a shipped trace: revision/map identity guards remain, installed MapLibre abort-suppresses superseded requests, bundled styles have no downstream remote source/sprite/glyph requests, and the existing held-request browser case covers the branch.
- B01-B04 and D01-D04 remain established carryovers and were not counted as new trace findings.
- TRACE7-01 is not an injection trace. The interpolated value terminates in React-rendered text/attributes, so braces, markup, and scripts remain escaped; only the message content is wrong.

## Trace coverage

The end-to-end sweep followed: file selection/drop → parser/worker/fallback → track replacement → map creation/style revisions/hydration/retry → trim/seek/elevation → scene name/range normalization and live feedback → playback/follow/hidden-tab behavior → export lease/frame/cancel/download → object-URL cleanup; Journey Creator mouse/touch/keyboard editing; theme/locale/storage bootstrap; and build → hardening → static server → Pages workflow. Current authored source, tests, scripts, configuration, public text assets, generated-worker parity, and static CSP were included.

## Final missed-issue sweep and skipped accounting

The last pass challenged empty/placeholder names, repeated retries, stale async completion, pointer terminal events, unmount/cancel paths, segment boundaries, malformed worker output, map resize/style swaps, encoder failure, browser-save fallback, modal focus, and static base paths. Only TRACE7-01 retained a concrete reachable failure and unique root cause.

Generated worker/minified static copies were traced through authored source and parity/hash checks rather than line-reviewed as separate implementations. The WOFF2 binary was not decoded. Superseded historical context and legacy plans were used for provenance and deduplication, not treated as current execution paths. No relevant current authored flow file was silently skipped.
