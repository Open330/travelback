# Cycle 11 Tracer — 2026-04-27

## Traced flows

### T11-01 — GPX DOCTYPE rejection flow

**Trace:** `parseGPX(text)` -> `parseXml(text, 'GPX')` -> `stripXmlEntities(text)` (removes `<!DOCTYPE...>`) -> `preflightXml(safeText, 'GPX')` (checks for `<!DOCTYPE` in already-stripped text — never found) -> `DOMParser.parseFromString(safeText, 'application/xml')` -> returns parsed document without error.

**Result:** DOCTYPE-bearing XML is accepted, not rejected. The `preflightXml` rejection guard is dead code for simple DOCTYPE declarations.

### T11-02 — Export abort flow

**Trace:** User clicks cancel -> `cancelExport()` -> `exportAbortRef.current.abort()` -> In `exportVideo` frame loop, `signal?.aborted` check fires at top of loop -> throws `DOMException('Export cancelled', 'AbortError')` -> caught by `useExportController` catch block -> `if (error instanceof DOMException && error.name === 'AbortError')` -> shows cancellation toast -> finally block runs `resetSize()` and restores playback progress.

**Result:** Abort flow is correct and complete.

### T11-03 — Worker crash fallback for large files

**Trace:** Large file (>16MB, <100MB) -> `parseGoogleLocationHistoryInWorkerBuffer` -> `buffer.slice(0)` fails (buffer too large for `MAIN_THREAD_JSON_FALLBACK_SIZE`) -> `fallbackBuffer = null` -> worker created -> `worker.postMessage({ ext: 'json', buffer }, [buffer])` -> worker crashes (OOM) -> `worker.onerror` fires -> `fallbackBuffer` is null -> rejects with `WORKER_FAILED` error including helpful message.

**Result:** Flow is correct. Large file worker crashes produce actionable error messages.

### T11-04 — JourneyCreator drag cleanup flow

**Trace:** User starts dragging waypoint -> `startDrag(index)` sets `draggingIndexRef.current` and attaches `mousemove`/`mouseup` listeners -> User clicks "Cancel" to close JourneyCreator -> cleanup function runs -> removes map-level listeners (`click`, `mousedown`, etc.) and clears `draggingIndexRef` -> BUT global `mousemove`/`mouseup` listeners from the drag are NOT explicitly removed in cleanup -> They remain until the next `mouseup` event fires `stopDrag()` -> Potential stale `updateDraggedPoint` call.

**Result:** Minor issue — drag handlers can fire one more time after cleanup. Low risk since map sources are already removed.
