# Cycle 3 Debugger Review

Review target: `3b6750f`

## Confirmed runtime defects

### C3-PR-001 — Medium / High confidence — timeline drag survives `touchcancel`

Causal trace:

1. `startDrag` stores `dragging`, `originX`, accepted origin ratios, and the last client X at `src/components/TimelineSelector.tsx:368-381`.
2. `touchmove` schedules ratio mutation through RAF at `:335-347,416-418`.
3. The only touch terminal listener is `touchend` at `:419-424`; `touchcancel` and window blur do nothing.
4. The stale `dragging` value therefore accepts the next window-level `touchmove`; its unrelated `touchend` enters `endDrag`, resolves indices, and calls `onRangeChange` at `:383-411`.

Runtime trace at 390×844:

| Step | End handle | Loaded trip |
|---|---:|---:|
| Before drag | 100% | 20/20 locations |
| Move, then `touchcancel` | 68% | 20/20 locations |
| Unrelated map gesture ends | 16% | 5/20 locations |

The fix needs a true cancel path, not reuse of `endDrag`: cancel pending RAF work, restore the origin/last committed ratios, clear `dragState`, `dragMovedRef`, and `lastDragClientXRef`, and do not invoke `onRangeChange`. Attach it to `touchcancel` and blur, or consolidate on pointer capture plus `pointercancel`.

### C3-PR-002 — Low / High confidence — export swipe survives `touchcancel`

`touchStartRef` is armed only from the sheet header at `src/components/ExportPanel.tsx:116-123` and consumed at `:124-133`. The wrapper wires only `onTouchStart` and `onTouchEnd` at `:235`. After a cancelled header touch, a later cross-boundary touch can reach the wrapper only at `touchend`; the stale delta passes the close threshold and invokes `onClose`.

The focused reproduction changed the Export dialog from visible to closed after header `touchstart` → `touchcancel` → a later touch beginning outside the sheet and ending on the header 170px lower. Clear the ref on `touchcancel`, close, and unmount.

## Non-debug findings cross-referenced

- C3-PR-003 is a state-specific recovery-copy defect, not an export-controller failure: the encoded blob and Download MP4 link remain available.
- C3-PR-004 is a localization-editing defect.

## Final sweep

No page exceptions or console errors occurred in the fresh manual flow, and all seven representative import checks passed. No additional runtime root cause was confirmed.
