# Implementation Plan: Address Ultradeep Security Review (2026-04-13)

**Source review:** `.context/reviews/ultradeep-security-review-2026-04-13.md`  
**Goal:** remediate the repo’s dependency risk, browser hardening gaps, privacy/trust-boundary issues, and client-side abuse exposure without changing the product’s client-side nature.

---

## Findings-to-workstream mapping

| Review ID | Theme |
|---|---|
| SEC1 | Dependency vulnerabilities |
| SEC2 + SEC6 | CSP / browser hardening |
| SEC3 | Privacy and trust-boundary messaging |
| SEC4 | Client-side parsing abuse resistance |
| SEC5 | Remote-style supply-chain risk |

---

## Implementation phases

### Phase A — Dependency remediation and policy

#### A.1 Upgrade vulnerable dependencies and regenerate lockfile
**Files:**
- `package.json`
- `package-lock.json`

**Work:**
- Upgrade `next` from the currently vulnerable range to a patched release (`>=16.2.3` or current safe stable).
- Regenerate the lockfile so vulnerable `picomatch` / `brace-expansion` resolutions are removed where upstream allows.
- Re-run audit after lockfile refresh and document any residual transitive findings that remain blocked by upstream packages.

**Acceptance criteria:**
- `npm audit` no longer reports the currently known `next` issue.
- Lockfile no longer contains avoidably vulnerable `picomatch` / `brace-expansion` entries when patched resolutions are available.

#### A.2 Add dependency scanning to CI policy
**Files:**
- `.github/workflows/deploy-pages.yml` or a dedicated CI workflow

**Work:**
- Add an audit/dependency-scan step to CI.
- Decide whether deploy should block on high/critical findings only, or on all known vulnerabilities.
- Document the policy in repo docs if needed.

**Acceptance criteria:**
- New high-severity dependency vulnerabilities are surfaced automatically before deploy.

### Phase B — Browser hardening / CSP tightening

#### B.1 Tighten CSP to improve XSS containment
**Files:**
- `src/app/layout.tsx`
- emitted-output verification via build/static inspection

**Work:**
- Re-evaluate whether production requires `unsafe-eval`.
- Reduce CSP permissiveness where feasible.
- Add missing defense-in-depth directives:
  - `object-src 'none'`
  - `base-uri 'none'`
  - `frame-ancestors 'none'` unless embedding is intentionally supported
- If inline script remains necessary, prefer a nonce/hash-based path over a broad inline allow.

**Acceptance criteria:**
- CSP is strictly stronger than the current policy while still allowing the app to function.
- Clickjacking protection is explicitly enforced if embedding is not intended.

#### B.2 Document any CSP trade-offs that must remain
**Files:**
- `README.md` or `.context/project/02-architecture.md` if security notes live there

**Work:**
- If some permissive directives cannot be removed, document why they exist and what future work would be needed to remove them.

**Acceptance criteria:**
- Remaining CSP exceptions are deliberate and explained, not accidental.

### Phase C — Privacy and third-party data-flow transparency

#### C.1 Correct privacy claims in docs and UI copy
**Files:**
- `README.md`
- `.context/project/02-architecture.md`
- any onboarding/help copy that claims “no privacy concerns” or equivalent

**Work:**
- Replace overbroad privacy claims with accurate wording:
  - raw files are processed locally,
  - but third-party tile/style/geocoder services may still receive map/search-derived requests.
- Make the trust boundary legible to users.

**Acceptance criteria:**
- The repo no longer claims “no privacy concerns” in a way that contradicts actual network behavior.
- Third-party service involvement is explicitly disclosed.

#### C.2 Add a trust-boundary note for geocoding and map services
**Files:**
- `src/components/GoogleGuide.tsx` and/or `src/components/JourneyCreator.tsx`
- related i18n keys in `src/lib/i18n.ts` if surfaced in UI
- docs in `README.md`

**Work:**
- Add a small note that place search uses OpenStreetMap/Nominatim and that map rendering depends on third-party basemap/style providers.

**Acceptance criteria:**
- Users have a clear in-product or documented explanation of which features contact third-party services.

### Phase D — Client-side abuse resistance

#### D.1 Reduce parser DoS exposure from untrusted local files
**Files:**
- `src/components/FileUpload.tsx`
- `src/lib/parser.ts`
- optional new worker file if parsing is moved off the main thread

**Work:**
- Revisit the 500 MB hard limit.
- Add structural / point-count / parse-budget safeguards.
- Define whether parsing should move to a Web Worker as part of the first remediation wave or as a follow-up.

**Acceptance criteria:**
- The app fails fast on obviously pathological files instead of attempting unbounded main-thread parsing.
- The remediation path is documented even if the full worker migration is staged later.

#### D.2 Strengthen failure messaging for parse abuse cases
**Files:**
- `src/components/FileUpload.tsx`
- `src/lib/i18n.ts`

**Work:**
- Ensure oversized or structurally suspicious inputs fail with clear user-facing messages instead of generic parse failure where possible.

**Acceptance criteria:**
- Users can distinguish unsupported/corrupt/too-large/problematic inputs from generic parse errors.

### Phase E — Remote-style supply-chain risk reduction

#### E.1 Decide whether to self-host or pin map style assets
**Files:**
- `src/types.ts`
- deployment/static asset strategy docs if needed

**Work:**
- Evaluate the practical options:
  1. keep remote styles but document the trust boundary,
  2. pin/self-host style JSON and related assets,
  3. provide a self-host/offline mode for privacy-sensitive use.
- Produce a bounded first step, not an open-ended platform rewrite.

**Acceptance criteria:**
- The repo has an explicit, documented policy for remote style trust rather than an implicit dependency.

---

## Verification plan

- `npm audit`
- `npm run lint`
- `npm run typecheck`
- `npm run smoke:static`
- emitted HTML/CSP inspection after hardening changes
- manual/network verification for:
  - disclosed third-party requests,
  - tightened CSP compatibility,
  - safe parse rejection behavior

---

## Recommended execution order

1. Phase A (dependency remediation + CI policy)
2. Phase B (CSP/browser hardening)
3. Phase C (privacy/trust-boundary messaging)
4. Phase D (client-side abuse resistance)
5. Phase E (remote-style trust strategy)
