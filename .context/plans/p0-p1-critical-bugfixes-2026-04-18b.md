# P0/P1 Critical Bugfixes — 2026-04-18b

**Priority:** P0-P1 — must fix before next release
**Source:** comprehensive-deep-code-review-2026-04-18b (P0-1, P0-2, P1-1, P1-2, P1-3, P1-5, P1-6, P1-9, P1-10, P1-11, P1-12, P1-13)
**Estimated effort:** 4-6 hours

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| P0-1 | Blob URL auto-revoke breaks video preview while user is watching it | P0 | useExportController.ts |
| P0-2 | Worker parseRecords diverges from main-thread — string lat/lng | P0 | trackParser.worker.js |
| P1-1 | Antimeridian crossing produces incorrect overview camera and route line | P1 | camera.ts |
| P1-2 | ExportPanel allows starting export with unsupported codec | P1 | ExportPanel.tsx |
| P1-3 | Toast auto-dismiss uses untracked setTimeout — fires after unmount | P1 | Toast.tsx |
| P1-5 | `downloadVideo` may silently fail on Safari | P1 | videoEncoder.ts |
| P1-6 | `handleShare` re-fetches blob URL — doubles memory for large videos | P1 | ExportPanel.tsx, useExportController.ts |
| P1-9 | SceneEditor `addScene` can create a scene with startPercent >= 1 | P1 | SceneEditor.tsx |
| P1-10 | ElevationProfile division by zero with single-point track | P1 | ElevationProfile.tsx |
| P1-11 | ExportPanel duration state not synced with playbackDuration prop | P1 | ExportPanel.tsx |
| P1-12 | Parser does not validate lat/lng are in valid geographic ranges | P1 | parser.ts, trackParser.worker.js |
| P1-13 | Google Location History parser does not produce segmentStartIndices | P1 | parser.ts |

---

## Implementation steps

### 1. Fix blob URL auto-revoke breaking video preview

**File:** `src/lib/useExportController.ts:62-69`

**Current:** A `useEffect` auto-revokes the blob URL after 60 seconds, but `exportedVideoUrl` state remains non-null pointing to a dead URL. The video preview silently breaks.

**Fix:** Remove the auto-revoke timer entirely. The existing cleanup paths already handle revocation:
- `resetExportSession` calls `revokeExportedVideoUrl`
- Unmount effect revokes via `exportedVideoUrlRef`

```ts
// DELETE the entire useEffect block at lines 62-69
// The existing cleanup is sufficient and does not break the preview
```

**Verification:** Export a video. Wait >60 seconds. Confirm the video preview still plays. Click "Export Again" and confirm the old URL is revoked.

---

### 2. Fix worker parseRecords divergence — add parseOptionalNumber for lat/lng

**File:** `public/workers/trackParser.worker.js:37-49`

**Current:** Worker uses raw `loc.latitude ?? ...` without `parseOptionalNumber()`, while main thread applies it. String lat/lng values pass through silently.

**Fix:** Add `parseOptionalNumber` calls in the worker's `parseRecords`:

```js
const lat = parseOptionalNumber(loc.latitude) ?? (loc.latitudeE7 != null ? e7(loc.latitudeE7) : undefined)
const lng = parseOptionalNumber(loc.longitude) ?? (loc.longitudeE7 != null ? e7(loc.longitudeE7) : undefined)
```

`parseOptionalNumber` already exists in the worker (used for other fields). Just apply it to `latitude`/`longitude` as well.

**Verification:** Create a test Google JSON file with `"latitude": "37.5665"` (string). Parse via worker. Confirm lat is number 37.5665, not string.

---

### 3. Fix antimeridian crossing in trackCenter and estimateOverviewZoom

**File:** `src/lib/camera.ts:46-78`

**Current:** Direct min/max longitude averaging produces wrong center for Pacific-crossing routes (e.g., Japan→Alaska centers on Africa).

**Fix:** Detect antimeridian crossing (span > 180°) and shift longitudes:

