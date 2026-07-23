# Cycle 5 Review Remediation Plan — 2026-07-23

Status: **Implementation in progress**

Source review: `.context/reviews/_aggregate.md`
Reviewed base: `97f66a63b3df97bce3f349a05248ebb8fef7886e`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment mode: **none**

## Scope and policy

- Schedule all 6 new aggregate findings. **No Cycle 5 finding is deferred.**
- Correct the known Cycle 4 P05 nested-profile-lock assertion as a required
  gate repair, without counting it as a new Cycle 5 finding.
- Preserve the three explicit native/host-capability deferrals without
  relabeling, expanding, or attempting to solve them.
- Retain `.context/plans/user-injected/pending-next-cycle.md`; its final-loop
  cleanup task is not due during Cycle 5.
- Archive the completed Cycle 4 implementation record.
- Implement in fine-grained semantic, gitmoji-prefixed, GPG-signed commits.
  Push only `review-plan-fix/no-deploy-20260723`.
- The Pages workflow triggers only on `main`; verify that fact before every
  push, never push `main`, and do not run a deployment command.
- Ralph is unavailable. Prompt 3 uses the documented iterative fallback:
  bounded implementation workstreams, focused regressions, complete gates,
  exact browser ownership audits, plan completion, signed commits, and branch
  pushes.
- A failed workstream or gate is recorded and repaired when possible, but
  never terminates this cycle or the outer 100-cycle process. Every remaining
  configured gate is still attempted.

## Process and browser hygiene

For every process-supervisor, browser, Playwright, or server execution:

1. Inventory pre-existing relevant processes and listeners, recording exact
   PID, PPID, PGID, UID, start token, command/profile, and ports 3099, 4173,
   and 4183. Check `.next/dev/lock`.
2. Give the run a unique marker, temporary root/profile, and explicit port.
   Record the exact owned shell/root, descendants, browser identities,
   listener, and profile.
3. Run browser gates strictly sequentially. Do not overlap development,
   static, or real-MP4 matrices.
4. Let each supervised command perform its normal cleanup. If intervention is
   required, signal only identities whose PID, UID, start token, ancestry or
   inherited marker, and ownership were validated for that run.
5. Verify every exact owned identity, profile holder/lock, and listener is
   absent before the next browser gate.
6. Never use `agent-browser close`, a global/shared close, `pkill`, `killall`,
   name-only killing, or a broad process match.
7. Preserve user Chrome rooted at PID 1368 and every unrelated browser,
   Playwright, agent-browser, or server owner. Do not signal an unrelated
   port-4173 owner if one appears.

The Prompt 1 UI session
`travelback-cycle5-ui-25a0fb71d81b9a43c91d4c2e68ac9c9a4c6d9ad7`
was closed by exact session identity. Its exact browser/daemon/crashpad/server
identities, CDP 59432, and port 45184 were absent; its profile had no holders
and no Singleton lock; `.next/dev/lock` was absent; protected Chrome PID 1368
was unchanged.

## Implementation workstreams

### P01 — Bound degenerate-track frame work

Finding: **AGG5-01** (High/High)

Primary files:

- `src/lib/interpolate.ts`
- `src/lib/interpolate.test.ts`
- `src/lib/camera.ts`
- `src/lib/camera.test.ts`

Implementation:

- Resolve zero-total-distance observations directly in index space without
  scanning segment boundaries or coordinates.
- Return a neutral bearing for a track with no measurable edge; do not repeat
  an impossible search from camera code.
- Replace any remaining segment-owner lookup with binary search over canonical
  segment starts.
- Bound duplicate/plateau bearing fallback through precomputed or indexed
  information while never crossing a disconnected segment boundary.
- Preserve endpoint reachability, antimeridian behavior, elevation/time
  interpolation, and the ordinary logarithmic distance lookup.

Acceptance:

- 250,000 identical points resolve interpolation and default camera with a
  constant or logarithmic indexed-read bound.
