# Security Review — Cycle 2 (2026-07-23)

Reviewed revision: `279f5676eb34baa4929a536fa0c20e9cbc556f34`
Branch: `review-plan-fix/no-deploy-20260723`

## Result

Three fresh, still-actionable findings survived provenance checking and the
final missed-findings sweep:

| ID | Severity | Confidence | Status |
|---|---|---:|---|
| SEC2-01 | Medium | High | Confirmed source-level ownership gap; race activation not executed |
| SEC2-02 | Low | High | Confirmed unnecessary credential exposure |
| SEC2-03 | Low | High | Confirmed gate-coverage gap; no current vulnerable package |

There are no fresh Critical or High findings. Both the full dependency audit
and the production-only audit currently report zero vulnerabilities.

## Coverage and method

The target revision contains 970 tracked files: 805 under `.context/`, 64 under
`src/`, 20 under `e2e/`, 19 under `public/`, 11 under `scripts/`, 39 under
`plan/`, one Pages workflow, and 11 top-level source/configuration files. I
inventoried the full tree, read every current authoritative `.context` document,
and used historical plans/reviews only to reject already-known or fixed
findings.

The security pass covered the full production source and its tests, all parser
and worker paths, all scripts and fixtures, both Playwright configurations,
the Pages workflow, package manifest/lock/overrides, Next/TypeScript/ESLint/
Vitest/PostCSS configuration, public styles/assets, and the public README.
Cross-file traces covered:

- untrusted file selection → main/worker parsing → normalized track → React,
  MapLibre, export, and filename sinks;
- static build → generated worker parity → HTML/CSP hardening → local preview
  path resolution → Pages artifact/deployment;
- workflow permissions → checkout credentials → npm lifecycle/build/test code;
- E2E wrapper → Playwright/server/browser descendants → signal/exit cleanup.

Read-only validation performed at this revision:

- `npm audit --omit=dev --json`: 0 vulnerabilities;
- `npm audit --json`: 0 vulnerabilities across the production and development
  graph;
- lock inspection: lockfile v3, 582 package entries including the root, no
  missing integrity values, and no non-registry tarball hosts;
- `node scripts/build-worker.mjs --check`: generated parser worker is current;
- all five external workflow actions resolve from their pinned full SHAs to the
  version comments in the workflow;
- repository-wide secret, executable-sink, storage, object-URL, worker,
  request, SVG-active-content, and runtime-network sweeps.

No browser, server, build, test suite, deployment, publication, package
mutation, process termination, or source edit was performed by this role.

## Findings

### SEC2-01 — A fast-exiting supervised root can still strand a detached descendant

Severity: **Medium**
Confidence: **High**
Status: **Confirmed source-level ownership gap; the timing scenario was not
executed because this review is read-only**

Exact regions:

- `scripts/e2e-process-supervisor.mjs:98-103,120-163,187-195,203-229,323-338`
- `scripts/e2e-process-supervisor.test.mjs:115-151`
- `scripts/fixtures/fake-process-tree.mjs:38-56`

Evidence:

- The POSIX tracker takes one initial process-table snapshot and then polls at
  100 ms (`:98-103`).
- Discovery at `:138-149` can claim a new process only while its parent PID or
  process group is still in the current live-owned sets. A detached grandchild
  has neither relationship after its root exits unless an earlier poll already
  recorded it.
- When the root wins the completion race, cleanup runs only afterward
  (`:323-338`). If the root has already disappeared and no descendant was
  recorded, `signalAndWait()` sees an empty set and reports success
  (`:187-195`).
- The orphan regression deliberately keeps the root alive for 250 ms after the
  detached grandchild announces readiness (`fake-process-tree.mjs:48-56`).
  That is longer than two polling intervals, so it cannot exercise the missed
  window.
- On Windows, `signalAndWait()` returns success as soon as the root PID is no
  longer alive (`:214-220`), and every process-tree regression is skipped on
  Windows. The code comment itself notes that the relationship is lost after
  root exit.

Concrete failure scenario:

A Playwright launcher creates a browser in its own process group and then exits
or crashes before the first inventory snapshot, or between two 100 ms
snapshots. By the time cleanup runs, the browser is reparented and its group is
not known. The wrapper returns the launcher's status while Chromium, a report
server, ffmpeg, or another worker remains alive, recreating the port/lock/CPU
contamination that the Cycle 1 supervisor was intended to eliminate.