```ts
export function trackCenter(points: TrackPoint[]): [number, number] {
  if (points.length === 0) return [0, 20]
  let minLat = Infinity, maxLat = -Infinity
  let minLng = Infinity, maxLng = -Infinity
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
  }
  const latCenter = (minLat + maxLat) / 2
  // If longitudinal span > 180°, assume antimeridian crossing
  if (maxLng - minLng > 180) {
    let minShifted = Infinity, maxShifted = -Infinity
    for (const p of points) {
      const shifted = ((p.lng + 180) % 360 + 360) % 360
      if (shifted < minShifted) minShifted = shifted
      if (shifted > maxShifted) maxShifted = shifted
    }
    const centerShifted = (minShifted + maxShifted) / 2
    return [((centerShifted + 180) % 360) - 180, latCenter]
  }
  return [(minLng + maxLng) / 2, latCenter]
}
```

Apply similar logic to `estimateOverviewZoom`.

**Verification:** Create a test track with points from Tokyo (lng=140) to Anchorage (lng=-150). Confirm overview camera centers near the Pacific, not Africa.

---

### 4. Block export with unsupported codec

**File:** `src/components/ExportPanel.tsx:271-277`

**Current:** Export button is always clickable even if the selected codec is unsupported.

**Fix:** Add an early check in the export handler:

```ts
const handleExport = useCallback(() => {
  if (codecSupport && codecSupport[codec] === false) {
    addToast(`${CODEC_LABELS[codec]} is not supported in this browser`, 'error')
    return
  }
  // ... rest of export logic
}, [codec, codecSupport, addToast, /* ... */])
```

Also disable the Export button visually when `codecSupport[codec] === false`:

```tsx
<button disabled={codecSupport ? codecSupport[codec] === false : false} ...>
```

**Verification:** In a browser without AV1 encoding support, select AV1 codec. Confirm Export button is disabled. If somehow triggered, confirm an error toast appears immediately.

---

### 5. Fix Toast untracked inner setTimeout

**File:** `src/components/Toast.tsx:22-28`

**Current:** After 5s, `setVisible(false)` then `setTimeout(onDismiss, 300)` — the inner 300ms timer is not cleared on unmount.

**Fix:**

```ts
useEffect(() => {
  requestAnimationFrame(() => setVisible(true))
  let dismissTimer: ReturnType<typeof setTimeout> | null = null
  const timer = setTimeout(() => {
    setVisible(false)
    dismissTimer = setTimeout(onDismiss, 300)
  }, 5000)
  return () => {
    clearTimeout(timer)
    if (dismissTimer != null) clearTimeout(dismissTimer)
  }
}, [onDismiss])
```

**Verification:** Rapidly trigger and dismiss toasts. Confirm no React warnings about state updates on unmounted components.

---

### 6. Fix Safari downloadVideo silent failure

**File:** `src/lib/videoEncoder.ts:149-154`

**Current:** Programmatic `<a>.click()` may be silently blocked in Safari. Also leaks the DOM node.

**Fix:** Append to body, click, then remove. Also add a Safari detection hint:

```ts
export function downloadVideo(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
```

In `useExportController.ts`, after calling `downloadVideo`, show a Safari-specific hint if the download likely failed:

```ts
downloadVideo(exportedVideoUrl, result.filename)
// Safari may block programmatic downloads — hint user to use the video preview
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
if (isSafari) {
  addToast(t('export.safariDownloadHint') ?? 'If download did not start, right-click the video preview and choose Save As', 'info')
}
```

Add the `export.safariDownloadHint` key to all 5 locales in i18n.ts.

**Verification:** On Safari, complete an export. Confirm either the download starts, or a helpful toast appears with the Save As workaround.

---

### 7. Fix handleShare memory doubling

**File:** `src/components/ExportPanel.tsx:114-126`, `src/lib/useExportController.ts`

**Current:** `fetch(exportedVideoUrl)` creates a second copy of the video blob in memory.

**Fix:** Store the original Blob alongside the URL in useExportController:

```ts
// In useExportController
const [exportedVideoBlob, setExportedVideoBlob] = useState<Blob | null>(null)

// When export completes:
const blob = new Blob([result.buffer], { type: result.mimeType })
setExportedVideoBlob(blob)
setExportedVideoUrl(URL.createObjectURL(blob))

// Expose via return:
return { ..., exportedVideoBlob }
```

In ExportPanel, use the blob directly for sharing:

