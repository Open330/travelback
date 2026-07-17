# User-injected TODOs (pending for the next cycle)

Items queued while the review-plan-fix loop was running. Each item lists the
user's wording verbatim, when it was injected, and how it should be honored.
The orchestrator feeds these items into the next cycle's PROMPT 1/PROMPT 2 as
explicit user-injected TODOs so they flow through review → plan → implement
like any other finding, and do not skip review.

Historical user-injected items from earlier review-plan-fix runs have been
archived into their respective cycle implementation plans once addressed.

---

## U-2026-07-17-01 — Final cleanup of run-created trees

- Injected during: cycle 5 PROMPT 3
- User wording (verbatim): “지금 많은 tree 만들어져있는데 모두 잘 정리하고 마무리해 끝날때.”
- Routing: ingest in the next cycle plan and retain as an end-of-run cleanup
  requirement. Do not interrupt the active implementation cycle.
- Cycle 6 status: ingested into `cycle6-implementation-2026-07-17.md` and
  retained for the loop's final stop condition. This item is not complete and
  must remain durable across later cycles.
- Scope: identify and remove only temporary worktrees, validation mirrors, and
  copied trees created by this review-plan-fix run. Preserve pre-existing/user
  worktrees and repository data. Perform cleanup only when the loop reaches its
  final stop condition, then verify the primary worktree remains clean and
  usable.
- Run-created validation mirrors recorded during cycle 5:
  - `/tmp/travelback-cycle5-recovery.KMkGf7` (remove only if it still exists;
    the operating system may already have cleaned it automatically)
  - `/tmp/travelback-cycle5-recovery.x0nOJV` (remove only if it still exists;
    the operating system may already have cleaned it automatically)
  - `/Users/hletrd/flash-shared/Travelback-cycle5-recovery.3ZvbIj`
- Run-created validation mirrors/artifacts recorded during cycle 6:
  - `/tmp/travelback-cycle6-browser.tMtY4J`
  - `/tmp/travelback-cycle6-static.10O3N4`
  - `/var/folders/kz/t1c9x6qj5zgb2sg_4lv0nh900000gn/T/next-panic-77834f04e42c1f49ba6c236505512ebd.log`
  - `/tmp/travelback-cycle6-focused.0jw7ns`
  - `/tmp/travelback-cycle6-gates.IzOqfp`
- Run-created browser-review artifact recorded during cycle 7:
  - `/tmp/travelback-cycle7-browser-state.json`
  - `/tmp/travelback-cycle7-a11y-baseline.txt`
  - `/tmp/travelback-cycle7-static-server.mjs`
  - `/tmp/travelback-cycle7-focused.Im7MbJ`
  - `/var/folders/kz/t1c9x6qj5zgb2sg_4lv0nh900000gn/T/next-panic-35199d5637ccdb78dc5bc086890c807f.log`
  - `/tmp/travelback-cycle7-focused-copy.8mgPDR`
  - `/tmp/travelback-cycle7-gates.Osfw8C`
- These paths are run-created only. Do not infer that similarly named or
  pre-existing trees are safe to remove.
- No listed path is deleted during Cycle 6. Remove only at the loop's final
  stop condition, after re-verifying provenance and primary-worktree health.
- Cycle 8 status: ingested into `cycle8-implementation-2026-07-17.md` and
  retained for the loop's final stop condition. Cycle 8 review created no new
  temporary filesystem path. This item remains incomplete.
- Run-created validation mirror recorded during cycle 8:
  - `/tmp/travelback-cycle8-gates.6rt2wr`
  - `/var/folders/kz/t1c9x6qj5zgb2sg_4lv0nh900000gn/T/next-panic-bf60c17b5b8689ba538a03942566ec45.log`
  - `/tmp/travelback-cycle8-gates-copy.UhGz9D`
- Run-created isolated Cycle 9 UX review workspace/artifact root:
  - `/tmp/travelback-cycle9-ux-review`
  - Review helper context: the exact-HEAD static bundle under this root is
    served by this review's own `scripts/serve-static.mjs` process on isolated
    port `48179` (unified exec session `6306`). Leave it to the bounded session
    lifecycle; do not reuse, stop, or kill it manually.
- Run-created physical Cycle 9 focused-E2E copy:
  - `/tmp/travelback-cycle9-focused-copy.H60PO9`
  - Created after the primary worktree correctly refused a second Next dev
    server because its pre-existing lock belongs to PID `80360` on reserved
    port `3106`. Do not reuse, stop, or kill that process; all later Cycle 9
    browser work runs from isolated copies and ports.
- Run-created replacement physical Cycle 9 focused-E2E copy:
  - `/tmp/travelback-cycle9-focused-copy2.CRIVQB`
  - Created without deleting the first copy after its naturally terminated
    Playwright server left a `.next/dev/lock`; do not remove either copy until
    the loop's final cleanup stop condition.
