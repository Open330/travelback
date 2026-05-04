# Cycle 4 Implementation Plan — 2026-05-04

Based on cycle 4 aggregate review at `.context/reviews/_aggregate.md`.
New findings this cycle: 2 LOW, 3 INFORMATIONAL. All quality gates pass clean.
Cycle 3 plan items (P05-P09) all completed.

---

## Phase 1 — Quick fixes

### P10 — Fix inconsistent indentation in MapView progress effect (C4-F1)

- **Severity**: Low (style) | **Confidence**: High
- **File**: `src/components/MapView.tsx:1064-1067`
- **Issue**: Lines 1064-1067 use 6-space indentation instead of 4-space.
- **Fix**: Re-indent to 4 spaces to match surrounding code.
- **Effort**: Trivial
- **Status**: TODO

### P11 — Memoize TimelineSelector `hasTime` (C4-F2)

- **Severity**: Low (perf) | **Confidence**: Medium
- **File**: `src/components/TimelineSelector.tsx:369`
- **Issue**: `points.some((p) => p.time)` runs on every render for up to 250K points.
- **Fix**: Wrap in `useMemo` keyed on `points`.
- **Effort**: Trivial
- **Status**: TODO

---

## Deferred findings (carried forward with exit criteria)

All items from cycles 1-3 carry forward unchanged:
- C3-F1 MapView.tsx monolith (Medium)
- C3-F4 exportVideo cleanup on abort (Low — now confirmed library limitation)
- C3-DS1 Architecture doc stale (Low — already P17)
- N04 Google parser worker/main dedup (Large)
- N11 Map layer ownership boundaries (Large)
- N12 Session state coupling (Medium)
- N17 Mobile toolbar dialog not modal (Medium)
- N23 RTL unreadiness (no RTL locales)
- N30-N33 Various (infrastructure-dependent)
- C13-F03 iOS Safari download fallback (Small)
- C15-F03 ErrorBoundary no error details in dev (Small)
- C15-F06 addTrackLayers called from multiple effects (Small)
- C15-F07 ElevationProfile SVG stroke width (Trivial)

**NEW DEFERRALS**:
- C4-I1 exportVideo waitForIdle signature mismatch: Info only, no action needed.
- C4-I2 smoothCameraState trivial wrapper: Info only, no action needed.
- C4-I3 mediabunny no explicit cleanup API: Library limitation, no action needed.

---

## Quality gates

After each commit:
- `npm run lint` — must pass
- `npx tsc --noEmit` — must pass
- `npm run build` — must pass
- `npm run test` — must pass
- `git commit -S` — GPG-signed with conventional commit + gitmoji

---

## Completion Status (updated after implementation)

| Item | Status | Commit | Notes |
|------|--------|--------|-------|
| P10 — Fix indentation | DONE | 829daa2 | Re-indented 4 lines from 6-space to 4-space |
| P11 — Memoize hasTime | DONE | 829daa2 | Wrapped in useMemo keyed on points; moved before early return |