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
- Cycle 10 implementation status: all seven authorized items, six gate-driven
  repairs, and the accepted final matrix are complete. The final cleanup item
  remains open. No Cycle 10 path has been deleted, and the primary repository
  plus every pre-existing/user-owned tree and process must remain untouched.
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
- Run-created exact-implementation-HEAD physical Cycle 10 full-gate copy:
  - `/tmp/travelback-cycle10-gates-copy.56BD0H`
  - Created empty for the complete gate matrix at implementation HEAD
    `94caeb91c5ae081fd8821f38303db2e63e3c349e`. It will be populated from the
    tracked commit, use isolated development/static/real-export ports 42720,
    42721, and 42722, and remain untouched until the loop's final cleanup stop
    condition. Any dependency, build, Playwright, or server process is bounded
    by its invoking gate and must be left to its natural lifecycle.
- Run-created final exact-HEAD physical Cycle 10 full-gate copy:
  - `/tmp/travelback-cycle10-final-gates-copy.xnjqnp`
  - Created empty before population for the accepted final matrix at HEAD
    `cc720a2eaafe936ae2186d282145856d71673e3c`. It will use isolated
    development/static/real-export ports 42730, 42731, and 42732 in that
    strictly sequential order. Dependency installation runs in unified exec
    session `95338` and has no listener PID. The initial final-copy lint,
    typecheck, unit, and audit gates run in unified exec sessions `80562`,
    `54013`, `15184`, and `35297`, respectively, with no listener PIDs. Later
    worker parity completed directly without a retained unified session; the
    production build runs in unified exec session `87326`, with no listener
    PID. Static smoke used port 42731 in unified exec session `62920`; its
    short-lived listener exited before a PID could be observed and the runner
    completed naturally with exit 0. The full development E2E gate uses port
    42730 in unified exec session `4105`, with observed listener PID `6154`;
    it completed naturally with exit 0 (106 passed, 1 expected skipped), and a
    post-exit read-only listener check confirmed that PID/port was gone.
    The strictly subsequent full static E2E gate uses port 42731 in unified
    exec session `62593`, with observed listener PID `66341`; it completed
    naturally with exit 0 (106 passed, 1 expected skipped), and a post-exit
    read-only listener check confirmed that PID/port was gone.
    The final isolated real-MP4 static gate uses port 42732 in unified exec
    session `66108`, with result artifacts under
    `/tmp/travelback-cycle10-final-gates-copy.xnjqnp/test-results-final-real-export`;
    its observed listener PID is `26964`. It completed naturally with exit 0
    (1 passed in 3.1 minutes); the in-browser downloaded MP4 passed the explicit
    `byteLength > 1024` assertion and exposed `ftyp` at container bytes 4–7.
    Playwright owns the downloaded file's ephemeral path and removed it with
    the completed browser context, so the persistent run artifact is the
    inventoried result tree. A post-exit read-only listener check confirmed
    that PID/port was gone.
    Final post-check lint, typecheck, unit, audit, and worker-parity commands
    run in unified exec sessions `59882`, `8640`, `10401`, `35067`, and
    `97549`, respectively, with no listener PIDs; all passed (18 unit files,
    431 tests, 0 vulnerabilities, generated worker current). No final gate
    sessions remain active. Keep this copy and all artifacts until the loop's
    final cleanup stop condition.
