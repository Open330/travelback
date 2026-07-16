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
- These paths are run-created only. Do not infer that similarly named or
  pre-existing trees are safe to remove.