- 250,000 disconnected singleton segments do not linearly scan the segment
  start list for a midpoint or endpoint.
- Zero-distance tracks do not invent a connector or nonzero bearing.
- Existing duplicate, segment-boundary, endpoint, and camera tests pass.

### P02 — Enforce GPX ownership and budget before allocation

Finding: **AGG5-02** (High/High)

Primary files:

- `src/lib/parser.ts`
- `src/lib/parse-utils.ts`
- `src/lib/parser.test.ts`

Implementation:

- Reject any `trkseg` whose ancestor chain contains another `trkseg`.
- Select only direct `trkpt` children of each valid segment.
- Create one running point budget for semantic GPX extraction and consume it
  immediately before allocating each retained `TrackPoint`.
- Build the flattened point list incrementally instead of materializing all
  segment arrays before budget enforcement.
- Preserve fallback conversion for GPX documents without semantic track
  segments and preserve direct-child `ele`/`time` ownership.

Acceptance:

- Nested `trkseg` input fails with `XML_PARSE_ERROR` before multiplicative
  descendant extraction.
- Physical points are converted once, not once per ancestor.
- An over-budget direct-child document throws `TOO_MANY_POINTS` before the
  forbidden allocation.
- Ordinary segmented GPX output and fallback behavior remain unchanged.

### P03 — Classify prohibited XML declarations lexically

Finding: **AGG5-06** (Low/High)

Primary files:

- `src/lib/parser.ts`
- `src/lib/parser.test.ts`

Implementation:

- Remove the whole-document prohibited-token regex and context-blind entity
  stripping.
- In the existing linear scanner, after skipping comments, CDATA, and
  processing instructions, reject case-insensitive active `DOCTYPE` and
  `ENTITY` declaration openers.
- Pass the verified unchanged text to `DOMParser`.
- Keep tag/depth budgets, quoted delimiters, malformed-XML rejection, and
  real internal/external declaration rejection intact.

Acceptance:

- GPX and KML accept well-formed comments and CDATA containing literal
  `<!DOCTYPE` and `<!ENTITY` strings.
- Real DOCTYPE/ENTITY declarations in every supported case variant remain
  rejected before `DOMParser`.
- Observable inert text is not silently rewritten.
- Existing complexity/depth regressions remain green.

### P04 — Restore Follow-off camera through the export lease

Finding: **AGG5-03** (Medium/High)

Primary files:

- `src/lib/map-export-presentation.ts`
- `src/lib/map-export-presentation.test.ts`
- `src/components/MapView.tsx`
- `src/lib/useExportController.test.ts`
- `e2e/travelback.spec.ts`

Implementation:

- Extend the MapView-owned export presentation snapshot with the live manual
  camera and explicit ownership mode captured on first resize.
- Restore dimensions and DPR, then restore the captured camera before
  releasing export presentation ownership when Follow remains disabled.
- If Follow is enabled or ownership/session changed, invalidate smoothing and
  let the current progress camera recompute instead of applying a stale manual
  pose.
- Keep success, failure, abort, replacement, and teardown cleanup on the
  existing single `resetSize()` transaction.

Acceptance:

- A real frame may mutate the live camera, but success, injected failure, and
  post-frame cancellation restore the captured center, zoom, pitch, and
  bearing when Follow is off.
- Follow-on cleanup recomputes the correct final/restored progress camera.
- Dimensions, DPR ownership, marker, trail, progress, and lease settlement
  retain their current behavior.
- Browser coverage compares the debug camera before and after an actual-frame
  cancellation with ordinary MapLibre tolerances.

### P05 — Make error recovery a settled export handoff

Finding: **AGG5-04** (Medium/High)

Primary files:

- `src/components/ErrorBoundary.tsx`
- `src/components/ErrorBoundary.test.tsx`
- `src/app/page.tsx`
- `src/lib/useExportController.ts`
- `src/lib/useExportController.test.ts`

