# Cycle 1 Document Specialist Review — 2026-04-25

Scope: README.md, `.context/**` docs, package scripts, e2e docs/comments, and source/config behavior that backs public claims. Generated/vendor dirs were excluded.

## Summary

I found 3 clear documentation/code mismatches in the current tree. The issues are all scope/precision drift rather than runtime regressions:

1. The conventions doc says every component is client-side, but `src/app/layout.tsx` is still a server component.
2. The README overstates scene preset output counts.
3. The README overstates Playwright suite size.

## Findings

### 1) LOW — The conventions doc overstates a fully client-side component model

**Doc evidence**

- `.context/development/01-conventions.md:11-16` says: “All components use `'use client'` directive (client-side app)”.

**Code evidence**

- `src/app/layout.tsx:1-86` is a server component: it imports `Metadata`, renders `<html>`/`<head>`, and contains no `'use client'` directive.
- `src/app/page.tsx:1-30` and the interactive components under `src/components/` are client components, so the doc statement is broader than the actual architecture.

**Validation:** confirmed  
**Confidence:** high

**Failure scenario**

A contributor reads the conventions doc, assumes the layout can freely use browser-only hooks or DOM APIs, and then hits build errors or hydration bugs because `layout.tsx` is still server-rendered.

**Suggested fix**

Tighten the rule to something like: “Interactive UI under `src/app/page.tsx` and `src/components/` uses `'use client'`; `src/app/layout.tsx` remains a server component.”

---

### 2) MEDIUM — The README misstates how many scenes the presets generate

**Doc evidence**

- `README.md:50-53` says scene presets “auto-generate 4–6 scenes.”

**Code evidence**

- `src/lib/camera.ts:208-258` shows `generateDefaultScenes()` returns 6 scenes.
- `src/lib/camera.ts:261-273` shows `generateSimpleFlyover()` returns 1 scene.
- `src/lib/camera.ts:275-287` shows `generateBirdeyeFlyover()` returns 1 scene.
- `src/lib/camera.ts:289-333` shows `generateDynamicScenes()` returns 8 scenes.
- `src/components/SceneEditor.tsx:395-404` wires those exact generators into the preset buttons.

**Validation:** confirmed  
**Confidence:** high

**Failure scenario**

A contributor or reviewer using the README as the source of truth expects every preset to produce a small 4–6 scene sequence. In reality, two presets generate a single scene and the dynamic preset generates 8 scenes, so future UX copy, tests, or scene-editor expectations will be written against the wrong behavior.

**Suggested fix**

Replace the range with the actual preset behavior, or spell out each preset’s output count:

- Cinematic: 6 scenes
- Simple: 1 scene
- Dynamic: 8 scenes
- Bird’s Eye: 1 scene

---

### 3) MEDIUM — The README understates the size of the Playwright suite

**Doc evidence**

- `README.md:144-146` says `e2e/travelback.spec.ts` contains “39 Playwright E2E tests.”

**Code evidence**

- `e2e/travelback.spec.ts:225-1505` currently contains 74 `test(...)` declarations.

**Validation:** confirmed  
**Confidence:** high

**Failure scenario**

A maintainer, reviewer, or release planner uses the README to estimate automated coverage and assumes the e2e surface is about half its actual size. That skews review budgets, smoke-test expectations, and any documentation that depends on the suite size.

**Suggested fix**

Update the README to reflect the current test count, or remove the exact count if you expect the suite to keep changing.

---

## Missed-issue sweep

I re-scanned the main public-claim surfaces after the first pass:

- `README.md`
- `.context/README.md`
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`
- `.context/development/01-conventions.md`
- `.context/agents/non-tech-traveler-reviewer.md`
- `package.json`
- `e2e/travelback.spec.ts`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/*`
- `src/lib/*`
- `playwright.config.ts`
- `playwright.static.config.ts`
- `.github/workflows/deploy-pages.yml`

I did not find additional doc/code mismatches beyond the 3 findings above.

## Skipped-file confirmation

Excluded generated/vendor directories from the review:

- `.git`
- `.next`
- `node_modules`
- `out`
- `playwright-report`

I also did not treat build artifacts such as `tsconfig.tsbuildinfo` as review targets.
