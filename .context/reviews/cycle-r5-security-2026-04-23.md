# Cycle r5 — security-reviewer (2026-04-23)

## Scope

Source review of CSP posture, XXE/JSON depth guards, URL handling, third-party connect-src exposure, `dangerouslySetInnerHTML`, `eval`, dynamic imports, and injected script hashes after cycle-r4 changes.

## Findings

### SEC-1 (INFO, HIGH) — CSP posture after cycle-r4 drop of `frame-ancestors` remains correct

- **Files**: `src/app/layout.tsx:60-62`, `scripts/harden-static-export.mjs:8-29`, `scripts/smoke-static.mjs:104-109`.
- **Evidence**: dev meta CSP no longer advertises `frame-ancestors`; hardened CSP matches. Smoke test asserts `frame-ancestors` is absent. Anti-framing is delegated to (1) the JS frame-buster at `layout.tsx:49` and (2) host-header `frame-ancestors 'none'` per `.context/project/02-architecture.md:117-118`. No regressions.
- **Schedule**: no action.

### SEC-2 (LOW, MEDIUM) — Cycle-r3/r4 carryover: Nominatim CSP exemption

- **Files**: `src/components/JourneyCreator.tsx` (search path now local-only, see `parseCoordinateQuery`), `src/app/layout.tsx:62`.
- **Evidence**: current search implementation is local-only (accepts pasted coordinates, parses `geo:`, `@lat,lng`, `#map=z/lat/lng`, etc.). No actual Nominatim calls in source. If a future change reintroduces Nominatim, a connect-src exemption will be needed at host-header layer per `.context/project/02-architecture.md`.
- **Schedule**: DEFER (R4-AGG-D9 carryover; status unchanged).

### SEC-3 (INFO, HIGH) — `stripXmlEntities` defends against XXE via `<!DOCTYPE>` and `<!ENTITY>` strip

- **Files**: `src/lib/parser.ts:98-108`.
- **Evidence**: `DOMParser` used with `application/xml`. XXE is generally not exploitable in browser `DOMParser` because it does not resolve external entities. The belt-and-suspenders strip further hardens. No action.

### SEC-4 (INFO, HIGH) — `JSON_DEPTH_EXCEEDED` guard prevents algorithmic DoS

- **Files**: `src/lib/parser.ts:325-344`.
- **Evidence**: correct. The guard runs before `JSON.parse` so adversarial nesting is rejected at a known limit (64). No action.

### SEC-5 (LOW, MEDIUM) — `FileUpload` error paths log raw `Error.message` to console on `!isSafe`

- **Files**: `src/components/FileUpload.tsx:79`.
- **Evidence**: `console.error('[Travelback] Parse error:', err instanceof Error ? err.message : 'Unknown error')`. The parser only emits its own code-bearing messages (e.g., "Invalid GPX: XML parse error") or generic strings — no user data leaks. The guard is correct: `isSafe` already matches the known code set, so `console.error` only fires on truly unknown errors. No action.
- **Schedule**: no action.

### SEC-6 (INFO, HIGH) — `dangerouslySetInnerHTML` use is bounded to the bootstrap script

- **Files**: `src/app/layout.tsx:54`.
- **Evidence**: only location of `dangerouslySetInnerHTML`; the content is a known-static string under `harden-static-export.mjs` control (hashed by the build). No untrusted input flows through. No action.

### SEC-7 (INFO, HIGH) — No `eval`, no `new Function`, no `innerHTML` with user data

- **Files**: (repo-wide search).
- **Evidence**: only instances of `innerHTML` are inside `svg[aria-label="Elevation profile"]` readback in the e2e test for NaN-check assertion (benign). No dynamic code in source.
- **Schedule**: no action.

## Confidence summary

No new security findings this cycle. Cycle-r4 deferred items (SEC-2 / R4-AGG-D9) unchanged.
