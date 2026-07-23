# Cycle 7 tracer review — 2026-07-24

Baseline: `216001f`

## Scope and provenance

The trace inventory covered all source/test modules, parser and generated
worker paths, UI state and map/camera ownership, scene/timeline editing,
playback, export/finalization/download, scripts and process containment,
E2E/static fixtures, configuration, public artifacts, workflow, README, and
active review/plan history. Every candidate was traced from origin to
user-visible terminus and compared with Cycle 1–6 and older review roots.

The four Cycle 6 changes and the three known process-platform residuals were
excluded. A separate repository-wide scan returned no additional new root.
`TRACE7-01` is the same canonical root as `CR7-01`; aggregate count: one.

## TRACE7-01 — Export name becomes malformed between the track model and save sink

- Severity: **Low**
- Confidence: **High**
- Origin: `src/lib/videoEncoder.ts:290-296`
- Publication: `src/lib/videoEncoder.ts:297-301`
- Sinks: `src/lib/videoEncoder.ts:323-338,374-398`

### Causal chain

1. A valid track name ends with an astral character at the 64-code-unit
   boundary; the minimal trigger is `'a'.repeat(63) + '😀'`.
2. NFKC normalization and reserved-character cleanup retain that emoji.
3. `.slice(0, 64)` retains its high surrogate and discards its low surrogate.
4. `ExportResult.filename` is published with an isolated `0xD83D` code unit.
5. The filename is passed unchanged to `showSaveFilePicker` as
   `suggestedName`, or assigned to `HTMLAnchorElement.download`.
6. A Unicode-scalar filename sink replaces the malformed unit with `U+FFFD`;
   fallback behavior varies by browser. The user receives a garbled filename,
   although the video bytes remain correct.

The earliest fault is step 3. Neither save sink should repair application
data, and changing picker/fallback handling would leave
`ExportResult.filename` malformed for every other consumer.

The parser comparison strengthens reachability: imported display names are
bounded by code-point iteration at `src/lib/parse-utils.ts:89-105`, so the
model can legitimately retain this exact trigger before export.

### Trace-safe repair

Replace code-unit slicing at the publication boundary with a 64-code-point
operation and assert well-formedness before appending the prefix and `.mp4`
suffix. Preserve the current normalization, reserved-character removal,
whitespace behavior, and fallback name.

## Final missed-issue sweep

Success/failure, abort, no-op, replacement, stale-generation, unmount,
object-URL, picker-write, and fallback-anchor terminal paths were retraced.
No second distinct root survived historical deduplication. No browser,
server, E2E, supervisor, deploy, process signal, source edit, commit, or push
was performed.