- Run-created physical Cycle 9 marker-E2E copy:
  - `/tmp/travelback-cycle9-marker-copy.5RJg4F`
  - Created for the post-fix decorative marker accessibility regression; keep
    it until the loop's final cleanup stop condition.
- Run-created exact-HEAD physical Cycle 9 full-gate copy:
  - `/tmp/travelback-cycle9-gates-copy.I4umWo`
  - Created from implementation HEAD `e193e94` for the complete configured
    gate matrix; keep it until the loop's final cleanup stop condition.
- Cycle 9 status: ingested into `cycle9-implementation-2026-07-17.md` and
  retained for the loop's final stop condition. Every Cycle 9 temporary path
  remains inventoried; none was deleted, and this cleanup item remains open.
- Run-created Cycle 10 browser-review setup paths:
  - `/tmp/travelback-cycle10-review-0p2TE2`
    - Exact-HEAD browser copy attempt created by the Cycle 10 experience
      reviewer. Its unified exec session `23708` exited naturally after
      Turbopack rejected the out-of-root `node_modules` symlink. It was not
      stopped or deleted.
  - `/tmp/travelback-cycle10-review-zXT6qY`
    - Physical exact-HEAD archive at commit `3d74754369d22ad1bb9e7970634e0f0163d5b777`
      for the Cycle 10 browser review. Isolated dependency installation runs
      in unified exec session `88975`. Its exact-HEAD review server is live at
      `http://127.0.0.1:4177` in unified exec session `94145`, listener PID
      `41643` (launcher PID `41617`, worker PID `42406`); the initial `/`
      request returned HTTP 200 after compilation.
      Do not stop, reuse, or delete this workspace or either process context
      during the active loop.
  - `/tmp/travelback-cycle10-verify-0ihDrO`
    - Physical exact-HEAD verification copy used for isolated lint, typecheck,
      worker-parity, unit, production-build, and focused browser gates.
- Cycle 10 experience-review browser sessions against the existing isolated
  `http://127.0.0.1:4177` server:
  - `cycle10-experience` — original desktop interaction session; it remained
    stuck after an upload and was not stopped or reused.
  - `cycle10-experience-2` — replacement desktop interaction session.
  - `cycle10-mobile` — iPhone 15 emulation session used for viewport and
    bottom-stack geometry. The emulation reported a zero-pixel
    `safe-area-inset-bottom`, so it does not establish real-device notch or
    dynamic-browser-chrome behavior.
  - `cycle10-localization` — replacement session used to verify the localized
    UI around a Google Records import.
  - These are browser session identifiers rather than additional filesystem
    paths or listener processes. Leave them to their natural session lifecycle;
    do not stop or reuse them during the active loop.
- Cycle 10 experience-review verification artifacts:
  - `/tmp/cycle10-landing-desktop.png` — desktop landing-state capture.
  - `/tmp/cycle10-workspace-desktop.png` — desktop loaded-workspace capture.
  - `/tmp/cycle10-scene-endpoints.png` — expanded Scene Range endpoint geometry
    capture used to reject the clipping hypothesis.
  - `/tmp/cycle10-mobile-loaded.png` — iPhone 15 emulation loaded-workspace
    capture used for viewport/bottom-stack measurements.
  - `/tmp/cycle10-localized-google.png` — exact-HEAD Korean Google Records
    import screenshot confirming the visible/live-status English fallback name.
  - `/tmp/cycle10-mobile-journey.png` — iPhone 15 emulation screenshot of the
    Journey Creator Cancel control measuring about `20.75×44.09px`.
  - `/tmp/cycle10-sample-trace.json` — approximately 130 MB focused browser
    trace captured during the exact-HEAD review.
  - Unified exec session `75701` — focused retries-disabled exact-HEAD Chromium
    matrix of 13 landing/import/journey/export cases against the already
    inventoried isolated server on port `4177`. Leave the session to its
    bounded natural lifecycle; do not stop, reuse, or delete it.
- Cycle 10 status: the final cleanup item remains open. No Cycle 10 path has
  been deleted, and the primary repository plus every pre-existing/user-owned
  tree and process must remain untouched.
- Run-created physical Cycle 10 focused-verification copy:
  - `/tmp/travelback-cycle10-focused-copy.Q5iIz7`
  - Created empty before the first Cycle 10 fix verification, then populated
    from the tracked tree plus the candidate playback patch so the incomplete
    primary `node_modules` tree is not mutated. Later Cycle 10 candidate files
    are overlaid into this same run-owned copy without deleting or resetting
    its test artifacts. Focused browser verification uses isolated port
    `42710`; any bounded dependency/test process is left to its natural
    lifecycle. Keep this copy until the loop's final cleanup stop condition.
  - `/Users/hletrd/.npm/_logs/2026-07-17T04_04_20_957Z-debug-0.log`
    was created by the harmless initial `npm ci` attempt while this copy was
    still empty; the command exited with `EUSAGE` and changed no repository
    dependency state. Retain the log for final-loop provenance cleanup.