```ts
const file = exportedVideoBlob
  ? new File([exportedVideoBlob], 'travelback.mp4', { type: 'video/mp4' })
  : null
if (file && navigator.share) {
  await navigator.share({ files: [file], ... })
}
```

**Verification:** Export a 4K video. Monitor memory in DevTools during share. Confirm no memory spike from re-fetching the blob URL.

---

### 8. Fix addScene creating zero-length scene

**File:** `src/components/SceneEditor.tsx:225-238`

**Current:** When the last scene ends at 100%, `addScene` creates a scene with `startPercent === endPercent === 1.0`.

**Fix:**

```ts
const addScene = useCallback(() => {
  const last = scenes[scenes.length - 1]
  const start = last ? last.endPercent : 0
  if (start >= 1) return  // No room for another scene
  const end = Math.min(start + 0.15, 1)
  // ... create scene
}, [commitScenes, scenes, t])
```

**Verification:** Create scenes until the last one ends at 100%. Click add. Confirm nothing happens (no zero-length scene created).

---

### 9. Fix ElevationProfile single-point division by zero

**File:** `src/components/ElevationProfile.tsx:45-49`

**Current:** `i / (n - 1)` when n=1 produces `Infinity`.

**Fix:** Guard before computing the path:

```ts
if (elevations.length < 2) return { minEle: min, maxEle: max, pathD: '', areaD: '' }
```

This already exists after `hasElevation` check but needs to be inside the `useMemo` that computes `pathD`/`areaD`.

**Verification:** Load a track with a single point that has elevation. Confirm the component returns `null` (or renders a dot) instead of a broken SVG.

---

### 10. Fix ExportPanel duration stale state

**File:** `src/components/ExportPanel.tsx:57`

**Current:** `useState(playbackDuration ?? 30)` never syncs when the prop changes.

**Fix:**

```ts
useEffect(() => {
  if (playbackDuration != null) setDuration(playbackDuration)
}, [playbackDuration])
```

**Verification:** Set playback duration to 60s in Controls. Open Export panel. Confirm it shows 60s, not 30s.

---

### 11. Add lat/lng range validation in parser

**File:** `src/lib/parser.ts:96-109, 173-184`, `public/workers/trackParser.worker.js`

**Current:** Only `Number.isFinite` check — no geographic range validation. `lat=999` passes.

**Fix:** Add range check in all parsing paths:

```ts
// In parseGPX and extractPointsFromGeoJSON:
if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null

// In parseRecords (both main thread and worker):
if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
```

**Verification:** Create a GPX file with `lat="999"`. Confirm the invalid point is skipped. Confirm valid points are still included.

---

### 12. Add segmentStartIndices to Google Location History parser

**File:** `src/lib/parser.ts:349`

**Current:** Google parser returns no `segmentStartIndices`, joining disjoint trips into continuous lines.

**Fix:** Track segment boundaries when switching between `activitySegment`, `placeVisit`, and `timelineEdits`:

```ts
// In the timelineObjects parsing loop, before pushing points from a new segment type:
if (points.length > 0) {
  segmentStartIndices.push(points.length)
}
```

Include `segmentStartIndices` in the returned Track:

```ts
return { name: 'Google Location History', points, ...(segmentStartIndices.length > 0 ? { segmentStartIndices } : {}) }
```

**Verification:** Import a Google Location History file with both `activitySegment` and `placeVisit` entries from different cities. Confirm the route line breaks between segments instead of drawing a straight line across the map.

---

## Verification checklist

- [x] `npm run build` succeeds
- [ ] `npm run test:e2e:static:ci` passes
- [x] Video preview remains functional after 60s (P0-1)
- [x] Worker parses string lat/lng as numbers (P0-2)
- [x] Pacific-crossing route overview centers correctly (P1-1)
- [x] Export blocked with unsupported codec (P1-2)
- [x] No React warnings from Toast unmount (P1-3)
- [x] Safari download works or shows hint (P1-5)
- [x] Share does not double memory (P1-6)
- [x] Cannot create zero-length scene (P1-9)
- [x] Single-point elevation renders gracefully (P1-10)
- [x] Export duration syncs with playback (P1-11)
- [x] Invalid lat/lng values rejected (P1-12)
- [x] Google parser produces segment breaks (P1-13)