This is not a restatement of the fixed Cycle 1 defect: signal forwarding,
bounded escalation, exact-group targeting, and the covered delayed-orphan case
are present. The residual issue is loss of ownership identity before discovery.

Recommended fix:

Give every spawned tree an inherited, unguessable ownership identity that can
still be queried after ancestry changes, or use an OS ownership primitive such
as a job/cgroup where available. Continue validating PID start identity before
signalling. Add a fixture whose root exits immediately after spawning a
detached stubborn child, vary the exit around the initial/poll snapshots, and
run equivalent process-tree coverage on Windows rather than skipping it.

### SEC2-02 — Checkout leaves an unnecessary GitHub token readable by build code

Severity: **Low**
Confidence: **High**
Status: **Confirmed configuration exposure; no token compromise observed**

Exact region: `.github/workflows/deploy-pages.yml:17-30`

Evidence:

- The build job correctly has only `contents: read`, but
  `actions/checkout@11d596...` has no `persist-credentials: false`.
- Checkout v4 persists its authentication token in local Git configuration by
  default until post-job cleanup. The action's own documentation says to set
  `persist-credentials: false` to opt out:
  <https://github.com/actions/checkout/blob/main/README.md#checkout-v4>.
- After checkout, the job runs `npm ci`, Playwright installation, lint,
  typecheck, tests, and the build. The lock marks install scripts for packages
  including esbuild and unrs-resolver, and hundreds of third-party development
  packages execute later in the job.

Concrete failure scenario:

A compromised package lifecycle script or build/test tool reads the checkout
credential from Git configuration and exfiltrates it before post-job cleanup.
The repository is public and the build token is read-only, so this does not
provide the Pages/OIDC write authority that was correctly moved to the deploy
job; those facts keep severity low. It is still a live bearer credential that
none of the subsequent steps needs.

Recommended fix:

Configure checkout as:

```yaml
- uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
  with:
    persist-credentials: false
```

Retain the current job-scoped `contents: read` permission and immutable action
pin.

### SEC2-03 — The deployment gate omits the development graph that the job executes

Severity: **Low**
Confidence: **High**
Status: **Confirmed coverage gap; current full audit is clean**

Exact regions:

- `.github/workflows/deploy-pages.yml:25-33`
- `package.json:36-48`
- `package-lock.json:19-31`

Evidence:

- `npm ci` installs the complete lock, and the workflow then directly executes
  Playwright, ESLint, TypeScript/Next, Vitest, esbuild-backed worker checking,
  and other development tooling.
- The only audit gate is
  `npm audit --omit=dev --audit-level=high`. npm documents that an omitted
  dependency type is excluded from the submitted audit payload:
  <https://docs.npmjs.com/cli/v11/commands/npm-audit/#omit>.
- A fresh full `npm audit --json` is clean, so this is not evidence of a
  presently vulnerable package.

Concrete failure scenario:

A later lock update or advisory introduces a High/Critical vulnerability in a
build or test dependency. The production-only audit remains green even though
that dependency is installed and executed and can affect the generated Pages
artifact or CI result. The artifact can proceed to upload and deployment
without the repository's high-severity gate ever evaluating that package.

Recommended fix:

Audit the graph that the job executes, preferably immediately after `npm ci`:

```yaml
- run: npm audit --audit-level=high
```

If a separate production report is useful, keep it as an additional diagnostic
rather than making it the only blocking audit.

## Positive controls and final exclusions

- The deployed runtime is a static client application with no upload/API route.
  Route files remain in the browser; bundled map styles contain no remote
  source, glyph, sprite, or tile endpoint.
- XML size/tag/depth limits, `DOCTYPE`/`ENTITY` rejection, JSON/point budgets,
  worker message validation, abort handling, and React text rendering limit the
  principal file-parser attack paths. No user-controlled HTML sink was found.
- CSP hardening hashes literal script/style bodies, rejects placeholder policy,
  precedes active head content, and is checked by static smoke logic.
- The preview server binds to loopback by default and validates real paths,
  opens with `O_NOFOLLOW` where available, compares descriptor device/inode
  identity, and streams from the validated descriptor. No remaining
  symlink/traversal/TOCTOU finding survived review.
- Workflow permissions are now split by job and every external action is
  immutable-SHA pinned. No tracked secret or credential was found.
- Six extraneous optional WASM packages in this workspace's existing
  `node_modules` are the unchanged, previously documented local-install
  residue, not a tracked lock defect.
- The three explicit Cycle 1 deferrals, the known license-authority item, and
  fixed Cycle 1 security findings were not re-reported.
