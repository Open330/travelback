# Cycle 7 code review — 2026-07-24

Baseline: `216001f`

## Coverage and deduplication

The review inventoried all production and test paths under `src/`, all build,
static-serving, smoke, E2E-launch, and supervisor scripts, the full Playwright
catalog and fixtures, public assets and generated worker, root configuration,
the Pages workflow, README, and active `.context` architecture, review, and
plan records. Cross-file traces covered import/replace, map and camera
ownership, playback, scene and timeline editing, export/finalization/download,
localization, workers, static hardening, and process containment.

History comparison included the Cycle 1–6 aggregates and implementation
plans, older filename/export findings, and the three explicit process-platform
residuals. The Cycle 6 parser, scene-preview, wrapped-geometry, and semantic
no-op fixes were excluded. A second independent whole-repository static scan
found no additional new root.

## CR7-01 — Filename truncation can create an ill-formed Unicode string

- Severity: **Low**
- Confidence: **High**
- Status: **Confirmed by deterministic browser-free reproduction**
- Regions:
  - `src/lib/videoEncoder.ts:290-299`
  - `src/lib/videoEncoder.ts:323-338,374-398`
  - `src/lib/parse-utils.ts:89-105`
  - `src/lib/videoEncoder.test.ts:230-477`

`exportVideo()` sanitizes the track name and then applies `.slice(0, 64)`.
JavaScript `slice` counts UTF-16 code units, so it can cut an astral Unicode
character between its high and low surrogates. For example, a track name of
63 ASCII characters followed by `😀` produces a 64-code-unit result whose
last code unit is the unpaired high surrogate `0xD83D`.

The resulting `filename` is therefore ill-formed before it reaches either
`showSaveFilePicker({ suggestedName })` or the fallback anchor. The picker
converts its `USVString` name to scalar Unicode and replaces the unpaired
surrogate with `U+FFFD`; fallback handling is browser-dependent. The MP4 data
is intact, but the visible saved filename is corrupted at this exact
boundary.

This is not a duplicate of the earlier non-Latin filename fix or the imported
name-length fix. Prior reviews treated the exporter cap as safe, while
`normalizeImportedTrackName()` was separately changed to iterate Unicode code
points and explicitly avoid splitting surrogate pairs. The export path still
uses the old code-unit policy.

### Root fix

Bound the sanitized name by Unicode code point, for example with
`Array.from(name).slice(0, 64).join('')`, preferably through a small shared or
named helper that makes the length unit explicit. Add a regression using
`'a'.repeat(63) + '😀'` and assert that the exact emoji remains, the result is
well formed, and the expected prefix/suffix are preserved.

## Final missed-issue sweep

The closing sweep rechecked success, failure, cancellation, replacement,
unmount, no-op, stale-publication, and cleanup edges. No second actionable
root survived reachability analysis and historical deduplication. Adjacent
download-cancellation and fallback-anchor candidates were rejected as
previously reviewed behavior or accepted ownership boundaries.

Fresh evidence was limited to a deterministic Node probe of the current
sanitization expression: it returned `boundedCodeUnits: 64`,
`finalCodeUnitHex: "d83d"`, and `wellFormed: false`; conversion through a
Web-style Unicode scalar sink produced a replacement character. No E2E,
Playwright, Chromium, browser, server, supervisor, deploy, commit, push, or
source edit was performed.
