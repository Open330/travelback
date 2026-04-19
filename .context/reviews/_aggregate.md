# Prompt 1 aggregate review — cycle 1

Generated on 2026-04-19 after a multi-agent review fan-out across:
- code-reviewer
- security-reviewer
- critic
- verifier
- test-engineer
- architect
- debugger
- designer
- perf-reviewer
- tracer
- document-specialist
- non-tech-traveler-reviewer (failed after one retry; see AGENT FAILURES)

## Aggregation method
- Deduped overlapping findings across all completed agent reports.
- Preserved the highest severity / confidence among duplicates.
- Noted cross-agent agreement, since repeated findings are higher-signal.
- Kept per-agent reports in `.context/reviews/*.md` for provenance.

## AGENT FAILURES
- **non-tech-traveler-reviewer** — initial run blocked on a long-running E2E verification pass and never wrote `./.context/reviews/non-tech-traveler-reviewer.md`.
- **Retry 1** was launched with a narrowed brief that explicitly avoided blocking on the full E2E suite, but the lane still did not produce an output file before shutdown.
- Outcome: this reviewer lane is recorded as failed for Prompt 1.

## Merged findings

### AGG-001 — HIGH — Confirmed — Runtime map styles still violate the local-only contract and keep third-party CARTO dependencies alive
**Cross-agent agreement:** code-reviewer, security-reviewer, verifier, critic, architect, tracer, document-specialist  
**Primary locations:**
- `public/map-styles/{voyager,positron,dark,liberty,bright}.json:5-20`
- `scripts/fetch-map-styles.mjs:1-136`
- `scripts/smoke-static.mjs:104-127`
- `.context/project/01-overview.md:14`
- `.context/project/02-architecture.md:100-103`
- `src/app/layout.tsx:57-60`

**Why it matters:**
The repo docs and smoke gate say map assets are fully local, but the shipped style JSON still references remote CARTO tiles, sprites, and glyphs. This is simultaneously a privacy leak, a documentation mismatch, and the direct reason `npm run smoke:static` is red.

**Concrete failure scenario:**
A privacy-sensitive or offline user loads a route and the app still makes CARTO requests for map assets. CI/release verification also fails because the shipped build does not match the local-only contract.

**Suggested fix:**
Choose one contract and enforce it everywhere. The strongest fix is to ship truly local map styles with no external source/sprite/glyph dependency. If that is not the product direction, then docs/tests/CSP must be rewritten to match the remote-basemap reality.

**Confidence:** High

---

### AGG-002 — HIGH — Confirmed — Timeline default range mapping drops the final point of a loaded track
**Cross-agent agreement:** code-reviewer  
**Primary locations:**
- `src/components/TimelineSelector.tsx:107-138`
- `src/app/page.tsx:144-165`

**Why it matters:**
The end handle uses the lower-bound distance index even at `endRatio === 1`, so the default loaded range excludes the actual last point.

**Concrete failure scenario:**
A user loads a track and never touches the trim controls, but playback/export still ends one point early.

**Suggested fix:**
Make the end-handle mapping inclusive of the last point (e.g. explicit `ratio >= 1 -> lastIndex`, or upper-bound search for the end side) and add a regression test.

**Confidence:** High

---

### AGG-003 — HIGH — Confirmed — Google JSON intake is too expensive and too permissive for in-browser safety
**Cross-agent agreement:** security-reviewer, code-reviewer, critic, perf-reviewer, tracer  
**Primary locations:**
- `src/lib/parser.ts:317-545`
- `public/workers/trackParser.worker.js:200-267`
- `src/components/FileUpload.tsx:34-47`

**Why it matters:**
The app accepts JSON uploads up to 500MB, reads the full file as text on the main thread, then clones that full string into a worker. The JSON depth guard is only heuristic / sampled, and worker failures over 50MB reject instead of retrying the canonical parser path.

**Concrete failure scenario:**
A large Google export freezes or crashes the tab from memory pressure before parsing completes, or a deep-nesting payload bypasses the sampled depth scan and still reaches `JSON.parse()`.

**Suggested fix:**
- Reduce the practical JSON size cap to a browser-safe bound.
- Move JSON decode/parse off the main thread with transferable buffers.
- Replace sampled depth checks with a full scan.
- Align worker fallback behavior with the supported-file contract.

**Confidence:** High

---

### AGG-004 — HIGH — Confirmed — Export flow has correctness bugs around transition duration, save cancellation, and cancellation cleanup
**Cross-agent agreement:** architect, code-reviewer, debugger  
**Primary locations:**
- `src/lib/videoEncoder.ts:65-113,154-169`
- `src/lib/useExportController.ts:77-170`
- `src/components/ExportPanel.tsx:92-118,273-331`
- `src/components/MapView.tsx:783-787`
- `src/types.ts:109-116`

**Why it matters:**
The export path hardcodes scene transition duration instead of honoring the scene editor value, reports success even if the user cancels the native save dialog, and still waits on a non-abortable idle-cleanup path after export cancellation.

**Concrete failure scenario:**
- Preview and export disagree about scene blending.
- Canceling a save dialog still shows “saved” UI.
- Canceling an export appears hung because cleanup still waits for idle.

**Suggested fix:**
Thread transition duration through the export config, propagate save-dialog cancellation as a true cancellation, and make cleanup waits abort-aware or skip them on cancellation.

**Confidence:** High

---

### AGG-005 — MEDIUM — Confirmed — The static/exported CSP is internally inconsistent with the app’s heavy use of inline style attributes
**Cross-agent agreement:** designer, security-reviewer  
**Primary locations:**
- `src/app/layout.tsx:57-60`
- `scripts/harden-static-export.mjs:8-23`
- many component `style={{...}}` callsites, e.g. `src/components/GlobalToolbar.tsx`, `src/components/TrackToolbar.tsx`, `src/components/FileUpload.tsx`

