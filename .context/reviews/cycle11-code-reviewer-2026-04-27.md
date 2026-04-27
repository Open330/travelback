# Cycle 11 Code Reviewer — 2026-04-27

## Inventory of reviewed files

- `src/lib/parser.ts` — full read
- `src/lib/parser.test.ts` — full read
- `src/lib/videoEncoder.ts` — full read
- `src/lib/useExportController.ts` — full read
- `src/lib/camera.ts` — full read
- `src/lib/interpolate.ts` — full read
- `src/lib/env.ts` — full read
- `src/lib/test-stub.ts` — full read
- `src/components/MapView.tsx` — full read
- `src/components/JourneyCreator.tsx` — full read
- `src/components/TimelineSelector.tsx` — full read
- `src/components/SceneEditor.tsx` — full read
- `src/components/ExportPanel.tsx` — full read
- `src/app/page.tsx` — full read
- `scripts/harden-static-export.mjs` — full read

## Findings

### C11-01 — DOCTYPE rejection tests fail due to stripXmlEntities running before preflightXml

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/parser.ts:155-165,188-198`, `src/lib/parser.test.ts:529-537,611-618`
- **Detail:** `parseXml()` calls `stripXmlEntities()` first, which removes `<!DOCTYPE...>` and `<!ENTITY...>` declarations from the text. Then `preflightXml()` checks for `<!DOCTYPE|<!ENTITY` in the *sanitized* text — which no longer contains them. As a result, DOCTYPE-bearing XML is silently accepted (entities stripped, document parsed) instead of being rejected. The test fixtures use `<!DOCTYPE>` without entity bracket closing (`]>`) so `stripXmlEntities` regex 1 (`/<!DOCTYPE[\s\S]*?\]>/gi`) doesn't match, but regex 2 (`/<!DOCTYPE[^>]*>/gi`) does match and strips it. After stripping, `preflightXml` sees clean text and passes. The tests expect `ParseError` but the code succeeds.
- **Failure scenario:** The XXE defense intent (reject DOCTYPE entirely) is subverted by the strip-then-check ordering. A DOCTYPE with an internal subset that includes entity declarations pointing to external resources would have those entities stripped silently, but the document is parsed — potentially with altered semantics.
- **Suggested fix:** Either: (a) swap the order — run `preflightXml` on the raw text first (before stripping) to enforce "no DOCTYPE allowed" policy, then strip for defense-in-depth; or (b) update the tests to reflect the current "strip and accept" behavior. Option (a) is preferred for security posture.

---

### C11-02 — `buildTrackGeometry` produces zero-length LineString segments for single-coordinate ranges

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:167-169`
- **Detail:** When a segment has exactly one coordinate, the code duplicates it: `segmentPoints.push([...segmentPoints[0]])`. This creates a `LineString` with two identical coordinates (zero-length). While MapLibre handles this without errors, it creates unnecessary geometry that contributes nothing visually and adds rendering overhead in aggregate.
- **Failure scenario:** On a track where every segment is a single point (e.g., semanticSegments with only visit entries), the MultiLineString contains N zero-length segments. This is wasteful but not visually broken.
- **Suggested fix:** Skip single-coordinate segments entirely (they have no line to draw). The marker point already shows the position.

---

### C11-03 — `JourneyCreator` search listbox ARIA over-engineered for always-0-or-1 results

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/JourneyCreator.tsx:557-590`
- **Detail:** The `handleSearchKeyDown` function implements full arrow-key navigation for a listbox that can only ever contain 0 or 1 result (since `parseCoordinateQuery` returns a single coordinate match). The `ArrowDown`/`ArrowUp`/`Home`/`End` key handlers cycle through a list that's at most 1 item.
- **Failure scenario:** Not a bug, but dead code paths that increase maintenance burden. Future expansion to multi-result search (e.g., geocoding API) would make this necessary, so this is a low-priority observation.
- **Suggested fix:** No action needed now. Document that search currently returns single results.

---

### C11-04 — `parseSemanticPoint` regex may reject valid `geo:` URIs with parameter semicolons

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/lib/parser.ts:372-380`
- **Detail:** The regex `(?:[;?].*)?\s*$` after the coordinate capture groups matches optional parameters. However, RFC 5870 `geo:` URIs use semicolons for parameters (e.g., `geo:37.4,-122.1;u=100`). The current regex matches this correctly because `[;?].*` starts with `;`. But if a parameter value contains a comma (e.g., `;crs=wgs84`), the earlier coordinate-capture group might not be affected since it's already closed. The regex appears correct for the spec but the `[;?]` could be simplified to just `;` since `?` query strings aren't part of the geo URI spec.
- **Failure scenario:** Extremely unlikely — no known geo URI format uses `?` as a parameter separator.
- **Suggested fix:** No action needed. Low risk.

---

### C11-05 — `flattenGoogleSegments` dedup does not account for near-duplicate timestamps

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/lib/parser.ts:455-457,488-496`
- **Detail:** The `pointKey` function deduplicates by exact `(lat.toFixed(7), lng.toFixed(7), time.getTime())`. Two observations at the same lat/lng but with timestamps 1ms apart produce different keys and both are kept. For Google Location History data (which can have sub-second precision), this could produce near-duplicate points that are visually indistinguishable but inflate point count.
- **Failure scenario:** A dense Google export with many observations at the same location (e.g., a parked car) could have hundreds of near-duplicate points differing only by sub-second timestamps. The dedup doesn't collapse these.
- **Suggested fix:** Consider rounding timestamps to the nearest second before computing the dedup key, or adding a minimum-time-gap dedup pass.
