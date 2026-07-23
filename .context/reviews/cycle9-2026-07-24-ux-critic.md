# Cycle 9 UX, critic, and non-technical traveler review — 2026-07-24

## Scope and verdict

Target: `review-plan-fix/no-deploy-20260723` at
`0c7eb7cb0d9265797327c343684d27ad27fdfdfa`.

Review roles: product critic, visual/interaction designer, accessibility and
i18n reviewer, registered non-technical-traveler perspective, and
whole-product skeptic.

**Provisional result: one genuinely new root cause.**

| ID | Finding | Severity | Confidence |
| --- | --- | --- | --- |
| UX9-01 | The site advertises a large social card but provides no social-preview image | Low | High |

The review was source-, semantic-, DOM-, style-, and existing-test-led. In
accordance with the cycle's process-safety constraint, it did not start a
browser, Chrome, Playwright, a development/static server, or an E2E supervisor.
No deploy was performed.

## Review inventory and method

The review covered the complete tracked product-facing inventory:

- all 69 tracked paths under `src`, including the app shell, page orchestration,
  global styles, all 17 production components, supporting libraries and types,
  and their colocated tests;
- all 19 tracked public assets, including the landing preview, guide art,
  icons, manifest, and map/export-adjacent imagery;
- all 21 tracked E2E specifications, used as existing journey and viewport
  evidence rather than executed browser tests;
- the README, project overview and architecture, development conventions,
  persona material, current plans, prior review reports, and cycle history
  through Cycle 8.

The source walk traced the complete first-use and return-use journey: landing,
file import, sample/manual starts, validation and recovery, map exploration,
playback, timeline and elevation inspection, scene capture, export, theme and
locale changes, error states, and reset. Cross-cutting checks included keyboard
and focus semantics, dialogs and transient feedback, responsive and safe-area
styles, reduced motion, color/theme variants, five-locale coverage, map-label
localization, empty/loading/error states, and perceived-performance affordances.
The registered non-technical-traveler perspective was evaluated against this
source and test evidence; no live-device or live-browser observation is claimed.

## UX9-01 — Advertised large social card has no image

**Severity:** Low

**Confidence:** High

**Status:** Confirmed from source and the installed Next.js metadata contract

### Evidence and causal trace

- `src/app/layout.tsx:25-37` supplies Open Graph type, URL, title,
  description, and site name, but no `openGraph.images`.
- The same block declares `twitter.card: "summary_large_image"` while supplying
  no `twitter.images`.
- There is no tracked `opengraph-image.*` or `twitter-image.*` file for Next.js
  to discover by convention.
- `public/landing-preview.svg` is consumed inside `FileUpload`; its existence
  does not register it as route metadata.
- `.context/project/01-overview.md:100` describes social sharing as having
  “Full metadata,” which raises the intended product bar beyond the current
  implementation.
- `scripts/smoke-static.mjs` checks generated HTML, CSP, and static-asset
  delivery, but it does not assert `og:image` or `twitter:image`.
- The installed Next.js type declarations expose images on both Twitter and
  Open Graph metadata, including the `summary_large_image` card contract.

The root cause is a mismatch between the selected large-card presentation and
the metadata payload: the code requests an image-led card without declaring an
image. When a traveler shares the site in a messaging or social product, the
crawler therefore has no authored branded image for that card. Exact fallback
behavior is crawler-dependent, but a text-only, downgraded, or externally chosen
preview is possible. This affects the product's first impression and trust at
the point before a traveler begins the import journey.

### Recommended correction

Add a crawler-compatible social-preview asset, preferably a roughly
1200-by-630 PNG or JPEG with locale-neutral content and meaningful alternative
text. Register a base-path-safe image descriptor in both `openGraph.images` and
`twitter.images`, or use the corresponding Next.js metadata file conventions.
Do not reuse the current English-bearing landing SVG unchanged for every
locale.

Extend the static smoke coverage to require:

- `twitter:card=summary_large_image`;
- non-empty `og:image` and `twitter:image` values;
- useful image alt text and, where emitted, dimensions;
- a successful response for the referenced asset under both the default mount
  and the configured root/base-path mount.

### Historical deduplication

Searches across prior reports, plans, and history for the large-card declaration,
`og:image`, `twitter:image`, social-preview terminology, and the Next.js image
conventions found no prior root. Earlier metadata work addressed mount-aware
URLs and icons, not the absent social-preview payload. Another Cycle 9 reviewer
independently identified the same causal root as `ATD9-01`; the aggregate should
count it once.

## Dedupe decisions and remaining UX assessment

- The English text embedded in `public/landing-preview.svg` remains visible
  inside otherwise localized landing UI. It was not counted as new because
  Cycle 7 already established and fixed the same systemic root—static English
  SVG art bypassing localized UI—under `CRIT7-03` / `DOC7-01`. It does,
  however, explain why that asset should not simply become the universal social
  image.
- Light-theme primary-button contrast in some map style variants was not
  counted because it falls under the prior semantic-accent/primary-CTA contrast
  root and plan.
- The Japanese and Chinese recovery hint's retained “Google Timeline” product
  name was not counted because the inconsistent product-terminology root was
  already captured in Cycle 2.
- Previously reported toast timing, map-error tab order, small-viewport sizing,
  language-code presentation, duration localization, dialog semantics, and
  canvas-focus limitations were treated as known roots rather than renamed.
- Cycle 8's MapLibre locale propagation was checked at its callers and
  implementation boundary. It preserves the intended map-style identity and no
  new accessibility, localization, or interaction regression was found.
- No new root was supported for keyboard flow, focus restoration, dialog
  naming, reduced motion, safe-area handling, responsive chronology, loading
  and recovery messaging, or the core import-to-export journey. Browser-only
  visual hypotheses were not promoted to findings without evidence.

## Safe verification

The following file-scoped checks passed:

```text
npx vitest run src/lib/i18n.test.ts src/lib/i18n.hydration.test.ts \
  src/lib/map-locale.test.ts src/lib/theme-contrast.test.ts \
  src/components/FileUpload.test.ts

5 test files passed; 49 tests passed.
```

```text
npx eslint src/app/page.tsx src/app/layout.tsx src/components/*.tsx \
  src/lib/i18n.ts src/lib/map-locale.ts

Exit 0.
```

Final sweep result: **1 new finding (Low / High confidence)**. No browser-family
process was started by this review lane, so no Chrome/Playwright cleanup was
required.
