# Cycle 3 Comprehensive Deep Code Review — 2026-04-19

Performed against the current `main` branch after cycle 1 & 2 fixes.

## Review Angles Covered
- Code quality / logic / maintainability / SOLID
- Security (OWASP, secrets, unsafe patterns)
- Performance (startup, rendering, memory)
- UI/UX / accessibility / WCAG
- Correctness / edge cases
- Architecture / coupling
- Test coverage gaps
- Documentation-code mismatches
- Latent bugs / failure modes

## Prior-cycle finding verification

### Verified FIXED from prior cycles
| Prior ID | Description | Evidence |
|----------|-------------|----------|
| C2-AGG-001 | CSP blocks CARTO tiles | `layout.tsx:62` now includes `https://*.basemaps.cartocdn.com` in `connect-src` and `img-src` |
| C2-AGG-002 | Dead `public/theme-init.js` | File deleted; `ls` returns "DELETED" |
| C2-AGG-003 | `navigator.webdriver` debug surface | `grep` returns no matches in `src/` or `e2e/` |
| C2-AGG-004 | Sequential codec probing | `ExportPanel.tsx:106` now uses `Promise.all`; module-level `codecSupportCache` at line 30 |
| C2-AGG-005 | Single-point `buildFitBounds` | `MapView.tsx:196` adds `DEGENERATE_PADDING = 0.01` guard |
| C2-AGG-006 | Mobile menu ARIA | `TrackToolbar.tsx:137-143` uses `aria-label` + auto-focus first button via ref callback; no `role="menu"` |
| C2-AGG-007 | `<html lang>` SSR/client mismatch | Bootstrap script at `layout.tsx:49` now reads locale from localStorage and sets `d.lang=l` |
| Debug-1 | Export cancel waits on non-abortable cleanup | `useExportController.ts:169` now passes `abortController.signal` to `waitForIdle` in finally block |
| Debug-3 | Zero-distance interpolation | `interpolate.ts:84` has `(total ?? 0) <= 0` guard that returns first point |
| Sec-2 | `.omc` state artifact in `public/` | Directory deleted; `ls` returns "DELETED" |

### Verified STILL OPEN from prior reviews (not yet addressed)
These remain from the deferred list or were not scheduled in prior cycles:

| Prior ID | Description | Severity | Status |
|----------|-------------|----------|--------|
| C2R-005 | `--err-rgb` fallback is misleading in `page.tsx:325` | LOW | Open |
| C2R-008 | `parseSemanticSegments` misses inter-segment boundaries within `timelinePath` entries | MEDIUM | Open |
| C2R-010 | JourneyCreator search only accepts coordinates, not place names | LOW | Open |
| C2R-012 | Export settings permit dangerous workload combinations | MEDIUM | Open (deferred DF-C2-005) |
| CodeRev-1 | Google phone exports collapse segment boundaries (same as C2R-008) | HIGH | Open |
| CodeRev-2 | Antimeridian routes interpolate through wrong side of world | HIGH | Open |
| CodeRev-3 | Document language never follows selected locale (superseded by C2-AGG-007 fix) | MEDIUM | Fixed |
| Arch-1 | App shell is orchestration god object | MEDIUM | Deferred |
| Arch-2 | Export pipeline has split ownership; scene transition not honored in export | HIGH | Open |
| Arch-3 | Google history parsing duplicated in worker | MEDIUM | Deferred |
| Arch-4 | JourneyCreator crosses map ownership boundary | MEDIUM | Deferred |
| Arch-5 | Static-serving/privacy architecture inconsistent; smoke gate broken | MEDIUM | Open |
| Arch-6 | Localization and E2E test ownership are monolithic | MEDIUM | Deferred |
| Sec-1 | Clickjacking: meta CSP frame-ancestors not enforced | MEDIUM | Open (deferred) |
| Sec-4 | Inline styles in CSP weaken XSS containment | LOW | Deferred (DF-C2-009) |
| Perf-1 | Trail geometry rebuilt from scratch per progress tick | HIGH | Deferred (DF-C2-002) |
| Perf-2 | Playback progress drives whole-app rerenders | HIGH | Deferred (DF-C2-002) |
| Perf-3 | Large GPX/KML imports parse on main thread | HIGH | Deferred (DF-C2-003) |
| Perf-4 | Manual route dragging is O(n) on pointer move | MEDIUM | Deferred (DF-C2-004) |
| Perf-5 | Map always uses preserveDrawingBuffer: true | MEDIUM-HIGH | Open |
| Perf-6 | Export memory envelope too large | HIGH | Deferred (DF-C2-005) |
| Perf-7 | Large JSON import memory multiplier | HIGH | Deferred (DF-C2-006) |
| Critic-1 | Static build artifact not hermetic (.omc in out/) | HIGH | Open |
| Critic-2 | Typecheck is stateful due to .next/dev/types | MEDIUM | Open |
| Critic-3 | Export download claims success on <a> fallback | MEDIUM | Open |
| Tracer-1 | Shipped map styles still depend on remote sprite/glyph | HIGH | Open |
| Tracer-2 | Large JSON worker rejects instead of falling back | HIGH | Open |
| Tracer-3 | JSON depth guard can miss deep nesting | MEDIUM | Risk |
| Tracer-4 | Invalid scene ranges normalized before warning can fire | HIGH | Open |
| Designer-1 | Timeline selector is mouse/touch only (no keyboard) | HIGH | Open |
| Designer-2 | Map error shows raw WebGL dump to user | HIGH | Open |
| Designer-3 | Error messaging visual-only (no live regions) | MEDIUM | Open |
| Designer-4 | Landing preview image not eagerly loaded | MEDIUM | Open |
| UX-1 | Raw WebGL debug dump shown when map fails | CRITICAL | Open |
| UX-2 | Export defaults to landscape YouTube | MEDIUM | Open |
| UX-3 | Camera editing uses jargon | MEDIUM | Open |
| UX-4 | Mobile help/settings disappear after upload | MEDIUM | Open |
| UX-5 | Post-export copy assumes file management knowledge | MEDIUM | Open |
| Verifier-1 | Map styles are not fully local | HIGH | Open |
| Verifier-2 | Static Playwright suite loses web server mid-run | MEDIUM | Open |
| Doc-1 | "Fully local" claim is inaccurate | MEDIUM | Open |
| Doc-2 | `npm run start` is static server, not Next prod server | MEDIUM | Open |
| Doc-3 | Google JSON support under-documented | MEDIUM | Open |
| Doc-4 | Animation duration range docs don't match UI/export limits | MEDIUM | Open |
| Debug-2 | Export can start before codec support check finishes | HIGH | Open |
| Debug-4 | Theme toggle assumes modern MediaQueryList APIs | MEDIUM | Risk |
| Debug-5 | Timeline drag RAF not cancelled on unmount | MEDIUM | Likely |

