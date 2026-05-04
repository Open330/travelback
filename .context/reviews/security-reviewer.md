# Security Reviewer — Cycle 3 (2026-05-04)

## Scope
OWASP top 10, secrets, unsafe patterns, auth/authz.

## Findings

### C3-S1. XML parser has robust preflight checks
**Severity**: N/A | **Confidence**: High
**File**: `src/lib/parser.ts:126-162`
**Issue**: preflightXml rejects DOCTYPE/ENTITY, caps tag count at 150K, caps nesting at 128. stripXmlEntities removes entities as defense-in-depth. DOMParser used on sanitized text. Good security posture.

### C3-S2. JSON depth check caps at 64 levels, scan limited to 10MB
**Severity**: N/A | **Confidence**: High
**File**: `src/lib/googleJsonParser.ts:283-304`
**Issue**: checkJsonDepth scans up to 10MB of input. JSON.parse throws RangeError on excessive depth, caught and converted to ParseError. Worker path uses pre-flight check to avoid crash.

### C3-S3. File size limits are enforced before parsing
**Severity**: N/A | **Confidence**: High
**File**: `src/lib/parser.ts:223-226`
**Issue**: MAX_FILE_SIZE=200MB, XML_MAX_FILE_SIZE=4MB, JSON_MAX_FILE_SIZE=100MB. Checked before reading file contents.

### C3-S4. Test stub is localhost-gated
**Severity**: N/A | **Confidence**: High
**File**: `src/lib/test-stub.ts:13`
**Issue**: Checks hostname === 'localhost' || '127.0.0.1' before localStorage check. Console.warn when active. C2-F2 verified non-issue.

### C3-S5. Filename sanitization in video export
**Severity**: N/A | **Confidence**: High
**File**: `src/lib/videoEncoder.ts:180-186`
**Issue**: NFKC normalization, strips special chars, collapses whitespace, trims trailing dots/spaces, limits to 64 chars. Falls back to 'Journey'.

### C3-S6. basePath defends against path traversal
**Severity**: N/A | **Confidence**: High
**File**: `src/lib/env.ts:1-7`
**Issue**: Rejects '..' in path. Strips leading/trailing slashes. Returns empty string for undefined.

### C3-S7. No secrets or API keys in codebase
**Severity**: N/A | **Confidence**: High
**Issue**: No hardcoded credentials, API keys, or tokens found. No .env files committed.

## Summary
Excellent security posture. All file parsing is defensively coded with size limits, depth limits, and input sanitization. No secrets in codebase. No new security findings.
