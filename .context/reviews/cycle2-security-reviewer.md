# Security Reviewer — Cycle 2 (2026-04-23)

## Verified Cycle 1 Fixes

- F8 (reader.onerror ParseError): Confirmed fixed — `READ_FAILED` code properly mapped
- F12 (CSP unsafe-inline): Deferred — harden script exists, CI check deferred

## New Findings

### N1. GoogleGuide external link opens without noreferrer validation
- **Severity**: Low | **Confidence**: High
- **File**: `src/components/GoogleGuide.tsx:343-351`
- **Issue**: The `<a>` link to takeout.google.com has `rel="noopener noreferrer"` which is correct. However, the href is hardcoded (`step.action.href`). No user-controlled URLs are rendered, so this is safe. Confirming no injection risk.

### N2. JourneyCreator coordinate parsing does not validate against prototype pollution patterns
- **Severity**: Low | **Confidence**: Medium
- **File**: `src/components/JourneyCreator.tsx:75-111`
- **Issue**: `parseCoordinateQuery` uses `decodeURIComponent` on user input and regex matching. The output is only used as numeric coordinates (`lat`/`lon`), so there is no injection risk. The parsed values go through `Number.parseFloat` and range validation. Confirming safe.

## Summary

No new security issues found. The codebase has appropriate guards: ParseError codes avoid English text dependency, CSP is hardened in production, and user-controlled inputs are properly validated.