**Why it matters:**
The exported app ships `style-src 'unsafe-inline'` together with `style-src-attr 'none'` while also emitting many inline style attributes. The designer review found actual missing active-state affordances and repeated CSP console violations at runtime.

**Concrete failure scenario:**
Selected controls lose their visual highlight in Chromium, and the console floods with CSP violations.

**Suggested fix:**
Either move the required inline styles into CSS classes/custom properties, or remove the contradictory `style-src-attr 'none'` directive so the shipped CSP matches the actual rendering model.

**Confidence:** High

---

### AGG-006 — MEDIUM — Confirmed — Static Playwright coverage is brittle and partly aimed at dev-only hooks
**Cross-agent agreement:** critic, verifier, test-engineer  
**Primary locations:**
- `e2e/travelback.spec.ts:42-66,561-692,734-757`
- `src/components/MapView.tsx:513-541`
- `playwright.static.config.ts:5-45`

**Why it matters:**
The static suite relies on `window.__travelbackDebug`, but `MapView` only exposes that hook in development. The suite also uses several fixed sleeps. Verifier runs also observed the static server disappearing mid-suite.

**Concrete failure scenario:**
The static E2E suite cannot reliably validate production behavior, or fails later in the run due to timing and server instability rather than product regressions.

**Suggested fix:**
Replace dev-only-hook assertions with production-safe DOM/state checks, remove hard sleeps, and harden the static test server lifecycle.

**Confidence:** High

---

### AGG-007 — MEDIUM — Confirmed — Playback/interpolation edge cases remain under-protected
**Cross-agent agreement:** code-reviewer, debugger  
**Primary locations:**
- `src/lib/interpolate.ts:55-129`
- `src/components/MapView.tsx:69-74,711-716`

**Why it matters:**
Zero-distance tracks can resolve to the wrong point, and antimeridian routes still use naive longitude-space calculations in `MapView` even though `camera.ts` already has better helpers.

**Concrete failure scenario:**
Repeated-coordinate tracks start from the wrong point, or dateline-crossing routes zoom/snap across the world instead of taking the short path.

**Suggested fix:**
Special-case zero-total-distance interpolation and reuse antimeridian-aware helpers for bounds and camera jump calculations.

**Confidence:** High

---

### AGG-008 — MEDIUM — Confirmed — Core docs and runtime behavior drift in several user-facing areas
**Cross-agent agreement:** document-specialist, critic  
**Primary locations:**
- `.context/project/01-overview.md:17-24,31-35,77-78`
- `package.json:8-9`
- `scripts/serve-static.mjs:24-80`
- `src/lib/parser.ts:190-303,370-402`
- `src/types.ts:80-84`

**Why it matters:**
The docs describe `npm run start` like a normal production server even though it serves `out/` statically with a `/travelback` base path. The Google JSON support matrix is incomplete, and the documented animation-duration range does not match export limits.

**Concrete failure scenario:**
Contributors follow incorrect run instructions, and users believe some valid Google export shapes or export durations are unsupported.

**Suggested fix:**
Update the overview docs to describe the static preview server accurately, expand the supported Google JSON matrix, and document the real playback vs export duration ranges.

**Confidence:** High

---

### AGG-009 — MEDIUM — Confirmed — Mobile/IA UX still has a few discoverability and accessibility gaps
**Cross-agent agreement:** designer  
**Primary locations:**
- `src/components/FileUpload.tsx:193-197`
- `src/components/TrackWorkspace.tsx:115-121`
- `src/components/FileUpload.tsx:111-123`
- `src/components/GlobalToolbar.tsx:23-26`
- `src/components/TrackToolbar.tsx:123-220`

**Why it matters:**
The landing page has no semantic `h1`, the loaded mobile workspace hides the current track name entirely, and common mobile actions/preferences collapse behind low-discoverability affordances.

**Concrete failure scenario:**
Mobile users lose orientation after loading a track and can miss file-switch / preference controls.

**Suggested fix:**
Add a proper `h1`, keep a compact mobile route title visible, and make key mobile actions/preferences more explicit.

**Confidence:** High

---

### AGG-010 — MEDIUM — Likely — Performance and maintainability hotspots are accumulating in core paths
**Cross-agent agreement:** architect, perf-reviewer, test-engineer  
**Primary locations:**
- `src/app/page.tsx:32-419`
- `src/lib/parser.ts` + `public/workers/trackParser.worker.js`
- `src/components/MapView.tsx:500-506,754-777`
- `src/lib/i18n.ts:11-1662`
- `e2e/travelback.spec.ts:1-975`

**Why it matters:**
The app shell still owns too much state, parser logic is duplicated across main thread and worker, live map rendering pays `preserveDrawingBuffer` cost at all times, the trail is rebuilt every frame, and key test/i18n files have become monoliths.

**Concrete failure scenario:**
Future fixes become harder to land safely, and performance degrades on large tracks or weaker devices.

**Suggested fix:**
Treat this as follow-up structural work after the blocking correctness/security fixes are handled.

**Confidence:** Medium-High

---

## Recommended implementation order
1. Fix the map-style contract so `npm run smoke:static` is green and the privacy/offline story is truthful.
2. Fix JSON import safety (size cap + non-main-thread handling + full depth scan + consistent fallback).
3. Fix export correctness bugs (transition duration, save cancellation, cleanup abort behavior, codec gating).
4. Fix timeline / interpolation edge cases.
5. Fix CSP/style mismatch and user-facing doc/runtime drift.
6. Harden the static E2E suite and cover the fixed edge cases.
