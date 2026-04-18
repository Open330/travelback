# Code Quality & Infrastructure — 2026-04-17

**Priority:** P1-P2 — longest-term, least user-facing urgency
**Source:** comprehensive-deep-code-review-2026-04-15 (F7, F8), ultradeep-code-quality-review-post-remediation-2026-04-13 (CQ-POST-1, CQ-POST-2, CQ-POST-5), ultradeep-security-review-post-remediation-2026-04-13 (SEC-POST-2, SEC-POST-3, SEC-POST-5), review-remediation-gap-analysis-2026-04-13 (A.1-7, B.1-4), comprehensive-deep-code-review-post-remediation-2026-04-13 (F1-F10), comprehensive-deep-code-review-current-2026-04-13 (F1-F8), comprehensive-ui-ux-review-2026-04-17 (3.10, 7.3, 7.4)
**Estimated effort:** 2-3 days

---

## Findings addressed

| # | Issue | Severity | Source |
|---|-------|----------|--------|
| A.1 | Timeline trimming can collapse to 1-point track | Medium | gap-analysis |
| A.2 | Export filenames strip non-Latin titles | Medium | gap-analysis |
| A.3 | Playwright not in deploy CI gating | Medium | gap-analysis |
| A.4 | Locale/unit paths weakly tested (English-only suite) | Low | gap-analysis |
| A.5 | `.context` docs drift from code | Low | gap-analysis |
| A.6 | `page.tsx` remains large orchestration hub | Low | gap-analysis |
| A.7 | Main-thread parse DoS risk remains | Medium | gap-analysis |
| B.1 | Journey Creator auto-submits partial queries to third party | Medium | gap-analysis |
| B.2 | CSP still relies on `unsafe-inline` | Medium | gap-analysis |
| B.3 | Vendored styles still point at remote tiles/glyphs/sprites | Low | gap-analysis |
| B.4 | README/privacy messaging should stay aligned | Low | gap-analysis |
| F7 | JourneyCreator stale icons after style reload | Medium | deep-code-review-04-15 |
| F8 | Metadata/icon URLs hardcoded to `/travelback` | Low | deep-code-review-04-15 |
| 3.10 | Export time estimate unreliable | P2 | ui-ux-review-04-17 |
| 7.3 | Export success checkmark no animation | P2 | ui-ux-review-04-17 |
| 7.4 | Scene coverage bar percentages misaligned | P2 | ui-ux-review-04-17 |

---

## Implementation steps

### Phase 1 — Correctness fixes

#### 1a. Timeline trimming 1-point collapse

**File:** `src/components/TimelineSelector.tsx`

**Problem:** Ratio-gap logic can round start and end indices to the same value, collapsing the track to a single point.

**Fix:** Enforce a minimum span of 2 points after trimming:
```ts
const clampedEnd = Math.max(clampedStart + 1, computedEnd)
```
Add a guard that if `startIndex === endIndex`, shift the end index by +1 (clamped to the array length).

---

#### 1b. Export filenames — non-Latin title sanitization

**File:** `src/lib/useExportController.ts` or `videoEncoder.ts`

**Problem:** Filename sanitization strips non-ASCII characters, so Korean/Japanese/Chinese track names become empty strings.

**Fix:** Replace ASCII-only sanitization with a Unicode-aware approach:
```ts
const sanitize = (name: string) =>
  name.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'travelback-video'
```
Only strip characters that are actually invalid in filenames (OS-dependent), not all non-ASCII. Keep CJK characters intact.

---

#### 1c. JourneyCreator stale icons (F7)

**File:** `src/components/JourneyCreator.tsx`

Already covered in interaction-state-correctness plan. Duplicate — implement there.

---

#### 1d. Metadata/icon URLs (F8)

**File:** `src/app/layout.tsx:5,16-20,30-36`

**Problem:** `metadataBase`, `openGraph.url`, and icon URLs hardcoded to `/travelback`.

**Fix:** Derive from the same `basePath` logic:
```ts
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')
const metadataBase = new URL(basePath || '/', 'https://your-domain.com')
```
For local dev, use `http://localhost:3000`. For production, use an env variable `NEXT_PUBLIC_SITE_URL`.

---

### Phase 2 — Test & CI improvements

#### 2a. Playwright in deploy CI

**File:** `.github/workflows/deploy-pages.yml`

**Fix:** Add a CI step after build that runs the Playwright suite:
```yaml
- name: Run E2E tests
  run: npm run test:e2e:static:ci
```
Ensure the static smoke server starts before tests run. Use the existing `npm run smoke:static` + `npm run test:e2e:static:ci` pattern.

