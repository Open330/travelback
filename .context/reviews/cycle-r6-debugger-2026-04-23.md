## Cycle r6 — Debugger

Failure-mode scans against HEAD `0000000b72`.

### DB-1 (LOW, HIGH) — `FileUpload` drag state can briefly flicker under a rare leave-then-freeze user path

Trace in T-2: `handleDragOver` does not cancel `dragEndTimerRef`. If a user's pointer re-enters the drop zone and then holds perfectly still for 200ms (no dragover events), the scheduled `setIsDragging(false)` fires and the zone visually resets. The next dragover tick will flip it back to true, but there's a one-frame flicker.

Evidence: `src/components/FileUpload.tsx:111-114`. Real-world this is extremely rare (dragover fires on every mouse movement, and the timer is 200ms). Prescription: in `handleDragOver`, also cancel any pending drag-end timer. One-line defensive fix.

Actually, checking the wider design: `handleDragOver` triggers on every movement, so if the user is dragging, they are moving. The scenario requires the user to lift fingers on a trackpad without leaving. Not plausible.

No schedule. Confidence HIGH.

### DB-2 (INFO, HIGH) — TrackToolbar single-ref outside-click posture

`src/components/TrackToolbar.tsx:58-61`. Outside-click check via `menuRef.current?.contains(event.target as Node)`. Trigger button + menu panel both live inside the wrapper. Clicking elsewhere closes. Trace closes. No bug.

### DB-3 (LOW, MEDIUM) — `useFocusFirstOnOpen` focuses on panel open by querying first `<button>` descendant

`src/components/TrackToolbar.tsx:11-17`. When menu opens, focuses the first `<button>`. With the current menu order (New Route → Map style → Help), that's fine. If a panel is refactored to start with a non-button focusable (e.g. a search input), the focus target changes. Not a bug today — but the helper is implicitly coupled to the first focusable being a button. Worth noting.

No schedule.

### DB-4 (LOW, HIGH) — `ErrorBoundary.handleReset` relies on the div key remount

`src/components/ErrorBoundary.tsx:33-34, 70`. Handler increments `resetKey`; render uses `<div key={this.state.resetKey}>{this.props.children}</div>`. If anyone removes the `key` attribute, handleReset silently stops reseting. Already called out in critic CT-5. No code change; add comment.

No schedule.

### DB-5 (INFO, HIGH) — `ExportPanel` codec probe async → no guard if `onClose` fires mid-probe

`src/components/ExportPanel.tsx:106-129`. The cleanup flag `cancelled` prevents `setCodecSupport` after unmount. Good. Closing while probing cancels correctly.

### DB-6 (INFO, HIGH) — `JourneyCreator` map listeners lifecycle

`src/components/JourneyCreator.tsx:382-398`. All listeners removed in cleanup. `dragPan.enable()` also called on cleanup regardless of state → safe idempotent. Trace clean.

---

Nothing blocking. No new schedule from the debugger lane.
