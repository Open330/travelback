# Comprehensive Deep Code Review — Post-Remediation (2026-04-13)

**Reviewer:** Codex  
**Recommendation:** **COMMENT** — the repository is materially improved and no new release-blocking defect surfaced in this pass, but several real issues and follow-up risks remain.

## Scope and method

This was a fresh, repo-wide, non-sampling review of the **current** repository state.

### Inventory first
I built a review-relevant inventory of **89 non-generated files** and reviewed all files that materially affect runtime behavior, deployment, tests, or repository guidance.

#### Reviewed in depth
- all runtime files under `src/`
- config/workflow/scripts:
  - `package.json`
  - `next.config.ts`
  - `eslint.config.mjs`
  - `tsconfig.json`
  - `playwright.config.ts`
  - `playwright.static.config.ts`
  - `.github/workflows/deploy-pages.yml`
  - `scripts/serve-static.mjs`
  - `scripts/smoke-static.mjs`
- tests and fixtures:
  - `e2e/travelback.spec.ts`
  - all files under `e2e/fixtures/`
- documentation and review/planning artifacts under:
  - `README.md`
  - `.context/README.md`
  - `.context/development/`
  - `.context/project/`
  - `.context/reviews/`
  - `.context/plans/`

#### Intentionally excluded from deep logic review
Generated/vendor/state artifacts:
- `.git/`, `node_modules/`, `.next/`, `out/`, `.omx/`, `.omc/`, `test-results/`