---

#### 2b. Locale/unit test coverage

**File:** `e2e/travelback.spec.ts`

**Fix:** Add at least one test that:
1. Switches locale to Korean via the locale picker
2. Verifies UI labels appear in Korean
3. Switches units to imperial and verifies distance display changes

This doesn't need to be exhaustive — just enough to catch regressions in the i18n/unit wiring.

---

#### 2c. Documentation drift

**Files:** `README.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`

**Fix:** Update:
- README test count to current number
- Architecture docs to reflect modal dialog component, current toolbar layout, and local map style setup
- Overview docs to document the current trust boundary (local styles, remote tiles)

Add a convention in `.context/development/01-conventions.md` that structural changes should update docs in the same PR.

---

### Phase 3 — Security & privacy

#### 3a. CSP `unsafe-inline` reduction

**Files:** `next.config.ts`, potentially `scripts/harden-static-export.mjs`

**Problem:** CSP uses `unsafe-inline` for style-src and possibly script-src, weakening XSS containment.

**Fix (incremental):**
1. Replace `unsafe-inline` for `style-src` with a hash of the inline styles. Next.js generates known inline styles — extract their hashes at build time.
2. For `script-src`, Next.js requires `unsafe-eval` in dev mode but not in production. Split the CSP header between dev and production configs.
3. Full nonce-based CSP is the ideal but requires significant Next.js configuration. Start with removing `unsafe-inline` from `style-src` as a first step.

**Note:** This is a complex change. If it blocks other work, defer and document as a known residual constraint.

---

#### 3b. Journey Creator search privacy

**File:** `src/components/JourneyCreator.tsx`

**Problem:** After the minimum-length threshold, search auto-submits partial queries to Nominatim on every keystroke pause.

**Fix:**
1. Increase the debounce from 1s to 1.5s
2. Add a clear disclosure label in the search field: "Location search powered by OpenStreetMap"
3. Only search when the user explicitly presses Enter or clicks a search button (opt-in, not auto)
4. Cache recent search results to reduce repeated queries for the same term

---

#### 3c. Remote tiles/glyphs/sprites trust boundary

**Problem:** Vendored style JSON removed one trust boundary, but map tiles and glyphs are still fetched from remote CDN.

**Fix:** Document the remaining trust boundary clearly. Options:
- Accept as residual trust (tiles must come from somewhere for a web map)
- Offer an "offline mode" that bundles tiles for a limited region (future feature)
- Pin the tile/glyph CDN URLs and add Subresource Integrity where possible

For now: update docs to clearly state what is and isn't local/trusted.

---

### Phase 4 — Page.tsx decomposition

**File:** `src/app/page.tsx`

**Problem:** 700+ line orchestration hub with unrelated concerns coupled together.

**Fix (bounded extraction, one pass):**
1. Extract export-related state and handlers into a custom hook `useExportState`
2. Extract journey-creator-related state into `useJourneyState`
3. Keep only top-level coordination state (track, mode, mapStyle, scenes) in page.tsx
4. Target: reduce page.tsx to ~400-500 lines

This is a continuation of previous bounded extractions. Don't attempt a full rewrite — just one more extraction pass.

---

### Phase 5 — Small UI/UX fixes

#### 5a. Export time estimate reliability

**File:** `src/components/ExportPanel.tsx:77-83`

**Fix:** Replace precise estimate with a range:
- Instead of "~2 min", show "~1-3 min"
- Add a disclaimer: "Estimate varies with device performance"
- After 10 seconds of encoding, update the estimate based on actual progress rate

---

#### 5b. Export success checkmark animation

**File:** `src/components/ExportPanel.tsx:166-167`

**Fix:** Add a simple CSS scale-in animation:
```css
@keyframes checkmark-in {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```
Apply to the checkmark on success state.

---

#### 5c. Scene coverage bar alignment

**File:** `src/components/SceneEditor.tsx:348-363`

**Fix:** Remove the fixed 0%/50%/100% labels and instead show percentage only at scene boundaries. Or remove percentage labels entirely and rely on the visual coverage bar alone.

---

## Verification checklist

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run test:e2e:static:ci`
- [x] Timeline trimming cannot produce a 1-point track
- [x] Export with CJK track name produces a valid filename
- [ ] CI runs Playwright before deploy
- [ ] Locale/unit regression test passes
- [ ] CSP header no longer has `unsafe-inline` for style-src (or documented why it remains)
- [ ] Journey Creator search has explicit trigger, not auto-submit
- [ ] page.tsx reduced by ~200+ lines
- [x] Metadata URLs work in both GitHub Pages and local dev