---

## New findings from this cycle's deep review

### C3R-001 — HIGH — `parseSemanticSegments` does not push segment starts between consecutive `timelinePath` entries within a single segment

**Severity:** HIGH / Confidence: HIGH

**Primary location:**
- `src/lib/parser.ts:269-307`

**Why it matters:**
Each element in `semanticSegments` can have a `timelinePath` array AND a `visit` object. The current code only pushes a `segStarts` entry at the top of the loop (line 305: `if (out.length > preLen && preLen > 0) segStarts.push(preLen)`), which means between different `timelinePath` entries and `visit` entries WITHIN THE SAME SEGMENT, there are no segment breaks. This is the same issue flagged in C2R-008 but I am re-confirming it is still present and explaining more precisely.

More importantly: if a single `semanticSegments` entry has both a `timelinePath` (movement) and a `visit` (stationary), they are concatenated without a break, producing a straight line from the end of the path to the visit location.

**Concrete failure scenario:**
A Google phone export with segments like: `[{timelinePath: [point1, point2]}, {visit: {placeLocation: ...}}, {timelinePath: [point3, point4]}]` produces a continuous route where point2 is connected directly to the visit location, and the visit is connected directly to point3, rather than having segment breaks.

**Suggested fix:**
Add `segStarts.push(out.length)` between the `timelinePath` block and the `visit` block within the same segment, and also between consecutive segments (the current line 305 already handles between-segment breaks for segments that contributed points).

---

### C3R-002 — HIGH — Antimeridian interpolation in `interpolateAlongTrack` uses raw longitude delta instead of shortest-path delta

**Severity:** HIGH / Confidence: HIGH

**Primary location:**
- `src/lib/interpolate.ts:115` — `lng: normalizeLng(a.lng + shortestLngDelta(a.lng, b.lng) * t)`

**Why it matters:**
Wait — this line DOES use `shortestLngDelta`. Let me re-verify by tracing the code path carefully.

Actually, looking more carefully at `interpolate.ts:115`:
```ts
lng: normalizeLng(a.lng + shortestLngDelta(a.lng, b.lng) * t),
```
This correctly uses `shortestLngDelta` for interpolation. And `buildTrackGeometry` in `MapView.tsx:115-129` also uses `wrapLngNear` to handle antimeridian wrapping. So the prior code-reviewer finding about antimeridian interpolation may have been based on an older version or misread.