Implementation:

- Add a capture-time boundary callback that immediately invalidates and aborts
  the current export lease.
- Permit an asynchronous reset callback; keep the fallback mounted and Try
  Again disabled while recovery awaits full lease settlement.
- Only after settlement clear the track, playback, panels, and export result,
  then remount the child subtree.
- Advance an export/session generation on reset and require lease identity
  plus generation before every late result, toast, progress, blob URL,
  filename, state, or cleanup publication.

Acceptance:

- A descendant error aborts a held export even though the hook owner remains
  mounted.
- Try Again cannot remount or clear the session before the lease’s map cleanup
  settles.
- Resolving old encoder/download/finalizer work publishes no old URL, filename,
  `done`, toast, progress, or state after reset.
- A later export can acquire a fresh lease; ordinary user cancellation and
  import replacement retain their current semantics.

### P06 — Preserve duration drafts until validation

Finding: **AGG5-05** (Medium/High)

Primary files:

- `src/components/ExportPanel.tsx`
- `src/components/ExportPanel.test.tsx`
- `src/lib/i18n.ts`
- `src/lib/i18n.test.ts`
- `e2e/travelback.spec.ts`

Implementation:

- Keep a string duration draft separate from the committed numeric duration.
- Synchronize a new playback-derived default only when opening the panel, not
  over an active edit.
- Preserve transient empty/partial input. Validate on blur, Enter, and Start
  Export.
- On empty, non-integer, or out-of-range values, retain/edit focus and show a
  localized inline error linked with `aria-describedby`; do not silently
  substitute another number.
- Commit a valid value once and use it consistently for estimates and the
  export request.

Acceptance:

- Selecting `30` and typing `1`, then `5`, produces `15`.
- A temporary empty draft remains empty until validation.
- Values below 5 or above 180 show the associated localized error and block
  export until corrected.
- Blur/Enter/Start Export share one validation path; valid playback defaults
  remain bounded upstream.
- A real sequential-key browser regression passes without atomic `fill()`.

### P07 — Correct and independently audit the P05 gate residue

Finding: **Known Cycle 4 gate residue; not a Cycle 5 finding**

Primary files:

- `scripts/e2e-process-supervisor.test.mjs`
- `scripts/fixtures/real-chromium-failure.mjs` only if evidence requires it

Implementation:

- Replace the direct-parent lock assertion with canonical, separator-safe
  containment under the exact fixture-owned profile root.
- Retain lock existence before release, intentional child failure, exact
  PID/UID/start-token/marker/listener/profile absence, and unrelated sentinel
  survival assertions.
- Run the focused real-Chromium regression and all 40 supervisor tests with
  fresh pre-run inventories and independent post-run exact audits.

Acceptance:

- A nested path such as
  `profile/Default/shared_proto_db/LOCK` is accepted only when canonically
  contained inside that exact profile.
- Escaping, sibling, and absolute-outside paths fail the containment helper.
- The real fixture finishes with no owned process, listener, holder, profile,
  or sentinel identity error.
- All 40 supervisor tests pass without changing the three platform deferrals.

## Verification gates

Run focused regressions after each workstream. Before completion, attempt every
configured gate even if an earlier one fails:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`
5. `npm run test:e2e`
6. `npm run test:e2e:static:ci`
7. `npm audit --audit-level=high`
8. `npm run test:e2e:static:real-mp4`

The focused real-MP4 gate must retain structural box validation, AVC track,
packet and duration checks, metadata checks, first/last frame decode,
canvas-read, and download assertions. An intentional real-export skip in the
full matrices does not replace it.

The development matrix, static matrix, and isolated real-MP4 gate run
sequentially with a pre-run ownership inventory and an exact
survivor/profile/listener audit after each. Use explicit alternative ports
when an unrelated owner occupies a default port; never touch that owner.

## Completion log

Pending Prompt 3 implementation and all configured gates.
