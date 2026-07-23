# Cycle 7 test-engineer review — 2026-07-24

Baseline: `216001f`

## Inventory and deduplication

The pass inventoried all Vitest suites and their production counterparts, the
complete Playwright catalog, E2E support and route fixtures, scripts,
generated/public assets, test/build/static configuration, workflow, and
current review/plan history. Coverage was mapped across parser/worker parity,
map and camera control, playback, scene/timeline transactions, export
settlement/download, localization, static serving, and supervised-process
containment.

Cycle 1–6 test roots and the Cycle 6 regression coverage were excluded. An
independent full static scan found no further new test-backed defect. `TE7-01`
is the test gap for the same canonical root as `CR7-01`/`ARCH7-01`; it must
not be counted separately.

## TE7-01 — Filename tests omit a surrogate-pair truncation boundary

- Severity: **Low**
- Confidence: **High**
- Production root: `src/lib/videoEncoder.ts:290-299`
- Existing unit coverage: `src/lib/videoEncoder.test.ts:230-477`
- Existing E2E example: `e2e/travelback.spec.ts:620-649`

The encoder lifecycle suite verifies buffers, frame staging, cancellation,
finalization, and error classification, but its successful export does not
assert `result.filename` at Unicode truncation boundaries. The localized E2E
asserts an ordinary Korean filename, whose characters each occupy one UTF-16
code unit; it cannot detect a split surrogate.

Add a focused unit case with a successful mocked export and a track name of
`'a'.repeat(63) + '😀'`. It should assert:

1. the filename retains the complete emoji before `.mp4`;
2. the sanitized name respects a 64-code-point cap;
3. the filename is well formed and contains no isolated high or low
   surrogate;
4. ordinary non-Latin and reserved-character behavior remains unchanged.

A helper-level table should also cover an astral character before, across,
and after the boundary. Browser E2E is unnecessary for the root regression;
the pure filename result is the earliest deterministic assertion point.

## Verification and final sweep

A browser-free reproduction of the current expression yielded a final code
unit of `0xD83D` and `String.prototype.isWellFormed() === false`. This proves
the missing test would fail before the fix. No optional test suite was run
during finalization, and no E2E, Playwright, Chromium, browser, server,
supervisor, deploy, or source-edit command was used.

The closing coverage sweep found no second new gap tied to a current,
historically distinct defect.