### Validation used in this pass
- `npm audit --json` ✅ 0 vulnerabilities
- `npm install --dry-run` ✅ no peer warnings
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run build` ✅
- `npm run smoke:static` ✅
- `npx playwright test -c playwright.static.config.ts --reporter=line` ✅ 34 passed

---

## Findings summary

| ID | Severity | Classification | Title |
|---|---|---|---|
| F1 | Medium | Confirmed | Timeline trimming can still collapse a track to a single point |
| F2 | Medium | Confirmed | Export filename sanitization strips non-Latin track names |
| F3 | Medium | Confirmed | Deploy CI still does not run the existing Playwright suite |
| F4 | Low | Confirmed | Locale/unit UX paths remain weakly tested because the suite is English-only |
| F5 | Low | Confirmed | Documentation drift still exists in `.context` and architecture docs |
| F6 | Medium | Confirmed | Journey Creator still sends partial free-form place queries to a third party after only 3 characters |
| F7 | Medium | Likely | Client-side parsing DoS risk remains because large files are still fully parsed on the main thread |
| F8 | Medium | Confirmed | CSP still relies on `unsafe-inline`, so XSS containment remains limited |
| F9 | Low | Risk needing manual validation | Vendored style JSON reduces one trust boundary, but runtime still depends on mutable third-party tiles/glyphs/sprites |
| F10 | Low | Risk needing manual validation | `src/app/page.tsx` is still a large orchestration hub and remains a future regression risk |

---

## Detailed findings

### F1 — Timeline trimming can still collapse a track to a single point
- **Severity:** Medium
- **Classification:** Confirmed
- **Files / regions:**
  - `src/components/TimelineSelector.tsx:81-105`
  - `src/components/TimelineSelector.tsx:183-184`
  - `src/app/page.tsx:174-189`
- **Why this is a problem:**
  - `TimelineSelector` enforces a minimum **ratio** gap (`1 / points.length`), but converts ratios to point indexes with `Math.round(...)`.
  - That does **not** guarantee `startIdx !== endIdx` after rounding.
  - `page.tsx` then slices `fullTrack.points.slice(startIdx, endIdx + 1)` without enforcing a minimum of 2 points.
- **Concrete failure scenario:**
  - For a 3-point track, `startRatio = 0.26` and `endRatio = 0.60` satisfy the ratio-gap rule, but both round to index `1`.
  - The app produces a 1-point filtered track, which makes playback/export semantics degenerate even though normal file import rejects `< 2` points.
- **Suggested fix:**
  - Enforce the minimum gap in **index space**, not only ratio space.
  - Alternatively, clamp the converted indexes so `endIdx >= startIdx + 1` before calling `onRangeChange`.
- **Confidence:** High

### F2 — Export filename sanitization strips non-Latin track names
- **Severity:** Medium
- **Classification:** Confirmed
- **Files / regions:**
  - `src/lib/videoEncoder.ts:125-129`
- **Why this is a problem:**
  - The export filename sanitization uses `/[^a-zA-Z0-9\s\-]/g`, which removes all non-ASCII letters.
  - The app supports Korean, Japanese, Chinese, Spanish, and user travel data often carries non-Latin names.
- **Concrete failure scenario:**
  - A track named `서울 산책`, `東京散歩`, or `台北旅行` is exported.
  - The sanitized name becomes empty and the filename falls back to `Travelback - Journey.mp4`, losing the user’s actual title.
- **Suggested fix:**
  - Use Unicode-aware sanitization instead of ASCII-only filtering.
  - Preserve letters/numbers from other scripts while still removing filesystem-hostile characters.
- **Confidence:** High

### F3 — Deploy CI still does not run the existing Playwright suite
- **Severity:** Medium
- **Classification:** Confirmed
- **Files / regions:**
  - `.github/workflows/deploy-pages.yml:17-34`
  - `package.json:12-15`
- **Why this is a problem:**
  - The deploy job now runs lint, typecheck, audit, build, and static smoke checks.
  - But the repository also maintains a meaningful Playwright suite and that suite is **not** part of deploy gating.
- **Concrete failure scenario:**
  - A regression affecting interaction flow, localization hooks, export UI, or map lifecycle slips past lint/typecheck/smoke and ships to Pages because only the smoke script is enforced in CI.
- **Suggested fix:**
  - Add at least a targeted Playwright subset to CI, or run `npm run test:e2e:static` on deploy if runtime allows.
- **Confidence:** High

### F4 — Locale/unit UX paths remain weakly tested because the suite is English-only
- **Severity:** Low
- **Classification:** Confirmed
- **Files / regions:**
  - `playwright.config.ts:13-20`
  - `playwright.static.config.ts:13-20`
  - representative English-only selectors throughout `e2e/travelback.spec.ts`, e.g. `:160-170`, `:596-618`
- **Why this is a problem:**
  - Both Playwright configs force `locale: 'en-US'`.
  - The suite’s assertions are overwhelmingly written against English visible text.
  - The app now has 5 locales plus a unit toggle, but those paths are almost entirely unverified.
- **Concrete failure scenario:**
  - A translation key regression, layout break in a non-English locale, or unit-toggle regression ships unnoticed because the automated suite never leaves English.
- **Suggested fix:**
  - Add a small localized smoke matrix: at minimum one non-English locale and one imperial-unit path.
  - Prefer stable test ids for locale-sensitive flows rather than English text-only selectors.
- **Confidence:** High

### F5 — Documentation drift still exists in `.context` and architecture docs
- **Severity:** Low
- **Classification:** Confirmed
- **Files / regions:**
  - `.context/README.md:17-27`
  - `.context/project/01-overview.md:14`
  - `.context/project/02-architecture.md:64-78`
- **Why this is a problem:**
  - `.context/README.md` still shows only a single archived plan and a single review in its structure example, despite the repo now containing many active plans/reviews and more archived plans.
  - `.context/project/01-overview.md` still says “Map Tiles: CARTO free vector tiles (Voyager, Positron, Dark Matter)” even though current runtime style docs now also involve locally pinned style JSON and OpenFreeMap-backed styles.
  - `.context/project/02-architecture.md` still omits Bird’s Eye in the camera table and still describes the default scene flow as `Opening Overview → Flyover → Orbit → Ground → Closing Overview`, which no longer matches the 6-scene default including Bird’s Eye.
- **Concrete failure scenario:**
  - Contributors or future agents use `.context` as source-of-truth and reason from stale architecture/planning metadata, reopening old work or misunderstanding the current runtime design.
- **Suggested fix:**
  - Refresh `.context/README.md` structure output.
  - Update `.context/project/01-overview.md` and `.context/project/02-architecture.md` to match the current architecture and style trust boundary.
- **Confidence:** High

### F6 — Journey Creator still sends partial free-form place queries to a third party after only 3 characters
- **Severity:** Medium
- **Classification:** Confirmed
- **Files / regions:**
  - `src/components/JourneyCreator.tsx:24`
  - `src/components/JourneyCreator.tsx:340-358`
  - `src/components/JourneyCreator.tsx:440`
- **Why this is a problem:**
  - Search now requires 3 characters, which is better than before, but it still auto-submits partial place strings after a 1-second pause.
  - That is a privacy-sensitive behavior because the app sends user intent to Nominatim before an explicit submit.
- **Concrete failure scenario:**
  - A user starts typing a home/work/medical/legal address and pauses after 3–4 characters.
  - A partial query is already transmitted to a third party even if the user never intended to search yet.
- **Suggested fix:**
  - Consider an explicit submit action for search, or at least a longer threshold / stronger disclosure / privacy mode.
- **Confidence:** High

### F7 — Client-side parsing DoS risk remains because large files are still fully parsed on the main thread
- **Severity:** Medium
- **Classification:** Likely
- **Files / regions:**
  - `src/components/FileUpload.tsx:18-19, 38-44`
  - `src/lib/parser.ts:49, 88, 242, 307-331`
- **Why this is a problem:**
  - The app reduced the file cap to 200 MB and added a point-count guard, but it still reads and parses the whole file synchronously on the main browser thread via `FileReader`, `DOMParser`, and `JSON.parse` before the point-count check can help.
- **Concrete failure scenario:**
  - A malicious or just extremely pathological GPX/JSON file under 200 MB freezes the browser tab during parsing.
  - The app still has no worker/off-main-thread parse path.
- **Suggested fix:**
  - Move parsing to a Web Worker.
  - Add earlier structural guards where possible, not only post-parse point-count validation.
- **Confidence:** Medium

### F8 — CSP still relies on `unsafe-inline`, so XSS containment remains limited
- **Severity:** Medium
- **Classification:** Confirmed
- **Files / regions:**
  - `src/app/layout.tsx:48-55`
  - `.context/project/02-architecture.md:104-106`
- **Why this is a problem:**
  - The CSP is stronger than before, but it still allows `script-src 'unsafe-inline'`.
  - That leaves the browser-side blast radius larger if a future injection sink appears.
- **Concrete failure scenario:**
  - A future change accidentally introduces an HTML/script injection path.
  - The current CSP offers less containment than a nonce/hash-based policy would.
- **Suggested fix:**
  - Keep this explicitly tracked as residual risk and move toward nonce/hash-based inline script handling if Next static export allows it.
- **Confidence:** High

### F9 — Vendored style JSON reduces one trust boundary, but runtime still depends on mutable third-party tiles/glyphs/sprites
- **Severity:** Low
- **Classification:** Risk needing manual validation
- **Files / regions:**
  - `src/types.ts:18-38`
  - `public/map-styles/voyager.json:5-12`
  - `public/map-styles/liberty.json:1`
- **Why this is a problem:**
  - The app now pins style JSON locally, which is good.
  - But those style files still point to remote vector tiles, sprites, glyphs, and raster assets.
  - So runtime behavior still depends on mutable third-party infrastructure.
- **Concrete failure scenario:**
  - A provider changes tile/glyph/sprite behavior or availability.
  - The app’s map rendering changes or fails without any code change in this repo.
- **Suggested fix:**
  - If stronger supply-chain control is needed, self-host or pin the remaining remote assets too.
- **Confidence:** Medium

### F10 — `src/app/page.tsx` is still a large orchestration hub and remains a future regression risk
- **Severity:** Low
- **Classification:** Risk needing manual validation
- **Files / regions:**
  - `src/app/page.tsx:1-655`
- **Why this is a problem:**
  - The page component still coordinates playback, export lifecycle, track loading, trimming, locale, units, map style, keyboard help state, journey creation, and scene editing.
  - Some responsibilities were extracted, but the file remains a large state hub.
- **Concrete failure scenario:**
  - A future feature adds another track-scoped or export-scoped concern and misses one cleanup/reset path, recreating the same class of bugs already fixed in earlier passes.
- **Suggested fix:**
  - Continue bounded extractions into dedicated hooks/components, especially around track-session state and export orchestration.
- **Confidence:** Medium

---

## Final missed-issues sweep

I did a dedicated final pass for commonly missed classes of problems:
- off-by-one / rounding edge cases in trimming and progress math
- cross-file state leakage after recent refactors
- docs/runtime drift after plan archiving and style pinning
- remaining privacy leaks after the Journey Creator changes
- CI/test coverage blind spots despite passing local suites
- residual supply-chain/browser hardening risks

I do **not** believe any review-relevant source/config/test/doc file was skipped in this pass.

---

## Bottom line

The repo is in significantly better shape than in the earlier reviews, and this pass did **not** uncover a new release-blocking defect. The most worthwhile remaining work is:
1. fix the timeline one-point trim edge case,
2. make export filenames Unicode-friendly,
3. close the CI/test-coverage gaps,
4. finish the remaining docs cleanup,
5. decide whether Journey Creator search should stay auto-submit for privacy-sensitive users.
