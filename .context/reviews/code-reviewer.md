# Code Reviewer — Deep Review (Cycle 2, 2026-07-16)

## Inventory and coverage

Reviewed the complete current nonhistorical surface at cc6f24f, with focused comparison across df8f08a..cc6f24f: 110 tracked paths comprising 50 src files, 18 E2E files/fixtures, 19 public assets, 7 scripts, the Pages workflow, package manifest/lock, 7 tool configs, README/.gitignore, and 4 active context documents. Generated out output was inspected only as build evidence; dependencies and historical plan/review archives were inventoried but excluded from source findings. Cross-file traces covered import/session replacement, timeline coordinate conversions, scene mutations, MapLibre sources, export/finalization, sharing, static hardening, and test coverage.

Validation on this head: npm run lint, npm run typecheck, 266/266 unit tests, npm audit --audit-level=high (zero vulnerabilities), npm run build, generated-worker drift check, and npm run smoke:static all passed. Full browser matrices were not rerun in this timeboxed review; the cycle-1 implementation record reports 82 development-static and 82 production-static cases passing plus a real MP4 smoke.

Status terms: Confirmed means the defect follows deterministically from current control flow or emitted output. Likely means the missing boundary is confirmed but the external/browser failure needs a targeted reproduction.

## Findings

### CR2-01 — Sample loading can overwrite a newer manual-journey session

Severity: Medium | Confidence: High | Status: Confirmed race

Evidence: src/app/page.tsx:374-397 owns sample fetch and parsing without an AbortController or session generation. src/components/FileUpload.tsx:215-240 invokes that async callback without entering its loading state, while src/components/FileUpload.tsx:288-299 leaves Draw Route enabled. The FileUpload cancellation added in cycle 1 covers only imports started inside FileUpload, not this parent-owned request.

Failure scenario: click the sample preview, immediately choose Draw Route, and begin placing points. When the earlier fetch/parse resolves, page.tsx:388 calls loadTrackIntoSession and replaces the newer journey.

Fix: give all asynchronous session producers a shared generation/abort boundary. Starting a journey, choosing another file, or loading another sample must invalidate the old sample completion. Add a deferred-fetch regression test analogous to FileUpload.test.ts:38-82.

### CR2-02 — The timeline enforces a point-count gap in distance-ratio space

Severity: Medium | Confidence: High | Status: Confirmed correctness defect

Evidence: TimelineSelector.tsx:27-31 defines handle ratios as fractions of distance, but TimelineSelector.tsx:95-105 sets their minimum gap to 1/(pointCount-1). TimelineSelector.tsx:261-275 converts the result back through cumulative distances. TimelineSelector.test.ts:38-45 tests only evenly spaced/index-like ratios.

Failure scenario: for cumulative distances [0, 1, 1000], selecting indexes 0..1 requires an end ratio near 0.001. The three-point clamp forces at least 0.5, which resolves to index 2, so the valid adjacent pair cannot be selected.

Fix: enforce the two-point invariant after resolving indexes, or snap handles to cumulative-distance positions for adjacent indexes. Add uneven-spacing and segment-plateau round trips.

### CR2-03 — Export finalization has no deadline and cannot be cancelled

Severity: Medium | Confidence: High | Status: Confirmed missing bound; a fresh stall is Likely

Evidence: videoEncoder.ts:65-69 deliberately skips cancel once Mediabunny enters finalizing; videoEncoder.ts:232 awaits output.finalize with no timeout or signal race. useExportController.ts:125-127 only aborts the signal, and ExportPanel.tsx:322-330 presents that as a Cancel action. The cycle-1 implementation record documents a Chromium encoder flush stall that required frame rematerialization, demonstrating that this class of wait is not hypothetical.

Failure scenario: if codec flush/finalize stalls on another browser, driver, or input, Cancel and Escape only flip an AbortSignal that finalize never observes. isExporting remains true indefinitely and the map stays export-sized.

Fix: impose a bounded finalization watchdog with a distinct localized error and move encoding behind a terminable worker/process boundary if the library cannot interrupt finalization itself. Test a never-resolving finalize promise.

### CR2-04 — Delete undo still rewrites a later scene-range edit

Severity: Medium | Confidence: High | Status: Confirmed lost update

Evidence: SceneEditor.tsx:382-390 reinserts the deleted scene into current state, but then calls commitScenes. commitScenes at SceneEditor.tsx:297-335 calls normalizeScenes; camera.ts:25-49 raises each later start to the previous scene end. The E2E at e2e/travelback.spec.ts:1232-1247 verifies only a later name edit.

Failure scenario: delete middle scene B [0.15,0.30], change later C start from 0.30 to 0.25, then undo B. Normalization silently moves C back to 0.30, reversing the newer range edit while preserving its name.

Fix: define conflict-aware inverse semantics. Either invalidate undo after an overlapping range edit, restore B only into an available gap, or ask before normalizing newer work. Extend E2E to cover later range and camera edits.

### CR2-05 — Timeline keyboard guard suppresses unrelated controls for three seconds

Severity: Medium | Confidence: High | Status: Confirmed accessibility defect

Evidence: TimelineSelector.tsx:22-23 selects Arrow/Home/End keys; TimelineSelector.tsx:141-153 installs a capturing window listener; TimelineSelector.tsx:345-354 arms it for three seconds after a timeline key. Any target outside the timeline is prevented and propagation-stopped during that window.

Failure scenario: adjust a trim handle, Tab to another slider/input, and press ArrowLeft within three seconds. The unrelated control never receives the key.

Fix: remove the global time window and keep suppression at the timeline handle event boundary. If a framework-specific leaked event must be guarded, tie it to the exact event/target rather than all subsequent keys.

### CR2-06 — Scene range drag has no pointer-cancellation boundary

Severity: Low | Confidence: High | Status: Confirmed lifecycle gap

Evidence: SceneEditor.tsx:124-181 listens for window pointermove and pointerup only. It does not handle pointercancel, lost pointer capture, or window blur.

Failure scenario: the OS/browser cancels a touch/stylus gesture. dragging remains true and a later pointer move can continue editing from the stale origin; the final commit may never run.

Fix: use pointer capture and route pointerup, pointercancel, lostpointercapture, and blur through one idempotent finish/cancel routine.

### CR2-07 — Share can silently do nothing for the actual MP4

Severity: Low | Confidence: High | Status: Confirmed control-flow defect; size-dependent trigger is Likely

Evidence: ExportPanel.tsx:191-203 decides button visibility by calling canShare with a one-byte test file. ExportPanel.tsx:176-189 calls canShare again with the real MP4, but when it returns false there is no fallback and shareError remains false.

Failure scenario: a platform accepts the tiny capability probe but rejects the exported file because of size or platform limits. The visible Share button produces no share sheet and no feedback.

Fix: treat false for the actual file as an error/fallback, hide or disable the button after that result, and provide the existing download action plus localized explanation.

## Missed-issue sweep

Rechecked every changed source/config/test/doc path, stale async completions, abort/finally blocks, coordinate domains, global listeners, generated-worker ownership, and current tests. No additional new confirmed code defect met the evidence threshold. Known CI permissions/unit-gate and license issues remain current but are assigned to security/critic and retain their explicit authorization/input blocks.
