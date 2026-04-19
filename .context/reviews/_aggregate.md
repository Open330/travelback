# Prompt 1 aggregate review — cycle 3

Generated on 2026-04-19 after a fresh comprehensive review of the current `main` branch.

## Review lanes considered
- Fresh comprehensive review (`cycle3-comprehensive-2026-04-19.md`) covering code quality, security, performance, UX, correctness, architecture, accessibility
- Prior cycle 2 aggregate (`_aggregate.md`) and all per-agent reviews reviewed for carried-forward items
- Prior deferred findings (`deferred-findings-cycle1-2026-04-19.md`, `deferred-findings-cycle2-2026-04-19.md`) reviewed for items that should re-open

## Aggregation method
- Re-verified every prior finding against the current codebase.
- Deduped overlapping findings and kept the highest severity / confidence.
- Marked items as NOT CONFIRMED where the current code already handles the issue.
- Carried forward still-valid deferred items as-is (they remain deferred per the existing rules).
- New findings from this cycle are prefixed C3-AGG.

## Merged findings (active, to be addressed this cycle)

### C3-AGG-001 — HIGH — `parseSemanticSegments` misses inter-timelinePath/visit segment boundaries

**Cross-agent agreement:** code-reviewer, cycle2-comprehensive, cycle3-comprehensive, tracer
**Primary locations:**
- `src/lib/parser.ts:269-307`

**Why it matters:**
Google phone exports with `semanticSegments` that have both `timelinePath` and `visit` entries within a single segment object produce continuous routes without segment breaks. The `segStarts` array only records boundaries between top-level segments, not between `timelinePath` and `visit` sub-sections within the same segment.

**Suggested fix:**
Add `segStarts.push(out.length)` between the `timelinePath` processing block and the `visit` processing block within `parseSemanticSegments`. This ensures that a walk segment followed by a visit within the same `semanticSegments` entry produces separate route segments.

**Confidence:** High

---

### C3-AGG-002 — MEDIUM — Scene editor normalization warnings are dead code

**Cross-agent agreement:** tracer, cycle3-comprehensive
**Primary locations:**
- `src/components/SceneEditor.tsx:201-213`
- `src/lib/camera.ts:33-43`

**Why it matters:**
`commitScenes` calls `normalizeScenes()` first, which eliminates any `startPercent >= endPercent` scenarios. The warning check runs on the already-normalized output, so it can never fire. Users who enter invalid ranges see their scenes silently disappear or auto-correct without feedback.

**Suggested fix:**
Validate raw scenes BEFORE normalization, or keep invalid scenes in a "draft" state with inline warnings until the user corrects them.

**Confidence:** High

---

### C3-AGG-003 — MEDIUM — Worker fallback rejects instead of retrying main-thread parser

**Cross-agent agreement:** tracer, cycle3-comprehensive
**Primary locations:**
- `src/lib/parser.ts:459-482` — `worker.onmessage` error and `worker.onerror` both reject outright

**Why it matters:**
When a worker crashes during parsing (e.g., memory pressure on large JSON), the user gets a rejection even though the main-thread parser could handle the file. Only worker creation failure falls back correctly.

**Suggested fix:**
In both `worker.onmessage` error path and `worker.onerror`, fall back to `parseGoogleLocationHistory(decodeJsonBuffer(buffer))` instead of rejecting.

**Confidence:** High

---

### C3-AGG-004 — MEDIUM — Map error shows raw WebGL dump to non-technical users

**Cross-agent agreement:** designer, non-tech-traveler-reviewer, cycle3-comprehensive
**Primary locations:**
- `src/components/MapView.tsx:928` — `t('app.mapLoadFailed').replace('{error}', mapError)`

**Why it matters:**
Raw WebGL context errors (GPU vendor, renderer, etc.) are shown directly to users. This is confusing for non-technical users and exposes internal browser/GPU information.

**Suggested fix:**
Show a user-friendly message and put the raw error behind a "Show technical details" disclosure. Update the i18n key to not include `{error}` interpolation in the primary message.

**Confidence:** High

---

### C3-AGG-005 — MEDIUM — Timeline selector handles are not keyboard-accessible

**Cross-agent agreement:** designer, cycle3-comprehensive
**Primary locations:**
- `src/components/TimelineSelector.tsx:317-375`

**Why it matters:**
The timeline range handles have no `tabIndex`, no `role="slider"`, no `aria-valuenow/min/max`, and no arrow-key handlers. Keyboard-only users cannot adjust the time window at all.

**Suggested fix:**
Add `tabIndex={0}`, `role="slider"`, `aria-valuenow/min/max` attributes, arrow-key/Home/End handlers, and visible focus rings to both handles.

**Confidence:** High

---

### C3-AGG-006 — MEDIUM — Error toast and file-upload errors lack live-region semantics

**Cross-agent agreement:** designer, cycle3-comprehensive
**Primary locations:**
- `src/components/Toast.tsx:31-55`
- `src/components/FileUpload.tsx:249-250`

**Why it matters:**
Error messages in toasts and file-upload error states are visual-only. Screen readers will not announce them when they appear.

**Suggested fix:**
Add `aria-live="polite"` or `role="status"` to the toast container, and `role="alert"` to inline error messages.

**Confidence:** High

---

### C3-AGG-007 — MEDIUM — Export download fallback claims success unconditionally

