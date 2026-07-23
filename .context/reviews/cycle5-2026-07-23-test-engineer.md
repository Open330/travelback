# Cycle 5 Test Engineer Review — 2026-07-23

Reviewed exact revision `97f66a63b3df97bce3f349a05248ebb8fef7886e`
on `review-plan-fix/no-deploy-20260723`.

## Outcome

**No genuinely new actionable Cycle 5 test-engineering finding remains.**

The current 40-test supervisor suite still has the exact real-Chromium
profile-lock assertion failure already recorded in the Cycle 4 completion
plan. Per Cycle 5 deduplication policy, that is retained below as a required
gate correction and is **not** assigned a new finding ID or added to the
Cycle 5 finding count. The three explicit native/host-capability boundaries
also remain excluded.

## Repository and coverage inventory

- Inventoried all 66 tracked files under `src/`: 41 production/style/assets
  files and all 25 Vitest suites. Coverage included the app/session shell,
  every component, parser and generated worker, interpolation/camera/map
  geometry, rendering/export hooks, video/MP4 helpers, i18n, shared types, and
  CSS.
- Inventoried all 12 tracked `scripts/` files, including both supervised E2E
  launchers, the process supervisor and its 40-test suite, all three fixtures,
  worker generation, static hardening/server/smoke, and map-style generation.
- Inventoried both E2E TypeScript files and all 19 route fixtures. The
  Playwright spec contains 116 declared journeys, including the isolated real
  MP4 lane.
- Reviewed `package.json` and lockfile, Vitest, both Playwright configs,
  TypeScript, ESLint, Next, PostCSS, Pages workflow, all 19 public assets, five
  bundled map-style documents, `README.md`, current `.context` rules/project
  docs, plan index, Cycle 4 plan/aggregate, Cycles 1–3 aggregates from history,
  and relevant Cycle 4 implementation commits.
- Browser-free evidence passed: `npm run test:unit -- --reporter=dot` reported
  **25 files / 565 tests**, `npm run check:worker` reported the generated
  worker current, all five map-style JSON documents parsed, documented npm
  script references resolved to package scripts, and `git diff --check`
  passed.

## Known Cycle 4 P05 gate residue — not a new finding

Location:

- `scripts/e2e-process-supervisor.test.mjs:555-558`
- nested lock discovery at
  `scripts/fixtures/real-chromium-failure.mjs:40-53`
- intended release and post-cleanup proof at
  `scripts/e2e-process-supervisor.test.mjs:561-613`
- prior record at
  `.context/plans/cycle4-implementation-2026-07-23.md:330-338`

The fixture deliberately discovers profile locks recursively, but the test
requires every returned lock to be a direct child of `profileDirectory`:

```text
actual:   .../chromium-profile/Default/shared_proto_db/LOCK
expected: .../chromium-profile
```

Consequently the current suite reports **39 passed / 1 failed** at line 557.
The assertion fires before the listener check, deliberate nonzero release,
and primary post-cleanup assertions. This is the same P05 residue already
recorded by Cycle 4, not a fresh supervisor root.

Required gate correction: prove every captured lock is canonically contained
inside the exact fixture-owned profile instead of requiring a direct parent;
retain pre-removal existence checks and the exact identity, marker, listener,
profile, lock, and unrelated-sentinel assertions. An independent post-fix
auditor must run the focused real-Chromium case and all 40 supervisor tests,
then verify the exact owned PID/UID/start-token/marker identities, listener
port, profile/locks, and sentinel identity. A green synthetic subset is not a
substitute.

## Accidental browser-run evidence and hygiene error

The intended no-match command was:

```text
node --test --test-name-pattern='^$' scripts/e2e-process-supervisor.test.mjs
```

In this invocation Node executed all 40 tests rather than filtering them.
Because the command was expected to execute no test body, **no pre-run
process/listener/profile inventory was taken**. That is a review-execution
hygiene error and must be surfaced in the cycle report. No second browser run
was attempted.

The failure occurred before the test emitted its diagnostic line, so the
ephemeral ownership-marker value, owned PID list, and listener port were not
captured. The exact observed fixture root was:

```text
/var/folders/kz/t1c9x6qj5zgb2sg_4lv0nh900000gn/T/travelback-real-chromium-zo8NRF
```

Its `finally` block completed without a cleanup or aggregate error. Independent
post-run read-only checks established:

- the exact fixture state/profile root is absent;
- no `TRAVELBACK_E2E_OWNER=real-chromium-*` identity remains;
- no matching real-Chromium fixture or sentinel temporary root remains;
- ports 3099, 4173, and 4183 have no listener;
- `.next/dev/lock` is absent;
- the worktree remained clean.

These observations establish cleanup after this accidental run, but they do
not replace the missing pre-run inventory or the required post-fix audit.

## Final missed-issues sweep

Rechecked skip/retry masking, unit/E2E script reachability, generated-worker
parity, parser lexical regressions, multi-wrap renderer/tiler regressions,
export lease settlement, provisional-camera restoration, localized MP4
recovery, responsive Journey ownership, process contract/error precedence,
provider rollback/disposal, and exact cleanup boundaries.

No additional current-HEAD failure or material untested contract survived
deduplication against Cycles 1–4 and the historical authority/evidence
boundaries.
