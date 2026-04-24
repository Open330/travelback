# Document Specialist Review — Travelback

## Inventory

### Documentation inspected
- `.context/README.md`
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`
- `.context/development/01-conventions.md`
- `.context/plans/README.md`
- `.context/plans/deferred-findings-cycle-r2-2026-04-23.md`
- `.context/plans/deferred-findings-cycle-r4-2026-04-23.md`
- supporting review artifacts under `.context/reviews/`

### Code/configuration inspected
- `package.json`
- `next.config.ts`
- `playwright.config.ts`
- `playwright.static.config.ts`
- `scripts/harden-static-export.mjs`
- `scripts/serve-static.mjs`
- `scripts/smoke-static.mjs`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/ExportPanel.tsx`
- `src/lib/camera.ts`
- `src/lib/env.ts`
- `src/types.ts`
- `.github/workflows/deploy-pages.yml`

### Verification performed
- Read docs and implementation side by side.
- Ran `npm run smoke:static` successfully to confirm the current static export/base-path path still works.

## Findings

### 1) `.context/README.md` says there are no active plans, but `.context/plans/README.md` says there are
- **Doc file(s):** `.context/README.md:15-23`, `.context/plans/README.md:3-5`
- **Mismatch:** the directory tree in `.context/README.md` labels `plans/archive/` as “completed/superseded implementation-plan waves” and adds “no active plans currently,” but `.context/plans/README.md` explicitly lists active plans (`deferred-findings-cycle2-2026-04-19.md` and `deferred-findings-cycle1-2026-04-19.md`).
- **Failure scenario:** a contributor following the top-level context README may assume the planning area is archive-only and miss the live backlog / next-cycle work items.
- **Concrete fix:** update the tree/comment in `.context/README.md` to point at the actual active plan docs, or remove the stale “no active plans currently” note and clearly separate archive vs active plan locations.
- **Severity:** Medium
- **Confidence:** High

### 2) The anti-framing docs overstate what the GitHub Pages deployment actually ships
- **Doc file(s):** `.context/project/01-overview.md:27-28`, `.context/project/02-architecture.md:114-119`
- **Code/config file(s):** `scripts/serve-static.mjs:147-157`, `.github/workflows/deploy-pages.yml:17-36`
- **Mismatch:** the docs read as if header-backed anti-framing is part of the production posture. In-repo, the only server that emits the relevant headers is the local preview server in `scripts/serve-static.mjs`; the GitHub Pages workflow only uploads `out/` and does not configure any response headers.
- **Failure scenario:** readers can walk away believing the public deployment has header-backed anti-framing when, in this repo, it is only guaranteed by the JS bootstrap fallback and host-side setup outside the workflow.
- **Concrete fix:** split the documentation into “local preview server headers” vs “deployed hosting requirements,” or move deployment to a host that can emit the documented headers and say so explicitly.
- **Severity:** High
- **Confidence:** High

### 3) The documented default scene sequence uses the wrong user-facing names
- **Doc file(s):** `.context/project/02-architecture.md:84-89`
- **Code file(s):** `src/lib/camera.ts:210-259`
- **Mismatch:** the architecture doc says the default scenes are `Opening Overview → Bird's Eye → Flyover → Orbit → Ground → Closing Overview`, but the implementation generates `Orbit Midpoint` and `Ground Follow` for the middle scenes.
- **Failure scenario:** docs, QA notes, screenshots, and support guidance can refer to scene names that no longer match the UI, creating avoidable confusion for users who compare the doc to the editor.
- **Concrete fix:** update the architecture doc to list the exact scene names, or rename the presets in code if the shorter names are the intended product copy.
- **Severity:** Low
- **Confidence:** High

### 4) The export preset list in docs is incomplete
- **Doc file(s):** `.context/project/01-overview.md:88-90`
- **Code file(s):** `src/types.ts:99-106`, `src/components/ExportPanel.tsx:20-28`
- **Mismatch:** the feature list documents only YouTube, TikTok, Instagram Square/Post, and 4K presets, but the UI actually exposes seven presets, including `HD Landscape (1280×720)` and `4K Portrait (2160×3840)`.
- **Failure scenario:** users and support docs underreport the available export options, so someone may assume the app cannot export 720p or vertical 4K even though it can.
- **Concrete fix:** either expand the docs to enumerate all seven presets or simplify the prose to say “seven resolution presets” with examples.
- **Severity:** Low
- **Confidence:** High

### 5) One deferred plan item is stale because the architecture doc was already updated
- **Doc file(s):** `.context/plans/deferred-findings-cycle-r2-2026-04-23.md:83-88`
- **Current source:** `.context/project/02-architecture.md:114-119`, `src/app/layout.tsx:49-63`
- **Mismatch:** `DF-R2-011` says the architecture doc does not mention the JS-based frame-breaker, but that note now exists in the current architecture doc and the bootstrap script in `layout.tsx` is already implemented.
- **Failure scenario:** future cycles can waste time re-opening a resolved documentation gap because the backlog entry still reads like an active deferral.
- **Concrete fix:** mark `DF-R2-011` resolved and move it out of the deferred backlog, or update the deferred-findings file to say it was closed.
- **Severity:** Low
- **Confidence:** High

## Final sweep

I did not find any current mismatch in the static-export command wiring itself; `npm run smoke:static` passed and the `/travelback` base-path flow still works as documented.
