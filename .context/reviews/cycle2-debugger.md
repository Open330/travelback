# Debugger — Cycle 2 (2026-04-23)

## Verified Cycle 1 Fixes

All correctness fixes from cycle 1 confirmed applied. The parser.ts segment filter issue is the only remaining correctness bug found.

## New Findings

### N1. Parser segment remap filter drops index 0 — latent segment boundary loss
- **Severity**: Medium | **Confidence**: High
- **File**: `src/lib/parser.ts:424`
- **Issue**: Same root cause as fixed F3 in page.tsx. The `.filter(idx => idx > 0)` removes valid segment starts that remap to index 0 after dedup+sort. This can cause two distinct activity segments (e.g., a walk followed by a drive) to be merged into a single connected line in the output track.
- **Failure mode**: Load a Google Location History JSON with multiple semantic segments where dedup removes enough early points that a segment start remaps to index 0. The resulting track loses the segment boundary, creating an incorrect straight line between geographically distant points.

### N2. ExportPanel video preview src uses blob URL without cleanup timing guarantee
- **Severity**: Low | **Confidence**: Medium
- **File**: `src/components/ExportPanel.tsx:221`
- **Issue**: The `<video>` element uses `exportedVideoUrl` (a blob URL) as its `src`. The URL is revoked in `revokeExportedVideoUrl()` when a new export starts or is reset. However, if the component unmounts while the video is playing (e.g., user closes panel and opens a new file), the blob URL cleanup in the parent's useEffect will revoke the URL. The video element may still be holding a reference, but since the component is unmounted, this is benign. The real concern is that the blob URL persists in memory until explicitly revoked — if many exports are done without reset, the old blobs accumulate.
- **Fix**: This is already handled by the existing `revokeExportedVideoUrl` logic. No additional fix needed; informational only.
