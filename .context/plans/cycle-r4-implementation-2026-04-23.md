# Cycle r4 — Implementation Plan (2026-04-23)

## Inputs

- Aggregate: `.context/reviews/_aggregate.md`
- Browser-driven review (authoritative for U-2026-04-23-01): `.context/reviews/cycle-r4-ui-ux-browser-2026-04-23.md`
- Per-agent lanes: `.context/reviews/cycle-r4-*.md` (12 files)
- User-injected TODO **U-2026-04-23-01** ingested verbatim. Entry removed from
  `.context/plans/user-injected/pending-next-cycle.md` as part of this plan's
  execution. Findings live in PROMPT 2 schedule items P-1 / P-4 / P-5 / P-6 /
  P-7 / P-8 below (direct restatement of R4-AGG-1…R4-AGG-6) and in the
  deferred record `.context/plans/deferred-findings-cycle-r4-2026-04-23.md`.

## Scheduled items

### P-1 (MEDIUM) — Drop `frame-ancestors 'none'` from meta CSP (both sites)

- **Source**: R4-AGG-1 / BUI-1 / SEC-1 / AR-2 / DS-1 / DS-4.
- **Files**:
  - `src/app/layout.tsx:62` — remove `frame-ancestors 'none';` from the dev meta content attribute.
  - `scripts/harden-static-export.mjs:12` — remove the `"frame-ancestors 'none'"` entry from STYLE_POLICY; add a one-line comment explaining why (header-only directive).
- **Risk**: very low. Defense is retained by the JS frame-buster at layout.tsx:49 and by host-level headers documented in `.context/project/02-architecture.md:117`.
- **Verification**: console error "CSP directive 'frame-ancestors' is ignored…" no longer fires on page load.

### P-2 (MEDIUM) — Change root wrapper to `<main>`

- **Source**: R4-AGG-2 / BUI-2 / CR-1 / AR-1 / A11Y-1.
- **File**: `src/app/page.tsx:314`.
- **Change**: `<div className="…" data-travelback-app-root="true">` → `<main id="app" className="…" data-travelback-app-root="true">`.
- **Risk**: very low. `ModalDialog` targets `[data-travelback-app-root="true"]` by attribute, so the existing inert-toggle continues to work unchanged.
- **Verification**: CDP AX tree exposes `{role:"main"}`.

### P-3 (MEDIUM) — Label the landing drop-zone

- **Source**: R4-AGG-3 / BUI-3 / A11Y-2.
- **File**: `src/components/FileUpload.tsx:153-165` (+ the h2 at 209 and drop-hint p at 215).
- **Change**:
  - Give the h2 `id="fileupload-title"`.
  - Give the drop-hint `<p>` `id="fileupload-drop-hint"`.
  - Add `role="group" aria-labelledby="fileupload-title" aria-describedby="fileupload-drop-hint"` to the wrapper `<div>` at line 153.
- **Risk**: very low. ID names are hyphen-prefixed and not reused.
- **Verification**: DOM query returns non-null `role`, matching `aria-labelledby`, `aria-describedby`.

### P-4 (LOW) — Sample-preview button: hide caption from accessible name

- **Source**: R4-AGG-4 / BUI-4 / CR-2 / CT-1 / T-3 / A11Y-3.
- **File**: `src/components/FileUpload.tsx:186-194`.
- **Change**: wrap the existing caption `<div class="absolute inset-x-0 bottom-0 …">` with `aria-hidden="true"`.
- **Risk**: none (visual-only div, already purely decorative for the already-labeled button).

### P-5 (LOW) — `Reload Page` button in map-error fallback: add `min-h-11`

- **Source**: R4-AGG-5 / BUI-18 / CR-3 / A11Y-5 / T-4.
- **File**: `src/components/MapView.tsx:949`.
- **Change**: add `min-h-11` to the button className.

### P-6 (LOW) — Sample-preview button: add `focus-visible` ring

- **Source**: R4-AGG-6 / BUI-19 / CR-4 / A11Y-4.
- **File**: `src/components/FileUpload.tsx:176-195`.
- **Change**: append `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]` (matches the existing focus-visible utilities used on timeline handles in `TimelineSelector.tsx:370`).

### P-7 (LOW) — `scripts/smoke-static.mjs`: add regression guard for `frame-ancestors` in meta CSP

- **Source**: R4-AGG-7 / TE-1.
- **File**: `scripts/smoke-static.mjs`.
- **Change**: after hashing, walk the emitted HTML and fail if any meta CSP `content` attribute substring-matches `frame-ancestors`.

### P-8 (DOC) — Update `.context/project/02-architecture.md` to record the meta CSP change

- **Source**: R4-AGG-1 / DS-1.
- **File**: `.context/project/02-architecture.md`.
- **Change**: the line near :117 already notes host-level anti-framing is authoritative. Append a one-sentence clarification: "As of cycle r4 the meta CSP no longer advertises `frame-ancestors 'none'` — Chromium/Firefox ignore it in meta and log a console error; host-header anti-framing + the bootstrap JS frame-buster remain authoritative."

### P-9 (DOC) — Remove ingested user-injected TODO entry

- **Source**: U-2026-04-23-01 instruction.
- **File**: `.context/plans/user-injected/pending-next-cycle.md`.
- **Change**: strip the `## U-2026-04-23-01 …` block (all lines until the next `---` end delimiter or file end), keep the file header / introductory paragraph in place.

## Deferred

See `.context/plans/deferred-findings-cycle-r4-2026-04-23.md`. Strict rules
applied: file+line, original severity/confidence, concrete reason, exit
criterion. No finding silently dropped. Security items are only deferred when
the repo's own docs (`.context/project/02-architecture.md`) explicitly permit
the defense to live at the host layer; the one applicable finding
(R4-AGG-D9 Nominatim CSP exemption) was already logged in cycle-r3 and is
unchanged here.

## Progress

- P-1 — DONE
- P-2 — DONE
- P-3 — DONE
- P-4 — DONE
- P-5 — DONE
- P-6 — DONE
- P-7 — DONE
- P-8 — DONE
- P-9 — DONE

All nine scheduled items implemented in cycle r4.

## Gates after implementation

- ESLint: PASS (0 errors, 0 warnings)
- TypeScript (`tsc --noEmit`): PASS (0 errors)
- Next.js build: PASS (`harden-static-export` ran against 3 HTML files)
- `npm run smoke:static`: PASS (with new frame-ancestors regression guard)
- `npm run test:e2e:static:ci`: PASS
- `npm audit --audit-level=high`: 0 vulnerabilities

## Deployment

DEPLOY_MODE was `none` — no deployment executed.
