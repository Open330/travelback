# Security Review — Cycle 2 (2026-04-23)

## Methodology
Examined all 28 source files for security vulnerabilities: XSS, injection, unsafe deserialization, secrets in source, CSP compliance, and input validation. Deduplicated against all prior cycles and deferred items.

## New Findings

**No new findings.**

## Verification of Prior Security Controls

- **No eval/innerHTML/dangerouslySetInnerHTML**: The single `dangerouslySetInnerHTML` in layout.tsx is the expected bootstrap script for theme/mapstyle/locale initialization before React hydrates. CSP-hardened via post-build script. CONFIRMED.
- **XML entity stripping**: parser.ts strips XML entities before parsing GPX/KML. CONFIRMED.
- **JSON depth limiting**: MAX_JSON_DEPTH=64 in parser.ts. CONFIRMED.
- **File size limits**: 200MB general, 100MB JSON in parser.ts. CONFIRMED.
- **No secrets in source**: No API keys, tokens, or credentials found. CONFIRMED.
- **CSP hardening**: `scripts/harden-static-export.mjs` computes Sha-256 hashes for inline scripts. CONFIRMED.
- **Frame-busting**: Bootstrap script in layout.tsx includes frame-busting protection. CONFIRMED.
- **localStorage wrapping**: All localStorage access wrapped in try/catch. CONFIRMED.

## Deferred Items Still Valid

- DF-C17-003: CSP unsafe-inline CI check (MEDIUM) — harden script exists and works, CI validation is infra work.

## Specific Checks

- **showSaveFilePicker type casting** (videoEncoder.ts:175-180): Low severity, works correctly. Deferred (DF-C17-014).
- **Filename sanitization** in videoEncoder.ts: Properly strips path separators and special characters. CONFIRMED.
- **Export panel Share API**: Uses `navigator.share` with file support check before invoking. Safe.
- **External link in GoogleGuide**: Uses `rel="noopener noreferrer"` on takeout link. CONFIRMED.