- Run-created exact-HEAD physical Cycle 11 browser-review copy:
  - `/tmp/travelback-cycle11-review-copy.1u08nn`
  - Created empty, after a read-only listener inventory, for the Cycle 11
    designer/non-technical-traveler review at exact source HEAD
    `7273d464fdce24fc06350ce1444c3a2e8d26829d`. Port `43117` was observed
    unused and is reserved for this copy's bounded review server. Dependency
    installation ran in unified exec session `7624` and completed naturally
    with no listener PID. The exact-HEAD production build (including generated
    worker parity) ran in unified exec session `94066`, completed naturally,
    and had no listener PID. The exact-HEAD static review server is available
    at `http://127.0.0.1:43117/travelback/` in unified exec session `18418`,
    listener PID `62893`; its wrapper owns a 30-minute bounded lifecycle and
    will terminate it naturally. Do not stop, reuse after exit, or remove this
    copy before the loop's final cleanup stop condition.
    The wrapper subsequently completed its bounded lifecycle naturally; a
    read-only post-expiry check found neither PID `62893` nor a listener on
    port `43117`. The server was not manually stopped or reused.
  - Cycle 11 browser-review sessions (against only the inventoried port
    `43117`): `cycle11-experience-desktop` and
    `cycle11-experience-mobile`. Leave both to their natural lifecycle; do not
    stop or reuse them during the active loop.
  - Planned Cycle 11 browser-review artifacts:
    `/tmp/cycle11-landing-desktop.png`,
    `/tmp/cycle11-workspace-desktop.png`,
    `/tmp/cycle11-mobile-landing.png`,
    `/tmp/cycle11-mobile-workspace.png`, and
    `/tmp/cycle11-browser-a11y-baseline.txt`. Record any additional
    `/tmp/cycle11-*` evidence path here as soon as it is known, and retain all
    of them until final-loop cleanup.
    The reviewer verified all five planned artifacts and additionally created
    `/tmp/cycle11-mobile-export-panel.png` and
    `/tmp/cycle11-mobile-export-done.png` for the exact-HEAD mobile export-panel
    and truthful locally stubbed completion-state review. Retain both; they are
    experience evidence rather than a fresh real-codec/all-format export claim.
  - `cycle11-experience-desktop` became unresponsive after opening Camera and
    is not stopped, closed, or reused. Replacement browser session
    `cycle11-experience-desktop-2` owns the remaining desktop/Journey review.
    `/tmp/cycle11-camera-desktop.png` was requested before the first session
    hung and may or may not have been materialized; retain it if present and
    recheck provenance only at final-loop cleanup.
  - `cycle11-journey-confirm` is an additional isolated browser session used
    only to obtain an unambiguous terminal reproduction after queued commands
    in `cycle11-experience-desktop-2` made its final create result unclear.
    Retain `/tmp/cycle11-journey-two-points.png`,
    `/tmp/cycle11-journey-confirm-one-point.png`, and
    `/tmp/cycle11-one-point-workspace.png`. The last capture showed two points
    and is explicitly ambiguous, so it is provenance only and must not be cited
    as proof of the one-point workspace defect.
    Visual inspection later showed that
    `/tmp/cycle11-journey-confirm-one-point.png` also captured the two-point
    confirmation state due command timing. It is provenance-only and must not
    be cited for the one-point claim; use the exact DOM probe and the confirmed
    workspace capture instead.
    `/tmp/cycle11-one-point-workspace-confirmed.png` is the later clean terminal
    capture and may be cited as the confirmed one-point workspace evidence.
    Retain `/tmp/cycle11-empty-track-crash.png` and
    `/tmp/cycle11-empty-track-after-settle.png` from the clean zero-point
    reproduction. The former filename overstates the observed result (there was
    no immediate ErrorBoundary crash), so it is provenance only; the latter is
    the accurate settled loaded-but-nonrenderable `0 / 0 locations` evidence.
  - Cycle 11 review provenance also created
    `/tmp/cycle11-review-inventory.txt` and
    `/tmp/cycle11-tracked-files.txt`; retain both until the final-loop cleanup
    stop condition.
  - `cycle11-experience-desktop-2` later became unresponsive after an Escape
    screenshot command and is likewise not stopped, closed, or reused.
    `cycle11-escape` is the clean isolated replacement session used only for an
    unambiguous focused-button Escape result. Retain
    `/tmp/cycle11-scene-escape-stays-open.png` if it materializes; it may be
    absent or incomplete from the unresponsive session and must not be cited
    until its final status is verified. The clean `cycle11-escape` session
    subsequently verified that this path materialized correctly and may be
    cited as evidence that the focused Camera button leaves the Scene Editor
    open after Escape.
  - `cycle11-sample-drop-race` is an isolated deterministic browser session
    for the reopened Cycle 2 sample invalidation edge. It delays only that
    page's same-origin sample `window.fetch`, dispatches an unsupported `.txt`
    drop, and observes whether the stale sample installs; it does not mutate
    the server or network. Retain `/tmp/cycle11-sample-drop-race.png` if it
    materializes, and cite it only after the reviewer reports the final result.
    The reviewer subsequently live-confirmed the race in this clean session:
    the unsupported-drop recovery alert remained while the older held sample
    installed `Namsan Tower Walk`, so the screenshot is verified evidence.
