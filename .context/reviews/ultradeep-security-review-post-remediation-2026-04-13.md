# Ultradeep Security Review — Post-Remediation (2026-04-13)

**Reviewer:** Codex  
**Scope:** current repository state after the security/remediation work on `main`  
**Recommendation:** **COMMENT** — security posture is materially improved, but a few residual/privacy issues remain.

## Scope and method

This was a fresh repo-wide security/privacy pass over the current repository state.

### Coverage
Reviewed:
- runtime code in `src/`
- dependency manifests / current advisory status
- deploy/browser hardening config
- docs and user-facing privacy claims
- third-party request paths and abuse surfaces

### Verification used in this pass
- `npm audit --json` ✅ 0 vulnerabilities
- current verification baseline already present:
  - `npm run lint` ✅
  - `npm run typecheck` ✅
  - `npm run build` ✅
  - `npm run smoke:static` ✅
  - `npx playwright test -c playwright.static.config.ts --reporter=line` ✅ 34 passed

---

## Overall assessment

Security is **better than in the previous pass**:
- known dependency vulnerabilities are cleared,
- deploy CI now audits,
- CSP is stronger,
- and the privacy/trust-boundary docs are more honest than before.

What remains are mostly **residual browser/privacy risks** rather than severe exploitable vulnerabilities.

---

## Findings summary

| ID | Severity | Classification | Title |
|---|---|---|---|
| SEC-POST-1 | Medium | Confirmed | Journey Creator still attempts to set a browser-forbidden `User-Agent` header |
| SEC-POST-2 | Medium | Confirmed | Place search sends partial free-form queries to a third party on every 1-second pause |
| SEC-POST-3 | Medium | Confirmed | CSP still relies on `unsafe-inline`, so XSS containment remains limited |
| SEC-POST-4 | Low | Confirmed | README privacy messaging still contains a stronger marketing claim than the detailed privacy section below it |
| SEC-POST-5 | Low | Risk needing manual validation | Remote basemap/style assets remain mutable third-party runtime inputs |

---

## Detailed findings

### SEC-POST-1 — Journey Creator still attempts to set a browser-forbidden `User-Agent` header
- **Severity:** Medium
- **Classification:** Confirmed
- **Files / regions:**
  - `src/components/JourneyCreator.tsx:352-356`
- **Why this is a problem:**
  - The code tries to identify itself to Nominatim via a custom `User-Agent` header.
  - In browsers, `User-Agent` is a forbidden request header and the app cannot rely on setting it explicitly.
  - So the code gives a false sense that the request is application-identified in a controlled way.
- **Concrete failure scenario:**
  - The app is deployed in a context where the default browser headers/referer are not sufficient for Nominatim policy expectations.
  - Search starts getting throttled or blocked, and the team incorrectly assumes the custom header should have covered identification.
- **Suggested fix:**
  - Remove the dead/forbidden header-setting attempt.
  - Rely on documented browser-visible identification (referer/site policy), or proxy/search through an explicitly controlled endpoint if identification guarantees are required.
- **Confidence:** High

### SEC-POST-2 — Place search sends partial free-form queries to a third party on every 1-second pause
- **Severity:** Medium
- **Classification:** Confirmed
- **Files / regions:**
  - `src/components/JourneyCreator.tsx:340-358`
- **Why this is a problem:**
  - Search is triggered automatically after a 1-second debounce.
  - There is no minimum query length and no explicit submit action.
  - That means partial address/place strings are sent to Nominatim as the user types.
- **Concrete failure scenario:**
  - A user starts typing a home/work address or sensitive place name slowly.
  - Multiple partial queries are transmitted to a third party before the final intended search is complete.
- **Suggested fix:**
  - Require a minimum query length (for example 3+ characters).
  - Consider explicit submit instead of auto-search for privacy-sensitive mode, or at least add a clearer disclosure next to the field.
- **Confidence:** High

### SEC-POST-3 — CSP still relies on `unsafe-inline`, so XSS containment remains limited
- **Severity:** Medium
- **Classification:** Confirmed
- **Files / regions:**
  - `src/app/layout.tsx:49-55`
  - explanatory note: `.context/project/02-architecture.md:103-106`
- **Why this is a problem:**
  - The CSP is stronger now, but it still includes `script-src 'unsafe-inline'`.
  - That leaves browser-side script injection containment weaker than a nonce/hash-based CSP.
- **Concrete failure scenario:**
  - A future rendering bug or unexpected HTML/script sink is introduced elsewhere in the app.
  - The CSP provides less containment than a stricter script policy would.
- **Suggested fix:**
  - Keep this as an explicit residual-risk item until the app can move to nonce/hash-based inline script handling, if feasible with the static Next export.
- **Confidence:** High

### SEC-POST-4 — README privacy messaging still contains a stronger marketing claim than the detailed privacy section below it
- **Severity:** Low
- **Classification:** Confirmed
- **Files / regions:**
  - detailed privacy section: `README.md:208-215`
  - stronger marketing claim remains: `README.md:230-231`
- **Why this is a problem:**
  - The README now correctly explains third-party map/search traffic.
  - But the closing tagline still says: “Everything runs in your browser — no server, no uploads.”
  - That is stronger and more absolute than the nuanced privacy explanation above it.
- **Concrete failure scenario:**
  - A privacy-sensitive reader scans the bottom tagline or page summary and misses the detailed section.
  - They walk away with an over-simplified understanding of the actual network/privacy model.
- **Suggested fix:**
  - Soften the closing line to match the documented trust boundary, e.g. emphasize “local file processing” instead of implying zero meaningful outbound traffic.
- **Confidence:** High

### SEC-POST-5 — Remote basemap/style assets remain mutable third-party runtime inputs
- **Severity:** Low
- **Classification:** Risk needing manual validation
- **Files / regions:**
  - `src/types.ts:15-35`
  - `src/components/MapView.tsx:370-376`
- **Why this is a problem:**
  - Runtime map styles still come from third-party endpoints.
  - This is now documented, but it remains a live trust boundary.
- **Concrete failure scenario:**
  - A provider changes a style definition or linked asset behavior in a way that breaks the map or changes runtime requests without any repo change.
- **Suggested fix:**
  - If stronger supply-chain control is needed, self-host or pin the style/assets.
- **Confidence:** Medium

---

## What improved since the previous security pass

- dependency audit is now clean
- deploy workflow performs `npm audit --audit-level=high`
- CSP includes `object-src 'none'`, `base-uri 'none'`, and `frame-ancestors 'none'`
- docs now explicitly mention third-party map/search behavior
- upload/parser safety bounds are stronger

---

## Final missed-issues sweep

Re-checked for:
- secrets/credentials,
- dependency CVEs,
- CSP/browser-hardening gaps,
- third-party data-flow issues,
- client-side abuse surfaces.

No new high-severity exploitable vulnerability was identified in this pass.

---

## Bottom line

Current security posture is **reasonably good for a static client-side app**, with the main remaining concerns being:
- residual CSP limitations,
- privacy leakage through auto-search behavior,
- and continued third-party runtime trust.

I would prioritize **SEC-POST-1** and **SEC-POST-2** next because they are small changes with clear privacy/operational upside.
