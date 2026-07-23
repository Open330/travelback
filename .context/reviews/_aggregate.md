# Aggregate Deep Review — Cycle 12

Date: 2026-07-24
Reviewed revision: `03df087d9befa3a6570f7eea17f2d4c6ba939a3c`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment: prohibited and not attempted

## Result

The three grouped review lanes produced **1 genuinely new, deduplicated
finding**:

- 0 Critical
- 0 High
- 0 Medium
- 1 Low

The finding is actionable in Cycle 12 and is not deferred. Cycle 1–11 roots,
accepted limitations, docs-only omissions, and the three explicit native/host
process boundaries were excluded.

No reviewer ran a full suite, process-supervisor test, E2E, Playwright,
Chromium/browser, server, build, deployment, commit, push, or process signal.
The architecture/tests lane passed generated-worker parity and 95 focused
tests; the UX/critic lane passed 116 focused tests.

## Review provenance

- core lane — code quality, correctness, security, performance, concurrency,
  tracing, debugging, and verification; no new finding survived;
- architecture/tests/documentation lane — architecture, source/test mapping,
  configuration, build/static scripts, CI, workers, and documentation; no new
  finding survived; and
- `cycle12-2026-07-24-ux-critic.md` — critic, designer, accessibility, i18n,
  responsive behavior, and non-technical-traveler perspectives.

The zero-finding lanes created no provenance artifact. Each group inventoried
its complete relevant surface and performed a final missed-file sweep.

## Deduplicated finding

### AGG12-01 — Camera disclosure state is not programmatically exposed

Severity: **Low**
Confidence: **High**
Agreement: UX/critic reviewer and cycle-parent source validation

Evidence:

- `src/components/TrackToolbar.tsx:166-178`
- `src/components/SceneEditor.tsx:836-863`

The toolbar's Camera button toggles a nonmodal Scene Editor while focus
remains on that trigger. Its visual active style changes, but the button
exposes neither `aria-expanded` nor `aria-controls`, and its title remains
the localized equivalent of “Open camera editor” even when the next action
will close the editor. The editor region has no stable controlled ID.

As a result, assistive-technology users receive no state or relationship
change at the point of operation, and the open-state action description is
incorrect. Give the region a stable ID, expose the disclosure state and
relationship on the trigger, and make the advisory title truthful in both
states. Add a focused open/close regression that verifies the relationship.

This is distinct from Cycle 10's retained-session hotkey isolation and Cycle
11's Escape/focus routing. Those changes determine which owner closes and
where focus returns; neither exposes the trigger's disclosure state.

## Exclusions and final sweep

- Cycle 11 smoothing authority and Journey autofocus ownership remain fixed.
- Cycle 10 schema-owned route names, paused camera publication, and hidden
  retained-trip hotkeys remain fixed.
- Cycle 9 prospective duration eligibility, social metadata, and export
  presentation documentation remain fixed.
- Earlier parser, scene, export, map, focus, layout, localization, and process
  findings were deduplicated against their archived plans and current code.
- Remaining hypotheses were historical, accepted boundaries, docs-only
  omissions, taste-level suggestions, or lacked exact causal evidence.
- Pre-observation marker erasure/reparenting, pidfd-grade identity, and exact
  global marker recovery without native host support remain excluded.

The final missed-file sweep found no second distinct root. No deployment
occurred.