**Revised assessment:** The antimeridian interpolation in `interpolate.ts` is correct. The `buildTrackGeometry` in `MapView.tsx` also handles it correctly via `wrapLngNear`. The `buildFitBounds` in `MapView.tsx:186-189` handles antimeridian crossing bounds. And `camera.ts:112-117` uses shifted-longitude interpolation in `lerpCamera`.

**Status:** NOT CONFIRMED — the code appears to handle antimeridian correctly in all relevant paths. Downgrading from the prior review's HIGH to NOT AN ISSUE.

---

### C3R-003 — HIGH — Export can start with a codec whose support is still unknown (`null`)

**Severity:** HIGH / Confidence: HIGH

**Primary locations:**
- `src/components/ExportPanel.tsx:73` — `const codecReady = codecSupport[codec] === true`
- `src/components/ExportPanel.tsx:126` — `if (!codecReady) return`

**Why it matters:**
When `codecSupport[codec]` is `null` (support not yet probed), `codecReady` evaluates to `false`, so the export button is disabled. This is actually correct behavior — the button IS disabled while probing. However, there is a narrow race: if the user opens the panel, the probe starts, and the very first response comes back for `h264` (the default codec), the button immediately enables. But if the user has already changed the codec to `av1` before its probe completes, `codecSupport.av1` is still `null` and the button stays disabled.

Wait, re-reading: `codecReady = codecSupport[codec] === true`. If `codecSupport[codec]` is `null`, `codecReady` is `false`, so the button is disabled. This is correct.

However, the original `isCodecSupported` check could fail to resolve (e.g., mediabunny import throws), and the `catch` returns `false`. So `null` can only exist during the initial parallel probe. Once the probe completes, all codecs are either `true` or `false`. And the button is disabled while any codec is `null`.

**Revised assessment:** This is actually handled correctly. The button is disabled when `codecReady` is false, which includes the `null` case. The `handleExport` also checks `if (!codecReady) return`. The prior debugger finding #2 is already mitigated.

**Status:** NOT CONFIRMED — already handled by the `codecReady` guard.

---

### C3R-004 — MEDIUM — Scene editor normalization warnings are dead code

**Severity:** MEDIUM / Confidence: HIGH

**Primary locations:**
- `src/components/SceneEditor.tsx:201-213` — `commitScenes` runs `normalizeScenes` first, then checks for `startPercent >= endPercent`
- `src/lib/camera.ts:33-43` — `normalizeScenes` clamps, sorts, enforces monotonic ranges, filters zero-length scenes

**Why it matters:**
The tracer's finding #4 is confirmed. `commitScenes` calls `normalizeScenes(nextScenes)` which:
1. Clamps startPercent and endPercent to [0,1]
2. Sorts by startPercent
3. Enforces `startPercent >= previousEndPercent` (monotonic)
4. Enforces `endPercent >= startPercent`
5. Filters out scenes where `endPercent <= startPercent`

After normalization, it's impossible for any scene to have `startPercent >= endPercent`. The warning check at lines 206-210 can never fire. This means users who enter invalid ranges see their scenes silently disappear or get auto-corrected without any feedback.

**Concrete failure scenario:**
A user enters start=80% and end=20% for a scene. `normalizeScenes` either adjusts or removes it, but no warning is shown.

**Suggested fix:**
Run the validation check on the raw `nextScenes` BEFORE calling `normalizeScenes`, so invalid ranges can be surfaced to the user. Alternatively, keep scenes in a "draft" state and show inline warnings until the user corrects them.

---

### C3R-005 — MEDIUM — Worker fallback rejects large JSON instead of retrying with main-thread parser

**Severity:** MEDIUM / Confidence: HIGH

**Primary locations:**
- `src/lib/parser.ts:433-486` — `parseGoogleLocationHistoryInWorkerBuffer`
- `src/lib/parser.ts:479-482` — `worker.onerror` rejects outright

**Why it matters:**
The tracer's finding #2 is confirmed. When a worker error occurs (e.g., the worker crashes due to memory pressure on a large JSON file), `worker.onerror` at line 479-482 rejects the promise outright. There is no fallback to the main-thread parser for this error path.

The `worker.onmessage` error path (line 461-463) also rejects outright without trying the main thread.

The only fallback path is at lines 443-451 where worker CREATION fails — that correctly falls back to main-thread parsing.

**Concrete failure scenario:**
A 60MB Google JSON file is uploaded. The worker is created successfully, but crashes during parsing due to memory limits. The user gets "Failed to parse Google Location History" when the main-thread parser could have handled it (more slowly, but successfully).

