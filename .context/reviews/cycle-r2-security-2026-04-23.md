# Cycle 2 Security Review (2026-04-23, orchestrator run r2)

Scope: CSP, inline scripts, worker sandboxing, third-party network surface, file parsing attack surface, framing, storage, share API, OAuth / auth (none), export downloads.

## Threat model re-confirmation

The app is a client-side-only static export. No server-owned data path. The attack surface is:
1. **User-supplied files** parsed as GPX/KML/JSON (XML and JSON parsing).
2. **Inline bootstrap script** (theme/mapstyle/locale pre-hydration).
3. **File System Access API** usage for saving exported videos.
4. **LocalStorage** for preferences (no sensitive data).
5. **Web Worker** for parsing large JSON.
6. **Clipboard / location URL parsing** for journey creator coordinate paste.

## Findings

### R2-SEC-1 (info) — `parseXml` strips DTD/ENTITY nodes before parsing — XXE-safe.
- File: `src/lib/parser.ts:98-108`.
- Evidence: `stripXmlEntities` regex removes `<!DOCTYPE…>` and `<!ENTITY…>`; `DOMParser.parseFromString(..., 'application/xml')` does not resolve external entities in modern browsers by spec. Residual risk is **minimal**; the strip is a defense-in-depth measure.
- No change needed. **Positive finding.**

### R2-SEC-2 (info) — Bootstrap script CSP hash pinning is enforced in static export
- Files: `src/app/layout.tsx:49-63`, `scripts/harden-static-export.mjs:52-75`, `scripts/smoke-static.mjs:76-103`.
- Evidence: dev CSP allows `'unsafe-inline'` for Next bootstrap; the post-build script replaces it with `sha256-…` hashes; smoke tests assert no `'unsafe-inline'` in the static artifact and that hashes are present.
- No change needed. **Positive finding.**

### R2-SEC-3 (medium/high) — Bootstrap script's frame-breaker still relies on navigating `window.top.location`
- File: `src/app/layout.tsx:49` (`if(window.top!==window.self){try{window.top.location=window.self.location.href;return}catch{document.documentElement.style.display='none';window.location.replace('about:blank');return}}`).
- Evidence: Meta CSP `frame-ancestors 'none'` is in effect (layout.tsx:62 and harden-static-export.mjs:11). `.context/project/02-architecture.md:117-118` explicitly notes that "production deployments should still send host-level anti-framing headers (`frame-ancestors 'none'` and/or `X-Frame-Options: DENY`) because meta CSP alone is not sufficient for that control". The JS-based frame-break covers the gap. This is already documented.
- Remaining risk: the JS-based frame-break could race a malicious parent. If the parent serves the framed document via a same-origin iframe with `sandbox="allow-top-navigation"` deliberately denied, `window.top.location=…` throws and the fallback `document.documentElement.style.display='none'` + `window.location.replace('about:blank')` runs. That is acceptable. No action needed for the static export.
- **Positive finding** — the control is implemented as documented.

### R2-SEC-4 (low/medium) — `downloadVideo` uses dynamic `window as unknown as {...}` cast for showSaveFilePicker
- File: `src/lib/videoEncoder.ts:174-182`.
- Evidence: the cast-through-unknown pattern is TypeScript-correct for the experimental File System Access API, but it dismisses the question of input validation on `suggestedName`. The filename comes from `track.name` sanitized at `src/lib/videoEncoder.ts:147-153`. Sanitization removes `<>:"/\|?*` and control chars, normalizes NFKC, trims to 64 chars, defaults to 'Journey'. Looks adequate. Previous review carried this as DF-C17-014 (type-safety only).
- No new issue. **Positive finding.**

### R2-SEC-5 (info) — Journey creator coordinate parser is local-only
- File: `src/components/JourneyCreator.tsx:75-111` (`parseCoordinateQuery`).
- Evidence: runs only regex patterns on the string; does NOT fetch any remote geocoder. `assertStaticCspWasHardened` even checks that `nominatim.openstreetmap.org` is absent from CSP (scripts/smoke-static.mjs:100-102).
- **Positive finding.**

### R2-SEC-6 (low) — Worker message contract is explicit and validated
- File: `public/workers/trackParser.worker.js:247-279`.
- Evidence: `self.onmessage` checks `typeof data !== 'object'`, `data.ext !== 'json'`, `data.buffer instanceof ArrayBuffer`, and a 100 MB byte-length ceiling. Errors include a machine-readable `code`. Good defense against accidental malformed posts.
- **Positive finding.**

### R2-SEC-7 (low) — CSP includes `'unsafe-inline'` for `style-src` in both dev and hardened outputs
- Files: `src/app/layout.tsx:62`, `scripts/harden-static-export.mjs:16`.
- Evidence: `style-src 'self' 'unsafe-inline'`. The codebase uses extensive `style={{ ... }}` inline props (Tailwind escape hatches). Removing `'unsafe-inline'` would require moving every inline style to CSS classes or per-element nonces/hashes (practically infeasible for React inline `style={}` which emits inline `style="..."` attributes).
- Trade-off: `'unsafe-inline'` on styles is accepted by current browser recommendations when combined with `script-src-attr 'none'` (already set) and strong script-src hashing. This is the industry norm for React apps that need dynamic inline styles.
- No change needed. **Trade-off acknowledged.**

### R2-SEC-8 (info) — `<meta name="referrer" content="no-referrer" />` is set in layout
- File: `src/app/layout.tsx:69`.
- No leakage to third-party origins. **Positive finding.**

## Net assessment
Security posture remains **strong**: zero remote network surface for normal map display, CSP hashes enforced, XXE stripping, worker payload validation, framing refused at bootstrap, exported videos sanitized, no secrets, no OAuth, no backend. No security findings that require scheduling this cycle.

## Things checked and clean
- No use of `eval`, `Function` constructor, or `new Function()` anywhere in `src/`.
- No `document.write`.
- No user-supplied URL in `img.src`, `a.href` via interpolation.
- No `innerHTML` with user data (only `dangerouslySetInnerHTML` for the compile-time-known bootstrap script).
- No `Object.assign(window, ...)`.
- External links use `rel="noopener noreferrer"` (`src/components/GoogleGuide.tsx:370`).
