# Critic — Adversarial Review (Cycle 2, 2026-07-16)

## Inventory and challenge method

Challenged current claims across all 110 nonhistorical tracked paths at cc6f24f, including the complete src, E2E/fixture, public asset, script, workflow/config/package, README, and active context surface. Compared stated cycle-1 outcomes and architecture promises with current control flow and a fresh build. Validation gates run here: lint, typecheck, 266 unit tests, zero-vulnerability high audit, build, worker drift, and static smoke all passed.

## Findings

### CRIT2-01 — “Centralized session reset” does not cover the sample CTA

Severity: Medium | Confidence: High | Status: Confirmed counterexample

Evidence: .context/project/02-architecture.md:145-153 says loadTrackIntoSession/startFreshJourneySession centralize session boundaries. Yet page.tsx:374-397 starts a sample fetch/parse with no ownership token, while FileUpload.tsx:215-240 and 288-299 allow the user to start a journey during it.

Failure scenario: the user’s newer route is replaced when the older sample resolves.

Fix: centralize operation invalidation, not only the eventual state reset. Every async producer must present the current session generation before committing.

### CRIT2-02 — “Cancel Export” is not a cancel operation during finalization

Severity: Medium | Confidence: High | Status: Confirmed semantic mismatch; stall trigger is Likely

Evidence: ExportPanel.tsx:322-330 labels the action Cancel. useExportController.ts:125-127 only aborts a signal. videoEncoder.ts:65-69 and 232-235 show that finalizing output is neither aborted nor bounded.

Failure scenario: after the last frame, a stalled codec leaves the user staring at a cancel button that cannot affect the awaited operation.

Fix: make the operation bounded/terminable or change state and copy honestly while finalization cannot be interrupted.

### CRIT2-03 — The timeline claims distance semantics but uses index-uniform constraints

Severity: Medium | Confidence: High | Status: Confirmed internal contradiction

Evidence: TimelineSelector.tsx:27-31 explicitly says ratios are distance fractions, while lines 95-105 derive a ratio gap from point count. Uneven sampling makes valid adjacent-point trims unreachable.

Fix: pick one domain for constraints and conversions, encode it in names/types, and test adversarial spacing/plateaus.

### CRIT2-04 — Architecture documents an O(1) trail implementation that is not present

Severity: Medium | Confidence: High | Status: Confirmed documentation/implementation mismatch

Evidence: .context/project/02-architecture.md:75-77 says completed segments are pushed as O(1) references and only the partial segment is copied. map-geometry.ts:84-90 slices the active completed prefix, and MapView.tsx:415-423 serializes it through setData at every vertex change.

Failure scenario: maintainers reason from the document and miss a large-track allocation/serialization bottleneck.

Fix: implement and benchmark the promised representation or correct the document and performance expectations immediately.

### CRIT2-05 — The repository is no longer on the latest dependency baseline required by user policy

Severity: Low | Confidence: High | Status: Confirmed registry drift; major upgrades need compatibility validation

Evidence: package.json:24-45 and package-lock.json:10-31. On 2026-07-16, npm outdated reports compatible/current-line updates including Playwright 1.58.2→1.61.1, MapLibre 5.18.0→5.24.0, Tailwind/PostCSS plugin 4.2.0→4.3.2, React/React DOM 19.2.3→19.2.7, and @types/react 19.2.14→19.2.17. It also reports new majors for TypeScript 7.0.2, ESLint 10.7.0, and Lucide 1.24.0. package.json:36 still requests @types/node ^20 even though the project runtime is Node 24; the matching current Node-24 types line is 24.13.3. npm audit remains clean, and the current Next peer ranges accept the reviewed React/TypeScript/ESLint lines.

Failure scenario: npm ci deterministically installs the stale lock despite the explicit latest-stable rule; browser/tool regressions fixed upstream are absent.

Fix: update compatible dependencies first, align @types/node to Node 24, investigate current stable major migration notes for TypeScript/ESLint/Lucide, refresh the lock, then rerun all eight gates and real MP4. Do not conflate freshness with a security advisory.

### CRIT2-06 — MIT is still asserted without a license grant

Severity: Medium | Confidence: High | Status: Confirmed, carried from AG-27; blocked on legal input

Evidence: README.md:224-226 says MIT; no LICENSE file exists. The cycle-1 plan at lines 286-289 correctly records that copyright holder/year and intended grant remain unknown.

Failure scenario: users cannot rely on a repository license file, while the README makes a bare licensing claim.

Fix: obtain the owner’s intended license and attribution, then add the exact grant or remove/correct the claim with authorization. Do not invent legal details.

## What survived challenge

The worker is generated from shared parser source and current; audit is clean; static styles/map data are local; import limits and schema validation are materially improved; the advertised presets fit the memory estimator; desktop settings, form labels, journey naming/touch targets, phone-first guide, localized copy, and real MP4 harness are present. No deployment was performed.

## Final sweep

Rechallenged every cycle-1 completion claim against current source and fresh local gates. Findings above separate new regressions/missed cases from two explicit unresolved authority/input items. No additional high-confidence product blocker was found.
