# Prompt 1 aggregate review — cycle 2

Generated on 2026-04-19 after a review fan-out and a manual aggregation pass across the current per-agent outputs in `.context/reviews/`.

## Review lanes considered
- security-reviewer — **fresh cycle-2 output**
- perf-reviewer — **fresh cycle-2 output**
- designer — latest repo-local output reviewed for UX carry-forward
- code-reviewer / critic / verifier / test-engineer / architect / debugger / document-specialist / tracer — latest repo-local outputs reviewed for cross-checking and de-duplication where still relevant

## Aggregation method
- Preferred fresh cycle-2 review files where they existed.
- Deduped overlapping findings and kept the highest severity / confidence.
- Marked which findings are still current in the present repository state.
- Preserved older stale findings in provenance files but did **not** carry forward issues already fixed in `main`.

## AGENT FAILURES
Fresh retry lanes for `code-reviewer`, `critic`, `verifier`, `designer`, and `non-tech-traveler-reviewer` did not return a completion signal before timeout / shutdown. Existing repo-local review files were used for provenance where available. This aggregate therefore prioritizes the fresh `security-reviewer` and `perf-reviewer` outputs plus still-current UX items from the latest designer review.

## Merged findings

### C2-AGG-001 — HIGH — Confirmed — Closed export UI eagerly imports export code and probes codecs on the startup path
**Cross-agent agreement:** perf-reviewer
**Primary locations:**
- `src/app/page.tsx:406-417`
- `src/components/ExportPanel.tsx:53-111`
- `src/lib/videoEncoder.ts:155-177`

**Why it matters:**
`HomeInner` mounts `<ExportPanel />` even while the panel is closed. `ExportPanel` immediately runs codec-support probing, which imports export code before the user has asked to export anything.

**Concrete failure scenario:**
A first-time mobile visitor who only wants to upload a track still pays extra startup JS work and export-code initialization, hurting responsiveness on the landing route.

**Suggested fix:**
Lazy-mount `ExportPanel` only when opened, and keep codec probing behind the open state.

**Confidence:** High

---

### C2-AGG-002 — MEDIUM — Confirmed — Static anti-framing protection is incomplete because `frame-ancestors` is delivered only via meta CSP
**Cross-agent agreement:** security-reviewer
**Primary locations:**
- `src/app/layout.tsx:57-60`
- `scripts/harden-static-export.mjs:8-24,66-97`
- `scripts/serve-static.mjs:147-158`

**Why it matters:**
The static artifact relies on `<meta http-equiv="Content-Security-Policy">` for `frame-ancestors 'none'`, but anti-framing protections are only reliably enforced when delivered as response headers. The local preview server adds `X-Frame-Options`, but the exported app itself cannot guarantee that protection on generic static hosts.

**Concrete failure scenario:**
A plain static deployment can be embedded in an attacker-controlled iframe, undermining the app's privacy-first positioning.

**Suggested fix:**
Add a client-side anti-framing fallback in the bootstrap path and document that deployment hosts must still send `Content-Security-Policy: frame-ancestors 'none'` or `X-Frame-Options: DENY`.

**Confidence:** High

---

### C2-AGG-003 — MEDIUM — Confirmed — Internal OMX tool-state residue under `public/` can ship in static builds
**Cross-agent agreement:** security-reviewer, code-reviewer (asset inventory)
**Primary locations:**
- `public/fonts/.omc/state/last-tool-error.json:1-7`
- generated output path `out/fonts/.omc/state/last-tool-error.json`

**Why it matters:**
A hidden tooling artifact inside `public/` becomes part of the published static app. The current file leaks tool names, prompt-preview content, and timestamps; future residue could expose more sensitive internal metadata.

**Concrete failure scenario:**
A deployment unintentionally serves agent/tooling state files from the public asset tree.

**Suggested fix:**
Remove the stray `.omc` directory and add a build/smoke guard that rejects hidden tool-state directories inside `public/` or `out/`.

**Confidence:** High

---

### C2-AGG-004 — MEDIUM — Confirmed — Production debug inspection surface is still exposed whenever `navigator.webdriver` is true
**Cross-agent agreement:** security-reviewer, older critic review (same surface previously used for static E2E)
**Primary locations:**
- `src/components/MapView.tsx:529-565`
- `e2e/travelback.spec.ts:46-88,586-663,770-777`

**Why it matters:**
The app exposes `window.__travelbackDebug` in production-like builds whenever the browser reports automation. That keeps a stable global inspection surface alive outside development.

**Concrete failure scenario:**
Production sessions running under automation or instrumentation expose map and camera state through a predictable global object.