**Suggested fix:**
In both `worker.onmessage` error path and `worker.onerror`, fall back to `parseGoogleLocationHistory(decodeJsonBuffer(buffer))` instead of rejecting outright. The main-thread parser is the same code; it just runs synchronously.

---

### C3R-006 — MEDIUM — `downloadVideo` `<a>` fallback always returns `true` even if the browser blocks the download

**Severity:** MEDIUM / Confidence: MEDIUM

**Primary locations:**
- `src/lib/videoEncoder.ts:173-181` — `<a>` download fallback
- `src/lib/useExportController.ts:146-149` — `downloadVideo` result used to determine success

**Why it matters:**
The critic's finding #3 is confirmed. The `<a>` download fallback at line 180 always returns `true`. If the browser blocks the download (e.g., popup blocker, download restriction policy), the app still tells the user the export succeeded. However, looking more closely at `useExportController.ts:146-149`:
```ts
const saved = await downloadVideo(videoUrl, result.filename, blob)
if (!saved) {
  throw new DOMException('Export cancelled', 'AbortError')
}
```
If `downloadVideo` returns `true` but the download was silently blocked, the user sees "Your video is in your Downloads folder" when it wasn't actually saved. This is a UX correctness issue, not a data-loss bug.

**Suggested fix:**
Change the fallback success copy from "saved to Downloads" to "download started" to avoid claiming a save that hasn't been confirmed.

---

### C3R-007 — MEDIUM — Static build artifact includes tool-state residue from `public/`

**Severity:** MEDIUM / Confidence: HIGH

**Primary locations:**
- `public/fonts/.omc/state/last-tool-error.json` — was deleted, but the pattern can recur
- `out/fonts/.omc/state/last-tool-error.json` — may still exist in built output
- `.github/workflows/deploy-pages.yml` — deployment pipeline

**Why it matters:**
The `.omc` directory under `public/fonts/` was deleted in cycle 2. However, there is no guard to prevent future tool-state artifacts from leaking into `public/` and thus into the static build. The critic's finding #1 identified that `npm run smoke:static` should catch this, but the pattern of hidden tool directories in `public/` can recur any time an OMC/OMX tool runs in the repo.

**Suggested fix:**
Add a guard in `scripts/smoke-static.mjs` (or `harden-static-export.mjs`) that scans `out/` for hidden directories like `.omc`, `.omx`, `.claude`, etc. and fails the build if found. Also add `.omc` and `.omx` to `.gitignore` if not already present.

---

### C3R-008 — MEDIUM — Map error message shows raw WebGL context error to non-technical users

**Severity:** MEDIUM / Confidence: HIGH

**Primary locations:**
- `src/components/MapView.tsx:928` — `t('app.mapLoadFailed').replace('{error}', mapError)`

**Why it matters:**
The non-tech traveler reviewer's finding #1 is confirmed. When MapLibre fails to initialize, the raw error message (containing WebGL context creation details like GPU vendor, renderer, etc.) is shown directly to the user. This is confusing for non-technical users and exposes internal browser/GPU information.

**Concrete failure scenario:**
A user on a device without WebGL support sees "Map failed to load: WebGL context creation failed: GPU: Apple M1, Renderer: Apple GPU..." — this looks like the app is broken and potentially leaking system info.

**Suggested fix:**
Show a user-friendly message ("Your browser couldn't start the map. Try refreshing or using a different browser.") and put the raw error behind a "Show technical details" disclosure.

---

### C3R-009 — MEDIUM — Timeline selector handles are not keyboard-accessible

**Severity:** MEDIUM / Confidence: HIGH

**Primary locations:**
- `src/components/TimelineSelector.tsx:317-375` — start and end handle divs have no `tabIndex`, no keyboard handlers, no ARIA slider semantics

**Why it matters:**
The designer's finding #1 is confirmed. The timeline handles are mouse/touch only. They have no `tabIndex`, no `role="slider"`, no `aria-valuenow/min/max`, and no arrow-key handlers. Keyboard-only users cannot adjust the time window.

**Suggested fix:**
Add `tabIndex={0}`, `role="slider"`, `aria-valuenow/min/max` attributes, and arrow-key/Home/End handlers to both handles. Add visible focus rings.

---

### C3R-010 — LOW — `--err-rgb` fallback in `page.tsx` is misleading but harmless

**Severity:** LOW / Confidence: HIGH

**Primary location:**
- `src/app/page.tsx:325` — `rgba(var(--err-rgb, 244,63,94),.7)`

