# Cycle 11 Implementation Plan — 2026-04-27

Based on cycle 11 aggregate review at `.context/reviews/_aggregate.md`.
6 deduplicated findings (1 MEDIUM, 3 LOW, 2 INFO).

## Status of prior plan items (cycle4-implementation-2026-04-27.md)

All prior plan items (4P01-4P08) are DONE. Cycles 5-10 did not produce new implementation plans in this directory.

## New plan items from cycle 11 reviews

---

### 11P01 — Fix `parseXml` execution order to restore DOCTYPE rejection (C11-F01)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/parser.ts:188-198`, `src/lib/parser.test.ts`
- **Fix:**
  1. In `parseXml()`, swap the execution order: call `preflightXml(text, formatName)` on the raw input BEFORE `stripXmlEntities(text)`. This restores the defense-in-depth model where rejection is the primary guard and sanitization is the fallback.
  2. Update the comment to reflect the correct ordering: "Reject first, then sanitize as defense-in-depth."
  3. Verify the 2 failing vitest tests (`parseGPX — DOCTYPE rejection` and `parseKML — DOCTYPE rejection`) now pass.
- **Effort:** Tiny
- **Status:** DONE (39650f4)

---

### 11P02 — Add global drag listener cleanup in JourneyCreator (C11-F02) — FALSE POSITIVE

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/JourneyCreator.tsx:433-450`
- **Resolution:** On closer inspection, the drag listeners are `map.on('mousemove', ...)` / `map.on('mouseup', ...)` (map-level, not `document`-level). The cleanup function at lines 440-444 already calls `map.off('mousemove', onMouseMove)`, `map.off('mouseup', onMouseUp)`, `map.off('touchmove', onTouchMove)`, `map.off('touchend', onTouchEnd)`, `map.off('touchcancel', onTouchEnd)`. All drag listeners are properly cleaned up. No fix needed.
- **Effort:** N/A
- **Status:** NOT A BUG

---

## Deferred findings (unchanged from prior cycles)

| ID | Issue | Reason for deferral | Exit criterion |
|----|-------|---------------------|----------------|
| C3-03 | Google parser duplication | Large refactor requiring worker build changes | Extract shared module |
| C3-06 | Scene normalization mutates intent | Product decision on undo/versioning | Store raw scenes |
| C3-07 | Map layer ownership | Architectural refactor | Replace getMap() with overlay APIs |
| C3-08 | Session state coupling | Requires `useTrackSessionController` reducer | Extract session reducer |
| C3-09 | Export memory guard | Needs mobile-specific investigation | Lower limit for mobile |
| C3-10 | Worker crash 16MB fallback | Known browser limitation | Accept or raise threshold |
| C3-11 | Mobile dialog semantics | Accessibility fix, not correctness | Reuse ModalDialog |
| C3-13 | No test for isExporting guard | Requires component test infrastructure | Add after parser tests |
| C3-14 | isExporting implicit contract | Architectural pattern | Consider state machine |
| C3-16 | ExportError consistency | Low priority, pattern already established | Already uses ExportError |
| C3-18 | Trail update strategy split | Low risk, needs test coverage | Add parity test |
| C3-19 | RTL unreadiness | No RTL locales currently | Set dir attribute |
| C10-F01 | handleLoadSample tRef pattern | Low-medium, optimization | Use tRef in callback |
| C10-F04 | Time-based export throttle | Low-medium, optimization | Replace delta with time interval |
| C10-F06 | Antimeridian unit tests | Low-medium, test coverage | Add test fixtures |
| C11-F03 | Export abort double-check | No bug, flow correct | No action needed |
| C11-F04 | Export throttle (same as C10-F04) | See C10-F04 | See C10-F04 |
| C11-F05 | Diminishing returns on deferred review | Process improvement | Accept as known debt |
| C11-F06 | ExportPanel swipe check (resolved) | Already fixed | No action needed |

## Implementation order

1. **11P01** — Fix `parseXml` execution order (MEDIUM, tiny) — fixes broken CI gate
2. **11P02** — JourneyCreator drag cleanup (LOW, small)

## Quality gates

After each commit:
- `npm run lint` — must pass (0 errors)
- `npx tsc --noEmit` — must pass
- `npm run build` — must pass
- `npx vitest run` — must pass (currently 2 failures, fixed by 11P01)
- `git commit -S` — GPG-signed with conventional commit + gitmoji
