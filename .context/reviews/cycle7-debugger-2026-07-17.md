# Cycle 7 Debugger — 2026-07-17

Reviewed revision `2df151642576b1b662e2fe7695c5723012e88747` read-only. No fixes were applied.

## Result

One new low-severity root cause was confirmed. It is the same product defect traced as TRACE7-01, reported here from the debugging/root-cause role.

## Finding

### DB7-01 — Serial replacement reinterprets tokens introduced by user data

- Severity: Low
- Confidence: High
- Status: Confirmed current defect; actionable source correction
- Classification: Deterministic string-interpolation root cause
- File/region: `src/components/SceneEditor.tsx:40-44,353-402,518-520,643-647,658-660`; `src/components/SceneEditor.test.ts:135-188`
- Root cause: `formatSceneAdjustment` performs three serial `String.replace` calls on the result of the previous call. Replacing `{name}` therefore changes the token stream before `{from}` and `{to}` are resolved. Because `String.replace(string, value)` replaces only the first occurrence, a user-supplied scene name containing `{from}` or `{to}` steals the corresponding replacement and leaves the real template token unresolved.
- Minimal reproduction model:

  ```text
  template: Scene "{name}" start adjusted from {from}% to {to}%.
  name:     {from}
  serial result: Scene "50" start adjusted from {from}% to 60%.
  ```

- Runtime failure scenario: edit a scene name to `{from}`, then change its range so overlap normalization moves the start boundary. The visible warning and screen-reader status announce the corrupted result. `{to}` produces the equivalent end-token failure; all locale templates use the same placeholder set.
- Why the suite misses it: `src/components/SceneEditor.test.ts:135-188` verifies Korean visible/live localization with the ordinary name `두 번째`, which contains no replacement token. It proves the normal path but not the interpolation invariant that inserted values must remain opaque.
- Recommended fix: resolve tokens against the untouched template in one pass (or use a shared formatter with opaque substitution values), and add a component-level regression for placeholder-bearing names that checks both warning consumers. Do not sanitize away valid braces merely to mask the formatter bug.

## Diagnostics and rejected hypotheses

- A direct evaluation of the current helper sequence reproduced the exact corrupted English output above.
- `npm test` passed all 368 tests without lifecycle warnings, confirming this is a coverage gap rather than an existing red suite. Lint, no-emit typecheck, worker parity, audit, CSP/hash parity, and diff checks also passed.
- The value is rendered through React text nodes, so an XSS explanation was rejected; no `innerHTML` sink receives it.
- Repeated map Retry was investigated and rejected as a new defect: the first outgoing manual pose remains available through failed replacement generations and clears after successful hydration.
- The prior Reset hit-routing, localized ordinary-name feedback, FileUpload `act`, and guide-path defects are closed in current source/tests. Established B01-B04 and D01-D04 were not duplicated as debugger findings.
- Environment-local extraneous optional WASM packages reported by `npm ls` do not establish a tracked lockfile or runtime failure and were not elevated.

## Final debugging sweep

The final pass checked stale closures and async identity, effect/listener/timer/RAF cleanup, pointer capture/blur/cancel paths, parser limits and worker validation, map generation/style ownership, scene/timeline normalization, playback boundaries, export lease/finalize/cancel cleanup, object URLs, save fallback, storage/bootstrap, static hardening, and test harness process ownership. No second new root cause met the reproducibility and user-impact threshold.

All relevant authored source, test, script, configuration, and textual static files were reviewed or systematically traced. Generated worker/minified output was covered through source parity and static validation, the WOFF2 binary was not decoded, and superseded historical artifacts were consulted only for duplicate suppression/provenance. No current executable file was silently omitted.