**Why it matters:**
The CSS variable `--err-rgb` is always defined in `:root` via `vitro-base.css:30`. The fallback value `244,63,94` matches the definition. The fallback is technically harmless but misleading — it suggests the variable might not be defined when it always is.

**Suggested fix:**
Remove the fallback: `rgba(var(--err-rgb),.7)`. Or keep it with a comment explaining it's defensive.

---

### C3R-011 — MEDIUM — Error toast and file-upload errors lack live-region semantics

**Severity:** MEDIUM / Confidence: HIGH

**Primary locations:**
- `src/components/Toast.tsx:31-55` — toast container has no `aria-live` or `role="alert"`
- `src/components/FileUpload.tsx:249-250` — inline error text has no `role="alert"` or `aria-live`

**Why it matters:**
The designer's finding #3 is confirmed. Error messages in toasts and file-upload error states are visual-only. Screen readers will not announce them when they appear.

**Suggested fix:**
Add `aria-live="polite"` or `role="status"` to the toast container, and `role="alert"` to inline error messages.

---

### C3R-012 — LOW — Theme toggle `addListener`/`removeListener` fallback may cause issues

**Severity:** LOW / Confidence: MEDIUM

**Primary location:**
- `src/components/ThemeToggle.tsx:48-53` — falls back to deprecated `addListener`/`removeListener`

**Why it matters:**
The debugger's finding #4 flagged that the theme toggle assumes modern `MediaQueryList` APIs. However, looking at the current code at lines 48-53, the component already has a fallback:
```ts
if (typeof mql.addEventListener === 'function') {
  mql.addEventListener('change', handler)
  return () => mql.removeEventListener('change', handler)
}
mql.addListener(handler)
return () => mql.removeListener(handler)
```
This correctly falls back to `addListener`/`removeListener` when `addEventListener` is not available. The deprecated methods still work in all browsers that don't support `addEventListener` on `MediaQueryList`. The risk is minimal since these browsers are very old and the feature detection is correct.

**Revised assessment:** Already handled. The fallback exists and is correct.

**Status:** NOT A NEW ISSUE — already mitigated.

---

## Summary of active (non-deferred) findings by severity

| ID | Severity | Confidence | Category | Title | Status |
|----|----------|------------|----------|-------|--------|
| C3R-001 | HIGH | HIGH | Correctness | `parseSemanticSegments` misses inter-timelinePath segment boundaries | Open (same as C2R-008) |
| C3R-004 | MEDIUM | HIGH | Correctness/UX | Scene editor normalization warnings are dead code | Open (same as Tracer-4) |
| C3R-005 | MEDIUM | HIGH | Correctness | Worker fallback rejects instead of retrying main-thread parser | Open (same as Tracer-2) |
| C3R-006 | MEDIUM | MEDIUM | UX | Export download fallback claims success unconditionally | Open (same as Critic-3) |
| C3R-007 | MEDIUM | HIGH | Security/Build | No guard against future tool-state leakage into public/ | Open (derived from Critic-1) |
| C3R-008 | MEDIUM | HIGH | UX/Accessibility | Map error shows raw WebGL dump to users | Open (same as UX-1) |
| C3R-009 | MEDIUM | HIGH | Accessibility | Timeline handles not keyboard-accessible | Open (same as Designer-1) |
| C3R-010 | LOW | HIGH | Code clarity | `--err-rgb` fallback is misleading | Open (same as C2R-005) |
| C3R-011 | MEDIUM | HIGH | Accessibility | Error toast and file-upload errors lack live regions | Open (same as Designer-3) |

## Carried-forward deferred items (not re-opened this cycle)

These remain in `deferred-findings-cycle2-2026-04-19.md` and are NOT scheduled:
- DF-C2-001 through DF-C2-010: see deferred-findings doc for full list
- DF-C1-001 and DF-C1-002: see cycle 1 deferred findings

## Items verified as already fixed or not actual issues

| Prior ID | Description | Why closed |
|----------|-------------|------------|
| C2-AGG-001 through C2-AGG-007 | Cycle 2 active findings | All verified fixed in current code |
| Debug-1 | Export cancel non-abortable cleanup | `waitForIdle` now receives abort signal |
| Debug-3 | Zero-distance interpolation | Guard at `interpolate.ts:84` returns first point |
| Sec-2 | `.omc` artifact in public/ | Deleted |
| CodeRev-2 | Antimeridian interpolation | Code uses `shortestLngDelta` and `wrapLngNear` correctly |
| Debug-2 | Export starts before codec check | `codecReady === true` guard blocks button while null/false |
| Debug-4 | Theme toggle assumes modern APIs | Already has `addListener` fallback |
