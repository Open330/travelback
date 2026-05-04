# Security Review — Travelback (Cycle 1, 2026-05-04)

**Reviewer**: security-reviewer
**Scope**: OWASP focus, CSP, file parsing, data handling

## Summary

Solid security posture for a client-side static app. CSP is well-configured with hash-based script-src, XML entity attacks are mitigated, and there are no server-side attack surfaces.

## Findings

### SR-01: XML entity declaration stripping is defense-in-depth only
**Confidence**: High
**File**: `src/lib/parser.ts:139-170`
**Description**: Two-layer defense: `preflightXml` rejects documents with DOCTYPE/ENTITY, then `stripXmlEntities` removes any that slipped through. The preflight regex is the primary guard; strip is secondary.
**Risk Level**: Low — adequate defense-in-depth.

### SR-02: JSON depth check capped at 10MB scan
**Confidence**: Medium
**File**: `src/lib/googleJsonParser.ts:298-299`
**Description**: `checkJsonDepth` scans only the first 10MB. Deep nesting beyond 10MB passes the pre-check but fails at `JSON.parse` (RangeError), which is the correct fallback.
**Risk Level**: Low — correct fallback exists.

### SR-03: CSP uses `unsafe-inline` for styles via `style-src-attr`
**Confidence**: Medium
**File**: `src/app/layout.tsx`, `scripts/harden-static-export.mjs`
**Description**: `style-src-attr 'unsafe-inline'` is necessary for React inline styles. CSS injection via attributes has limited impact.
**Risk Level**: Low — standard pattern for React apps.

### SR-04: Frame-busting relies on JavaScript fallback
**Confidence**: Medium
**File**: `scripts/smoke-static.mjs`
**Description**: JS frame-busting is the only anti-framing measure for GitHub Pages (can't send custom headers). JS bypass is possible in sandboxed iframes.
**Risk Level**: Low — limited impact since app handles local data only.

### SR-05: File size limits properly enforced per format
**Confidence**: High
**File**: `src/lib/parser.ts:243-246,361-372`
**Description**: XML capped at 4MB, JSON at 100MB, general at 200MB. Prevents memory exhaustion DoS.
**Risk Level**: None.

### SR-06: No XSS vectors in file name handling
**Confidence**: High
**File**: `src/lib/videoEncoder.ts:180-186`
**Description**: Video filenames are sanitized (NFKC normalize, control char removal, truncation). Used in download context, not rendered as HTML.
**Risk Level**: None.

### SR-07: Web Worker uses transferable ArrayBuffer correctly
**Confidence**: High
**File**: `src/lib/parser.ts:354`
**Description**: Buffer transferred to worker, preventing main thread access after transfer. Fallback copy only for files <= 16MB.
**Risk Level**: None.

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0     |
| High     | 0     |
| Medium   | 3     |
| Low      | 2     |
| None     | 2     |

## Verdict: **SHIP IT**
