# Security Reviewer — Travelback (2026-05-09, Cycle 10)

## Scope
Security posture of all source files, build pipeline, Web Worker, input validation, and static export hardening.

## Findings

None. After reviewing all security-sensitive code paths, no new security issues were found.

## Analysis Details

### Content Security Policy (Static Export)
- `scripts/harden-static-export.mjs` replaces the dev CSP placeholder with SHA-256 hashes of all inline scripts.
- `script-src-attr 'none'` prevents event handler injection.
- `object-src 'none'` blocks plugin content.
- `base-uri 'none'` prevents base tag manipulation.
- `upgrade-insecure-requests` enforces HTTPS.
- Frame-ancestors is intentionally omitted from meta CSP (header-only per spec); anti-framing is handled via JS frame-buster and host-level headers.
- `smoke-static.mjs` asserts hardened CSP is present and placeholder CSP is absent.

### Input Validation (Worker)
- `trackParser.worker.js` validates message fields before processing: `ext` must be string and equal `'json'`, `buffer` must be `ArrayBuffer`, `byteLength` must not exceed 100MB.
- JSON depth preflight (`checkJsonDepth`) prevents RangeError from deeply nested JSON before `JSON.parse`.
- Coordinate bounds checking rejects latitudes outside [-90, 90] and longitudes outside [-180, 180].
- NaN and Infinity coordinates are filtered via `parseOptionalNumber`.

### Input Validation (Main Thread)
- `parser.ts` enforces file size limits: XML 4MB, JSON 100MB, general 200MB.
- XML DOCTYPE and ENTITY declarations are stripped before DOMParser to prevent XXE.
- File extension allowlist (`json`, `gpx`, `kml`) gates parsing path selection.
- `normalizeBasePath` in `env.ts` defends against path traversal in `NEXT_PUBLIC_BASE_PATH`.

### Output Safety
- All user-facing data is rendered through React JSX. No raw HTML insertion.
- Export filename sanitization in `videoEncoder.ts` strips path separators and control characters.
- `showSaveFilePicker` accepts only `suggestedName`, not arbitrary paths.

### Worker Isolation
- Worker runs in separate thread with no DOM access.
- Worker script loaded from same-origin `workers/trackParser.worker.js`.
- Error messages posted back to main thread contain only strings, not objects.

### Minor Inconsistencies (Non-Security)
- Worker `checkJsonDepth` scans full file without 10MB cap (performance, not security).
- Worker `WorkerParseError` lacks `name` property (diagnostic quality, not security).
- Mobile menu unit buttons lack `aria-label` (accessibility, not security).

## Verdict

No new security findings. The app has strong input validation, CSP hardening, worker isolation, and output sanitization. All security-relevant claims verified by the Verifier agent hold true.
