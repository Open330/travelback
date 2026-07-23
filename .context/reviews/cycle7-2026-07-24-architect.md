# Cycle 7 architecture review — 2026-07-24

Baseline: `216001f`

## Inventory and outcome

The architecture pass mapped every production/test module under `src/`,
scripts and process boundaries, E2E fixtures and support, generated/public
artifacts, build/test/static configuration, workflow, README, and current
architecture/review/plan history. The dependency and ownership traces covered
parsers and worker parity, route replacement, map/camera/playback state,
scene/timeline transactions, export leases and retained artifacts, file-save
sinks, localization, and static deployment boundaries.

Cycle 1–6 roots, including all four Cycle 6 fixes, and the three documented
process-platform residuals were removed from consideration. An independent
whole-repository scan corroborated that no other new architectural root
survived. The finding below is the same canonical root as `CR7-01` and counts
once in the aggregate.

## ARCH7-01 — Track-name length has conflicting Unicode units across layers

- Severity: **Low**
- Confidence: **High**
- Root: `src/lib/videoEncoder.ts:290-299`
- Related contract: `src/lib/parse-utils.ts:9-10,89-105`
- Sinks: `src/lib/videoEncoder.ts:323-338,374-398`

The import boundary declares and enforces a Unicode-code-point length policy:
`MAX_TRACK_NAME_CODE_POINTS` is explicit, and
`normalizeImportedTrackName()` iterates `for (const codePoint of normalized)`.
The export boundary independently redefines a 64-character policy with
UTF-16 `.slice(0, 64)`. These two representations disagree about what a
character is.

The resulting flow is:

`valid Track.name` → export-local normalization → code-unit truncation →
ill-formed filename → picker/anchor boundary.

This is a boundary-contract defect rather than a parser defect. A fully valid,
bounded imported name can cross into the exporter and become malformed solely
because an astral character straddles code units 64 and 65.

### Repair boundary

Keep the exporter-specific 64-code-point cap, but encode that unit in one
named function/constant and implement it by code-point iteration. Reuse a
generic well-formed truncation helper only if doing so does not couple import
cleanup rules to filesystem sanitization rules. The invariant at the export
boundary should be: sanitized, nonempty, filesystem-safe, and well-formed
Unicode before constructing `ExportResult.filename`.

## Final sweep

The final architecture sweep found no new cycle, ownership leak, layering
violation, or state-publication root beyond `ARCH7-01`. Previously documented
workflow, licensing, canvas, and supervised-process boundaries were not
reopened. No browser, server, E2E, supervisor, deploy, source edit, or
process-control command was used.
