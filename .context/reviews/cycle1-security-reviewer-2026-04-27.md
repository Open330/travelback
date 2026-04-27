# Security Reviewer — Cycle 1 (2026-04-27)

Reviewer: security-reviewer
Repository: `/Users/hletrd/flash-shared/Travelback`
Scope: Full codebase including uncommitted changes, focus on input validation, CSP, XSS, privacy boundaries

## Findings

### SEC-01 — Worker script path construction uses `process.env` without path traversal rejection

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/parser.ts:613-614`, `src/lib/env.ts`
- **Detail:** The worker URL is constructed as `${basePath}/workers/trackParser.worker.js` where `basePath` comes from `normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH)`. While `normalizeBasePath` strips leading/trailing slashes, it does not reject path traversal (e.g., `NEXT_PUBLIC_BASE_PATH=../../malicious`). This is a build-time environment variable controlled by the deployer, so risk is limited to CI compromise. CSP `script-src 'self'` would also block cross-origin loading.
- **Suggested fix:** Add path traversal check in `normalizeBasePath` that rejects values containing `..`. Defense-in-depth only.

### SEC-02 — `exportTooLarge` gate uses estimated memory, not real peak

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Files:** `src/components/ExportPanel.tsx:114`, `src/lib/videoEncoder.ts:85-87`
- **Detail:** If `estimateExportMemoryBytes` passes but actual encoding exceeds browser memory, the tab crashes with no graceful error. The 256MB cap is approximate. On mobile browsers with less available memory, the estimation may be too optimistic, especially for 4K exports where the canvas buffer, encoder buffer, and final MP4 buffer all coexist in memory.
- **Suggested fix:** Add more conservative estimation or wrap the export loop in a try/catch that catches OOM-style errors. Consider lowering the cap for mobile user agents.

### SEC-03 — ExportPanel `<a>` download link lacks `rel="noopener noreferrer"`

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/ExportPanel.tsx:267-274`
- **Detail:** The `<a>` tag for downloading the exported video uses a blob: URL. While blob: URLs are same-origin, adding `rel="noopener noreferrer"` is defense-in-depth.
- **Suggested fix:** Add `rel="noopener noreferrer"` to the download `<a>` tag.

### SEC-04 — Debug camera exposure is properly gated

- **Severity:** INFO
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:629-668`
- **Detail:** The `__travelbackDebug` window property is exposed only when: (1) localStorage has `travelback-debug=1`, (2) hostname is localhost/127.0.0.1, (3) `NODE_ENV === 'development'` OR local host + debug flag. This is appropriately gated and only exposes camera/map state, not user data.
- **Suggested fix:** No action needed.

### SEC-05 — Uncommitted `renderFrameAndWait` properly handles abort signals

- **Severity:** INFO
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:486-517` (uncommitted)
- **Detail:** The new `renderFrameAndWait` imperative handle correctly wires `signal.addEventListener('abort', ...)` and cleans up both the MapLibre `render` listener and the abort listener on completion. The `onAbort` handler rejects with `DOMException('Export cancelled', 'AbortError')`, which is caught by the export controller's error handler.
- **Suggested fix:** No action needed. Implementation is correct.

## Positive Notes

- CSP hardening is excellent: SHA-256 hashes replace `unsafe-inline` for scripts, `object-src 'none'`, `base-uri 'none'`
- Input validation is comprehensive: file size, point count, XML depth/tags, JSON depth, coordinate bounds
- `ParseError` uses machine-readable codes, not English message text
- Worker-based parsing with bounded fallback for memory safety
- Frame-buster in layout.tsx with correct omission of `frame-ancestors` from meta CSP
- Static smoke test verifies CSP is properly applied post-build
- Uncommitted bootstrap rewrite guard (`hasBootstrap && !replaced`) prevents silent CSP regression

## Summary

| Severity | Count |
|----------|-------|
| MEDIUM   | 1     |
| LOW      | 2     |
| INFO     | 2     |
| **Total** | **5** |

Verdict: Security posture is solid. No HIGH findings. The memory estimation for export is the main actionable item.
