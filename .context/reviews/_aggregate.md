# Cycle 9 Aggregate Review — 2026-04-19

Generated after comprehensive full-repo review of current `main` branch.

## Review lanes considered
- Fresh comprehensive review (`cycle9-comprehensive-2026-04-19.md`)
- All prior cycle reviews and aggregates reviewed for carried-forward items
- Prior deferred findings reviewed for items that should re-open

## Aggregation method
- Re-verified every prior finding against the current codebase.
- All C8 active findings confirmed FIXED in prior cycle.
- Deduped overlapping findings and kept the highest severity / confidence.
- Carried forward still-valid deferred items as-is.
- New findings from this cycle are prefixed C9-AGG.

## All cycle 8 active findings verified as FIXED

| Prior ID | Description | Fix verification |
|----------|-------------|------------------|
| C8-AGG-001 | ThemeToggle fires `onModeChange` on mount | ThemeToggle.tsx:32-49 only has `prefers-color-scheme` listener, no mount-time callback |
| C8-AGG-002 | Controls recomputes `totalDistance` | Controls.tsx:41 uses `cumulativeDistances[cumulativeDistances.length - 1] ?? 0` |
| C8-AGG-003 | MapView track-load effect stable callbacks in deps | MapView.tsx:812 deps are `[track, cumulativeDistancesProp]` with eslint-disable |

## Merged findings (active, to be addressed this cycle)

### C9-AGG-001 — MEDIUM — Export `finally` block awaits `waitForIdle` with already-aborted signal, wasting cleanup time

**Cross-agent agreement:** cycle9-comprehensive, debugger (prior cycle finding 1)
**Primary locations:**
- `src/lib/useExportController.ts:175-188`

**Why it matters:**
When the user cancels an export, `abortController.abort()` is called. The `finally` block then passes the same already-aborted signal to `waitForIdle()`, which immediately rejects. The catch swallows it, so no crash occurs. However, `resetSize()` has already been called before the idle wait, making the wait pointless on the abort path. The map container is already resized back before any idle check could succeed.

While not a crash, this is wasted async work on every cancellation path and makes the cleanup flow harder to reason about.

**Suggested fix:**
Skip the `waitForIdle` call entirely when the export was aborted. Check `abortController.signal.aborted` before calling `waitForIdle`, or simply skip the idle wait in the `finally` block since `resetSize()` + `map.resize()` handles the visual recovery.

**Confidence:** High

---

### C9-AGG-002 — MEDIUM — Toast container `role="status"` may suppress rapid sequential announcements for assistive technology

**Cross-agent agreement:** cycle9-comprehensive, designer (prior cycle finding about live-region semantics)
**Primary locations:**
- `src/components/Toast.tsx:66`

**Why it matters:**
`role="status"` has `aria-live="polite"` and `aria-atomic="true"` by default. When multiple toasts appear rapidly (e.g., export cancelled + error), assistive technology typically only announces the most recent content, missing intermediate messages. The `aria-atomic="true"` default means the entire container is announced as a unit, which can be verbose with multiple visible toasts.

**Suggested fix:**
Change the container from `role="status"` to `role="log"` with `aria-live="polite"`. `role="log"` is designed for sequential entries where new items are added over time, which matches the toast pattern. This ensures each new toast is announced individually rather than the entire container being re-announced.

**Confidence:** Medium (a11y improvement, not a functional bug)

---

### C9-AGG-003 — LOW — `parseSemanticSegments` dedup can create duplicate segment-start indices

**Cross-agent agreement:** cycle9-comprehensive
**Primary locations:**
- `src/lib/parser.ts:393-424`

**Why it matters:**
After the dedup/sort step in `parseGoogleLocationHistory`, the `adjustedSegStarts` remapping can map two different original segment-start indices to the same deduplicated index, creating duplicate segment starts. The `.filter(idx => idx > 0)` at line 424 removes index 0 but does not deduplicate positive indices. Downstream code (`normalizeSegmentStarts` in MapView) handles this via `new Set(...)`, but the data itself is impure.

**Suggested fix:**
Deduplicate `adjustedSegStarts` before returning:
```ts
const dedupedSegStarts = [...new Set(adjustedSegStarts)]
```

**Confidence:** Medium (cosmetic, downstream handles it)

---

## Carried-forward deferred items (not re-opened this cycle)

These remain in their existing files and are NOT scheduled for this cycle:

From `deferred-findings-cycle1-2026-04-19.md`:
- DF-C1-001: Mobile information architecture and discoverability polish
- DF-C1-002: Broad maintainability/performance restructuring

From `deferred-findings-cycle2-2026-04-19.md`:
- DF-C2-001: Mobile information architecture gaps
- DF-C2-002: Playback progress drives whole-app rerenders (HIGH/HIGH — still the most impactful perf issue)
- DF-C2-003: Large GPX/KML imports parse on main thread
- DF-C2-004: Manual route dragging is O(n) on pointer move
- DF-C2-005: Export settings permit browser-hostile combinations
- DF-C2-006: Locale/help content eagerly bundled
- DF-C2-007: Large default variable font payload
- DF-C2-008: E2E suite serialized and sleep-heavy
- DF-C2-009: Residual CSP allows inline styles
- DF-C2-010: Local-only bundled styles ship without real basemap layer

From cycle 4:
- DF-C4-001: `preserveDrawingBuffer: true` always on, wasting GPU resources

From cycle 5:
- DF-C5-001: TrackToolbar mobile menu focus trapping (partially addressed by C7-AGG-003 — added ARIA roles, but not full focus trap)

## Items verified as already fixed or not actual issues

| Prior ID / Area | Description | Why closed |
|----------|-------------|------------|
| C9-001 | Export codec cache staleness across sessions | Cache is populated per-session from live probe; cross-session staleness is an extreme edge case with no practical impact |
| C9-003 | `handleRangeChange` segment index trimming | Verified correct: index 0 is not a segment start by definition |
| C9-006 | Controls step={0.001} | 1000 steps is reasonable for the playback duration range |
| C9-007 | exportTrack scenes closure | Correct behavior: mid-export scene changes should not affect running export |

## Recommended implementation order for this cycle

1. **C9-AGG-001 (MEDIUM)**: Skip `waitForIdle` in export finally block when aborted — cleaner cleanup path
2. **C9-AGG-002 (MEDIUM)**: Change Toast container from `role="status"` to `role="log"` — better a11y for sequential toasts
3. **C9-AGG-003 (LOW)**: Deduplicate `adjustedSegStarts` in parser — data purity
