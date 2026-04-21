# Cycle 6 Document Specialist Review -- 2026-04-21

**Reviewer:** document-specialist
**Scope:** Doc/code mismatches against authoritative sources, comment accuracy

---

## Review Summary

Reviewed all code comments, i18n translations, and documentation for accuracy against the actual code behavior. Found 1 minor comment inaccuracy.

---

## New Findings

### C6-DS1: MapView eslint-disable comment references wrong line number

**Severity:** LOW
**Confidence:** HIGH
**File:** `src/components/MapView.tsx:935`

The eslint-disable comment says "the effect already handles missing layers via the guard on line 824" but the actual guard is on line 833 (checking `!map.getLayer('route-line') || !map.getLayer('trail-line')`). Line numbers shifted due to prior edits. This is a comment-only inaccuracy with no functional impact.

**Impact:** None (comment only).
**Fix:** Update the comment to reference the correct line or describe the guard generically.

---

## Verification

- All eslint-disable comments have accurate rationale text (except the line reference above)
- i18n translations are consistent across all 5 locales (en, ko, ja, zh, es)
- Parser error codes match between parser.ts and FileUpload.tsx errorCodeMap
- All component prop interfaces match their usage in page.tsx

**Previously reported -- still valid:**
- C4-A20: Bootstrap script minified with no source reference
- C4-A21: eslint-disable comments lack consistent format