**Suggested fix:**
Remove the `navigator.webdriver` escape hatch and switch tests to an explicit opt-in debug flag (for example a query param checked only by tests).

**Confidence:** High

---

### C2-AGG-005 — MEDIUM — Confirmed — Mobile information architecture still hides key session identity and primary structure
**Cross-agent agreement:** designer
**Primary locations:**
- `src/components/FileUpload.tsx:193-197`
- `src/components/TrackWorkspace.tsx:115-121`
- `src/components/TrackToolbar.tsx:123-220`

**Why it matters:**
The landing page still lacks a semantic `h1`, and the loaded mobile workspace hides the current track name entirely below `lg`. Users lose page structure and trip identity exactly where orientation matters most.

**Concrete failure scenario:**
A mobile user loads a trip and sees controls but no visible trip name, making session switching and confirmation harder.

**Suggested fix:**
Add a semantic `h1` on the landing flow and preserve a compact visible track title on mobile after load.

**Confidence:** High

---

### C2-AGG-006 — HIGH — Confirmed — Export settings still allow browser-hostile combinations that can explode time and memory
**Cross-agent agreement:** perf-reviewer
**Primary locations:**
- `src/types.ts:52-79`
- `src/components/ExportPanel.tsx:84-119,298-312`
- `src/lib/videoEncoder.ts:52-91`

**Why it matters:**
The UI permits 4K, 120 FPS, and 10-minute exports, while the encoder buffers the entire MP4 in memory. The current product does not warn or block obviously unsafe combinations.

**Concrete failure scenario:**
A user starts a long 4K/high-FPS export and the tab stalls or crashes under memory pressure.

**Suggested fix:**
Add product safety caps / preflight validation for unsafe export combinations, or move away from all-in-memory output.

**Confidence:** High

---

### C2-AGG-007 — HIGH — Confirmed — Google phone-export `semanticSegments` currently lose real segment boundaries
**Cross-agent agreement:** fresh code-reviewer
**Primary locations:**
- `src/lib/parser.ts:267-303`
- `public/workers/trackParser.worker.js:99-123`

**Why it matters:**
Supported Google phone exports can contain multiple disconnected semantic segments, but the parser currently appends those points into one continuous route without recording segment boundaries.

**Concrete failure scenario:**
A walk → flight → visit export is rendered as one continuous line with impossible straight bridges between unrelated segments, corrupting distance, elevation, playback, and export behavior.

**Suggested fix:**
Track `segmentStartIndices` for `semanticSegments` in both the main-thread parser and the worker parser.

**Confidence:** High

---

### C2-AGG-008 — HIGH — Confirmed — Antimeridian routes interpolate and render through the wrong side of the world
**Cross-agent agreement:** fresh code-reviewer
**Primary locations:**
- `src/lib/interpolate.ts:112-118`
- `src/components/MapView.tsx:132-152`

**Why it matters:**
Interpolation and rendered route geometry currently use raw longitude deltas, so tracks near `+180/-180` go the long way around the globe instead of taking the wrapped shortest path.

**Concrete failure scenario:**
A trans-Pacific route crossing the dateline visibly jumps toward Greenwich during playback and renders a world-spanning trail/export line.

**Suggested fix:**
Use wrapped shortest-path longitude deltas for interpolation, bearing, and rendered route geometry.

**Confidence:** High

---

### C2-AGG-009 — MEDIUM — Confirmed — `<html lang>` never follows the selected locale
**Cross-agent agreement:** fresh code-reviewer
**Primary locations:**
- `src/app/layout.tsx:52`
- `src/app/page.tsx:33`
- `src/lib/i18n.ts:8`

**Why it matters:**
The app supports multiple locales, but the document root remains `lang=\"en\"` even after the user switches language, which hurts screen-reader pronunciation and language metadata.

**Concrete failure scenario:**
Switching the UI to Korean or Japanese leaves the document language stuck on English.

**Suggested fix:**
Update `document.documentElement.lang` whenever locale changes, and add a regression assertion in E2E if needed.

**Confidence:** High

---

## Recommended implementation order
1. Remove the shipped `.omc` residue and add a guard so it cannot come back.
2. Remove the webdriver-based production debug surface and switch E2E to an explicit opt-in test hook.
3. Lazy-mount the export panel so closed export UI no longer pulls export code into startup.
4. Fix the semantic-segment and antimeridian correctness bugs.
5. Add a client-side anti-framing fallback and document the required host-level headers.
6. Follow with UX and export-workload guardrail work in later cycles.
