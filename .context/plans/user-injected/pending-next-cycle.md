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
- These paths are run-created only. Do not infer that similarly named or
  pre-existing trees are safe to remove.
- No listed path is deleted during Cycle 6. Remove only at the loop's final
  stop condition, after re-verifying provenance and primary-worktree health.
