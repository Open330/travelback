# Cycle 10 UX and Critic Review

Date: 2026-07-24
Reviewed revision: `570aa3510b6ca1431b47001e860d43876df39e15`
Branch: `review-plan-fix/no-deploy-20260723`

## Coverage

This grouped lane covered the holistic critic and verifier roles, UI/UX,
WCAG 2.2 accessibility, responsive behavior, keyboard and focus ownership,
i18n, metadata and trust, loading/error/empty states, perceived performance,
and the non-technical traveler journey. It inventoried all frontend source,
CSS, locale tables, assets, tests, documentation, and Cycle 1–9 history before
a final sweep.

The lane was static only. It launched no browser, server, Playwright, Chrome,
process command, signal, commit, push, or deployment.

## New supported root

### UX10-01 — Retained-trip hotkeys remain live behind Journey Creator

Severity: **Medium**
Confidence: **High**

Evidence:

- `src/app/page.tsx:259-268`
- `src/app/page.tsx:359-372`
- `src/app/page.tsx:622-640`
- `src/app/page.tsx:669-682`
- `src/lib/usePlaybackController.ts:219-287`

Starting New Route intentionally retains the previous `track`, pauses
playback, hides the track workspace, and mounts Journey Creator. The global
hotkey hook still receives that retained non-null track. Once the clicked New
Route control unmounts, focus falls back to the document body, providing an
ordinary noninteractive target that passes the hook's target filter.

Space can resume the hidden trip, arrows can change its retained progress, F
can change Follow state, and E can open Export over Journey Creator. These
mutations violate provisional-session isolation and can also invert the saved
resume-on-cancel intent.

Fix: pass no active trip to the hotkey hook while Journey Creator owns the
provisional interaction. Keep non-trip shortcuts such as `?` available.
Extend the existing retained-session E2E regression to prove trip-dependent
keys cannot alter the hidden session and resume after Cancel.

## Rejected and deduplicated candidates

- Toast placement/timing, map-error tab order, small-viewport safe-area
  behavior, language-code presentation, scene/dialog semantics, and canvas
  focus are historical families.
- Thin font weights are a Cycle 1 duplicate.
- English landing/public SVG text is the Cycle 7 static-art localization root.
- Dynamic file-size detail text is a previously documented localization
  boundary.
- Current shipped locales are LTR, so an RTL failure hypothesis is unsupported.
- Static English first paint before locale hydration is intentional prior work.
- No nested-modal/focus-stack failure path survived validation.