**Cross-agent agreement:** critic, cycle3-comprehensive
**Primary locations:**
- `src/lib/videoEncoder.ts:173-181` — `<a>` fallback always returns `true`
- `src/components/ExportPanel.tsx:205` — `t('export.savedToDownloads')` shown on success

**Why it matters:**
The `<a>` download fallback cannot confirm that the browser actually saved the file. The UI says "Your video is in your Downloads folder" even when the download may have been silently blocked.

**Suggested fix:**
Change the success copy from "saved to Downloads" to "download started" for the `<a>` fallback path, or reword the i18n key to be less specific about file location.

**Confidence:** Medium

---

### C3-AGG-008 — LOW — `--err-rgb` fallback in `page.tsx` is misleading but harmless

**Cross-agent agreement:** cycle2-comprehensive, cycle3-comprehensive
**Primary location:**
- `src/app/page.tsx:325`

**Why it matters:**
The CSS variable is always defined; the fallback value is redundant.

**Suggested fix:**
Remove the fallback or add a comment.

**Confidence:** High

---

### C3-AGG-009 — MEDIUM — No build guard against future tool-state leakage into static output

**Cross-agent agreement:** critic (derived), cycle3-comprehensive
**Primary locations:**
- `scripts/harden-static-export.mjs`
- `scripts/smoke-static.mjs`
- `.gitignore`

**Why it matters:**
The `.omc` directory was cleaned up in cycle 2, but there is no guard to prevent recurrence. Any future tool run that writes hidden directories to `public/` or `out/` will silently ship those artifacts.

**Suggested fix:**
Add a post-build scan in `smoke-static.mjs` or `harden-static-export.mjs` that fails if hidden directories (`.omc`, `.omx`, `.claude`, etc.) are found in `out/`. Also add `.omc/` and `.omx/` to `.gitignore`.

**Confidence:** High

---

## Carried-forward deferred items (not re-opened this cycle)

These remain in `deferred-findings-cycle2-2026-04-19.md` and are NOT scheduled for this cycle:
- DF-C2-001: Mobile information architecture gaps
- DF-C2-002: Playback progress drives whole-app rerenders
- DF-C2-003: Large GPX/KML imports parse on main thread
- DF-C2-004: Manual route dragging is O(n) on pointer move
- DF-C2-005: Export settings permit browser-hostile combinations
- DF-C2-006: Locale/help content eagerly bundled
- DF-C2-007: Large default variable font payload
- DF-C2-008: E2E suite serialized and sleep-heavy
- DF-C2-009: Residual CSP allows inline styles
- DF-C2-010: Local-only bundled styles ship without real basemap

And from cycle 1:
- DF-C1-001: Mobile information architecture and discoverability polish
- DF-C1-002: Broad maintainability/performance restructuring

## Items verified as already fixed or not actual issues

| Prior ID | Description | Why closed |
|----------|-------------|------------|
| C2-AGG-001 | CSP blocks CARTO tiles | Fixed: layout.tsx includes CARTO domains |
| C2-AGG-002 | Dead `public/theme-init.js` | Fixed: file deleted |
| C2-AGG-003 | `navigator.webdriver` debug surface | Fixed: removed from src/ and e2e/ |
| C2-AGG-004 | Sequential codec probing | Fixed: parallel + cache |
| C2-AGG-005 | Single-point `buildFitBounds` | Fixed: DEGENERATE_PADDING guard |
| C2-AGG-006 | Mobile menu ARIA | Fixed: no role="menu", auto-focus first button |
| C2-AGG-007 | `<html lang>` mismatch | Fixed: bootstrap script sets lang from localStorage |
| Debug-1 | Export cancel non-abortable cleanup | Fixed: waitForIdle receives abort signal |
| Debug-3 | Zero-distance interpolation | Fixed: guard returns first point |
| Sec-2 | `.omc` state artifact in `public/` | Fixed: directory deleted |
| CodeRev-2 | Antimeridian interpolation | NOT CONFIRMED: code uses shortestLngDelta correctly |
| Debug-2 | Export starts before codec check | NOT CONFIRMED: codecReady guard blocks button |
| Debug-4 | Theme toggle assumes modern APIs | NOT CONFIRMED: addListener fallback exists |

## Recommended implementation order for this cycle
1. **C3-AGG-001 (HIGH)**: Fix `parseSemanticSegments` segment boundaries — correctness bug in Google phone export parsing
2. **C3-AGG-003 (MEDIUM)**: Add worker fallback to main-thread parser — prevents user-visible failures
3. **C3-AGG-004 (MEDIUM)**: Replace raw WebGL error with user-friendly message — UX accessibility
4. **C3-AGG-005 (MEDIUM)**: Add keyboard accessibility to timeline handles — WCAG compliance
5. **C3-AGG-006 (MEDIUM)**: Add live-region semantics to error messages — WCAG compliance
6. **C3-AGG-002 (MEDIUM)**: Fix scene editor dead warnings — UX correctness
7. **C3-AGG-007 (MEDIUM)**: Soften download success language — UX honesty
8. **C3-AGG-009 (MEDIUM)**: Add build guard for tool-state leakage — build hygiene
9. **C3-AGG-008 (LOW)**: Remove misleading `--err-rgb` fallback — code clarity
