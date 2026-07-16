# Mina's Travelback Review — Cycle 8 (2026-07-17)

## Overall impression — A-

The main trip flow still feels friendly: I can see a sample before committing, upload the file I have, use simple camera presets, and reach an MP4 path without learning what MapLibre is. On the checked phone layout, the card fit, the toolbar stayed out of the way, and the main controls were proper finger-sized targets. 좋아요.

The new thing that would make me nervous is hidden under the surface: if my browser starts in Korean, the first English page and the first Korean page disagree so much that React throws away the first one and builds it again. I may only see a flash or a small delay, but this is exactly the kind of first-impression wobble that makes me wonder whether the site is broken. Spanish users also get two bits of copy that read like an unfinished translation.

## Flow walkthrough

1. **Landing and file choice:** The sample preview, Browse Files, manual-route path, and import-help path are easy to distinguish. The valid 390×844 computed layout had no overflow or toolbar/card overlap.
2. **Import and map:** GPX/KML/Google variants, unsupported-file recovery, map retry/reload, and load confirmation remain represented in current source and tests. No new dead end was confirmed.
3. **Playback and editing:** Play, duration, following, timeline dates, elevation, camera presets, scene correction feedback, and Help are understandable after Cycle 7's fixes.
4. **Export and share:** Default quality choices and ready/download/share explanations remain clearer than raw codec settings. The advanced controls are still optional.
5. **Mobile/theme/error:** Touch-size, light/dark token, reduced-motion, alert/status, empty, loading, cancel, and failure contracts are present. All exposed locales are LTR, so RTL is not a current product defect.

## Issue table

| Severity | Location | What I experience | Recommendation | Confidence |
| --- | --- | --- | --- | --- |
| 🟡 Medium | `src/lib/i18n.ts:1838-1888`; locale test gap at `src/lib/i18n.test.ts:103-108` | On a fresh Korean browser, the static English subtitle and hydrated Korean subtitle disagree. A direct real-provider probe made React log a hydration failure and replace the tree. | Start hydration in the same deterministic language as the static page, then switch to my saved/browser language immediately after mount; test Korean SSR→hydration directly. | High / confirmed |
| 🟢 Low | `src/lib/i18n.ts:1669,1699` | Spanish says `datos del cronología` and calls the timeline a `timeline`. It looks machine-translated. | Use `datos de la cronología` and `intervalo de la línea de tiempo`; keep those reviewed phrases in tests. | High / confirmed |

## What works well

- The sample trip lowers the biggest first-run barrier.
- Korean labels, localized guide art, endpoint dates, and import limits now have coherent ownership.
- Primary mobile landing controls measured at 44px or larger, and the card/toolbar did not collide.
- The product gives recovery actions instead of technical-only failures.
- Scene presets and simple export defaults keep me out of jargon unless I choose Advanced.

## E2E evidence and limitations

| Flow area | Evidence this review | Result |
| --- | --- | --- |
| Landing structure / mobile geometry / theme tokens | Current hardened output, accessibility tree, computed CSS at 390×844 and 1440×1000 | Pass |
| GPX, KML, Google Records, semantic history, timeline edits, semantic segments | Complete current Playwright/fixture inventory plus unit parser/worker coverage | Covered by suite; fresh execution reserved for Cycle 8 gates |
| Playback, camera, timeline, export states | Complete current E2E source inventory and focused component suites | Covered by suite; fresh execution reserved for Cycle 8 gates |
| Final real MP4 | Dedicated opt-in production-static gate | Must run in implementation gates with retries disabled, >1KiB, and `ftyp` validation |

I did not claim hydrated interaction from the `file://` browser session: the static base path prevented current Next chunks from hydrating there. Starting or terminating a server/process was explicitly forbidden for this review phase, so the full isolated dev/static suites and real-MP4 path are left to the mandatory Prompt 3 gates. The invalid unstyled measurements and apparent native file input were discarded. No temporary path was created.

## Competitive view

Relive still hides more of the file/data mechanics, but Travelback gives me more control without an account and keeps my trip local. Strava expects me to understand activity data; Polarsteps expects its own travel workflow. Travelback's sample-first path is the better fit when I already have a file. The remaining first-load locale rebuild is the one thing that currently makes this polished local-first story feel less solid.

## Priority recommendations

1. Fix non-English first-load hydration and prove it with a Korean SSR/hydration regression.
2. Correct the two Spanish strings and pin them in the reviewed-copy test.
3. Keep the mandatory full dev/static and real-MP4 gates green.
4. Preserve the current 44px mobile targets and collision-free landing layout.
5. Retain the existing evidence thresholds before attempting performance redesigns.

The final Mina sweep checked landing → import → map → playback → scenes → export → share, wrong-file and map/export recovery, mobile layout, theme, motion, language, obvious jargon, and test ownership. No relevant user-facing file was skipped, and no third new drop-off point was confirmed.
