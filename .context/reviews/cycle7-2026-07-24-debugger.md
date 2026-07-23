# Cycle 7 debugger review — 2026-07-24

Baseline: `216001f`

## Result and inventory

One genuinely new causal root survived deterministic reproduction and
history comparison. The debugger inventory covered all production/test
modules, parser/worker parity, map/camera/playback, scene/timeline and export
state machines, download sinks, scripts and process containment, E2E/static
fixtures, configuration, workflow, public/generated assets, README, and
current review/plan records. An independent full static scan reported no
additional root.

Cycle 1–6 fixes, older non-Latin filename work, generic filename-hardening
reviews, and the three explicit process-platform residuals were deduplicated.
`D7-01` is the same root as `CR7-01`, not an additional aggregate finding.

## D7-01 — UTF-16 truncation leaves a dangling high surrogate in the export filename

- Severity: **Low**
- Confidence: **High**
- Fault site: `src/lib/videoEncoder.ts:290-296`
- User-visible sinks: `src/lib/videoEncoder.ts:323-338,374-398`

### Deterministic pre-fix reproduction

Applying the current sanitizer to:

```js
const source = 'a'.repeat(63) + '😀'
```

produced:

```json
{
  "sourceCodeUnits": 65,
  "boundedCodeUnits": 64,
  "finalCodeUnitHex": "d83d",
  "wellFormed": false
}
```

Passing the result through a Web Unicode-scalar conversion replaced the final
unit with `�`. The failure needs no encoder, DOM, browser, or filesystem:
`.slice(0, 64)` deterministically separates the emoji's surrogate pair.

### Reachability and regression boundary

The trigger is accepted as an ordinary `Track.name`; imported names are
explicitly retained by Unicode code point in
`src/lib/parse-utils.ts:89-105`. A normal successful export then constructs
the malformed filename before any download method is selected. Existing
success tests do not inspect that boundary, and the Korean E2E filename uses
only BMP characters.

Fix only the truncation unit—iterate Unicode code points while retaining the
existing 64-character policy and sanitizer rules. A pre-fix regression test
must assert the intact terminal emoji and a well-formed filename.

## Debug sweeps with no new root

The final pass rechecked cancellation/finalization, retained export
ownership, picker and fallback cleanup, stale async publications,
scene/timeline settlement, parser fallback, worker parity, and map lifecycle
edges. No second new defect survived reachability or historical comparison.

No supervisor finding was claimed, so survivor-process evidence was not
applicable. No supervisor, E2E, Playwright, Chromium, browser, server, deploy,
process-kill, source edit, commit, or push was attempted.
