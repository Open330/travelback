## Cycle r6 — Security reviewer

Source-side review against HEAD `0000000b72`.

### SR-1 (LOW, HIGH) — Meta-CSP still omits `frame-ancestors` by design (no regression)

`scripts/harden-static-export.mjs:8-13` narrates the omission. `scripts/smoke-static.mjs:104-109` asserts the absence. `csp-regression` checks stay green via cycle r3 / r4 / r5 layers. Layered anti-framing continues to rely on JS frame-buster + host-level header documented in `.context/project/02-architecture.md`. Verified unchanged.

No schedule.

### SR-2 (INFO, HIGH) — `connect-src 'self'` remains restrictive

`scripts/harden-static-export.mjs:24`. No external origins in the active CSP. Nominatim is out (SR-unchanged since cycle r2). If `connect-src` ever needs an addition, the harden script and smoke test are the two places to sync. Not an action item.

### SR-3 (LOW, HIGH) — Export path `exportTrack` reads WebGL canvas with `preserveDrawingBuffer: true`

`src/components/MapView.tsx:557`. The flag is documented in-source (L552-556) as required for `captureStream()`/`drawImage()` during export. No escalation possible through CSP; MSE/OffscreenCanvas and Blob URLs are `'self' blob:` gated. This remains the right posture for the export feature. No action.

### SR-4 (LOW, MEDIUM) — `JourneyCreator` coordinate parser accepts any `geo:` / `@` / raw `lat,lng` form, then clamps to ±90/±180

`src/components/JourneyCreator.tsx:75-111`. `Number.parseFloat` is used, which accepts trailing garbage (e.g. `"37.56, 126.98abc"` parses to `[37.56, 126.98]`). That is actually by-design for paste-from-URL. Ranges are clamped at L101. No SSRF surface because there is no external network call — the search button only plots local markers. Safe.

No schedule.

### SR-5 (INFO, HIGH) — `app/page.tsx` sample loader fetches `${basePath}/sample-trip.gpx`

`src/app/page.tsx:201-222`. Same-origin resource, `connect-src 'self'` permits it. Error path logs status without exposing secrets. Safe.

### SR-6 (INFO, HIGH) — `handleShare` in ExportPanel.tsx guards `navigator.share` + file + `canShare({files})`

`src/components/ExportPanel.tsx:139-164`. Safe; `AbortError` is explicitly caught on dismissal. No data leaks beyond the share dialog.

---

No new security findings. CSP hardening + local-only network posture intact.
