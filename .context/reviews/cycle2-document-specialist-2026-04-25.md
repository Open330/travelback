# Document Specialist — Cycle 2 (2026-04-25)

**Scope:** `.context/**`, `package.json`, `scripts/*`, and rendered UI copy/labels in the current static build.

## Summary

I found 5 doc/code or copy mismatches. The repo’s build and static smoke scripts are still aligned with the docs, so the issues are mostly terminology drift and a couple of misleading user-facing hints.

### Inventory checked

- **Docs:** `.context/development/01-conventions.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/agents/non-tech-traveler-reviewer.md`
- **Scripts:** `package.json`, `scripts/harden-static-export.mjs`, `scripts/smoke-static.mjs`, `scripts/serve-static.mjs`
- **Rendered UI copy:** landing page, file-upload hints, scene editor labels
- **Verification:** `npm run build` ✅, `npm run smoke:static` ✅, headless Playwright pass against the built app ✅

## Findings

### DS2-1 — LOW — Conventions doc overstates a fully client-only component model

**Location:** `.context/development/01-conventions.md:11-15` vs `src/app/layout.tsx:1-3`

**Failure scenario:** A contributor reads “All components use `'use client'`” and assumes the app layout can safely use browser-only hooks or DOM APIs. That leads to build errors or hydration bugs, because `src/app/layout.tsx` is still a server component.

**Fix:** Narrow the rule to the interactive app shell and `src/components/` files, and explicitly note that `src/app/layout.tsx` remains server-rendered.

**Severity:** LOW  
**Confidence:** HIGH  
**Status:** OPEN

---

### DS2-2 — LOW — Camera terminology drifts between docs and the actual UI labels

**Location:** `.context/project/01-overview.md:85`, `.context/project/02-architecture.md:73-80` vs `src/lib/i18n.ts:208-220`, `src/components/SceneEditor.tsx:374-382`

**Failure scenario:** The docs talk about `Ground Follow` and `Orbit`, but the rendered UI shows `Street View` and `Spin Around`. In a support thread or bug report, the reader has to translate between two naming schemes just to find the right control.

**Fix:** Pick one canonical naming set and use it everywhere, or add an explicit “UI label / semantic mode” mapping in the docs.

**Severity:** LOW  
**Confidence:** HIGH  
**Status:** OPEN

---

### DS2-3 — LOW — Landing-page support copy is inconsistent across nearby hints

**Location:** `src/lib/i18n.ts:19-20, 37` and `src/components/FileUpload.tsx:229-239`

**Failure scenario:** The landing copy says “AllTrails” in the drop hint, but the next line drops AllTrails and Komoot and falls back to “most GPS apps.” The guide and project docs are broader than that. A traveler using AllTrails or Komoot can reasonably wonder whether their export is actually supported.

**Fix:** Standardize the supported-app wording across the landing screen, the guide, and the `.context` docs. A single generic line would be cleaner than three slightly different lists.

**Severity:** LOW  
**Confidence:** HIGH  
**Status:** OPEN

---

### DS2-4 — LOW/MEDIUM — Google Guide tip overstates how large “large files” can be

**Location:** `src/lib/i18n.ts:203-206` vs `src/lib/parser.ts:541-552`

**Failure scenario:** The guide says “Large files (100MB+) may take a moment to parse,” but the parser hard-rejects JSON over 100MB and XML over 4MB. That makes the tip sound more permissive than the real upload limits, so users may waste time trying files that cannot succeed.

**Fix:** Reword the tip to “Large files up to the limit may take a moment to parse; files over the limit are rejected,” or tailor the tip per format.

**Severity:** LOW/MEDIUM  
**Confidence:** HIGH  
**Status:** OPEN

---

### DS2-5 — LOW — ExportPanel comment promises codec re-probing that the code does not actually do

**Location:** `src/components/ExportPanel.tsx:33-35, 85-110`

**Failure scenario:** The comment says the codec cache “re-probes after browser updates,” but the state is never reset when the panel re-opens. If a browser gains codec support while the tab stays open, the panel can keep showing stale unsupported state until the page reloads.

**Fix:** Either reset `codecSupport` when the panel opens, or change the comment to match the one-time-per-session behavior you actually want.

**Severity:** LOW  
**Confidence:** MEDIUM/HIGH  
**Status:** OPEN

## Final sweep

- No package-script drift found between `.context/project/01-overview.md` and `package.json`.
- The static build and smoke checks passed after inspection.
- Rendered UI copy was verified in a headless browser session; the landing upload hints and scene labels match the mismatches called out above.
