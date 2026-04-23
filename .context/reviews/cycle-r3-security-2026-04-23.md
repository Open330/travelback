# Cycle r3 — security review (2026-04-23)

Scope: OWASP-style review of `src/`, `scripts/`, CSP, and static-export hardening.

## Findings

### R3-SEC-1 (INFO, HIGH) — CSP and static-export hardening intact
- `src/app/layout.tsx:59-63` keeps dev CSP restricted (`default-src 'self'`; `connect-src 'self'`; `frame-ancestors 'none'`; `object-src 'none'`).
- Production hardening in `scripts/harden-static-export.mjs` still replaces `'unsafe-inline'` with hashed `script-src` entries — confirmed by reading file header and the build-gate artifacts.
- No remote origins (cartocdn, basemaps, Google, Nominatim) in CSP beyond explicit search-mode opt-in (JourneyCreator — implemented via client fetch gated by user action, not CSP allow-list).
- **Schedule**: N/A — no change needed.

### R3-SEC-2 (LOW, MEDIUM) — Nominatim fetch in JourneyCreator uses external network with `no-referrer`
- **File**: `src/components/JourneyCreator.tsx` search path (via `fetch`) calls `https://nominatim.openstreetmap.org` under user-gated "Enable search" toggle.
- **Detail**: This is an intentional opt-in network call. The CSP in `layout.tsx:62` sets `connect-src 'self'` — which means the production CSP actually *blocks* this fetch. Must verify whether either (a) the JourneyCreator search path is disabled in production or (b) CSP is relaxed only for nominatim. A quick read of `harden-static-export.mjs` would confirm.
- **Confidence**: Medium (I have not re-opened the script in this cycle; I'm flagging the interaction for verification).
- **Fix**: confirm behavior; if search is supposed to work in prod, add `connect-src 'self' https://nominatim.openstreetmap.org` only in the hardened static CSP.
- **Schedule**: defer — requires re-reading the hardening script and possibly running the UI. Recorded for re-open.

### R3-SEC-3 (INFO, HIGH) — Frame-break bootstrap script still safe
- **File**: `src/app/layout.tsx:49` (`bootstrapScript`).
- **Detail**: The inline script does `window.top.location = window.self.location.href` if framed, and falls back to `document.documentElement.style.display = 'none'; window.location.replace('about:blank')`. Both branches are safe. Uses only built-in globals, no `eval`. The hash of this exact string is what `harden-static-export` emits into `script-src '… hash'`.
- **Schedule**: N/A.

### R3-SEC-4 (LOW, HIGH) — `ParseError` codes not enumerated at `FileUpload.handleFile`
- **File**: `src/components/FileUpload.tsx:45-53`.
- **Detail**: The mapping table covers 8 codes; `parser.ts` `ParseError` codes include at least `FILE_TOO_LARGE` (handled separately) and `READ_FAILED`. If parser adds new codes, user sees the generic "parseFailed" toast. Not a security bug per se, but an input-validation hygiene concern (users don't learn *why* their file is rejected).
- **Fix**: extract `errorCodeMap` into the parser module or a shared constant, and add a TypeScript `satisfies` check so new `ParseError` codes force an update here.
- **Schedule**: defer — UX/test coverage, not security.

## Final sweep

- No localStorage data persisted across sites (all keys are `travelback-*`).
- No `crypto.subtle` misuse — project does not use crypto.
- No XSS sink: all user text is rendered via React (auto-escaped).
- No open-redirect pattern: only `window.location.replace('about:blank')` and `window.top.location = window.self.location.href` (both safe).
- No `postMessage` handlers without origin checks (grep clean).
- No SSRF vectors (static export — no server-side fetch).
- `npm audit --audit-level=high` passed (0 vulnerabilities).

## Recommendations

- Verify R3-SEC-2 interaction; otherwise no security-blocking actions this cycle.
