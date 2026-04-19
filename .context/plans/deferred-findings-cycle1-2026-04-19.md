# Deferred Findings — Cycle 1

These entries are deferred from `.context/reviews/_aggregate.md` only where they are not security/correctness/data-loss blockers for this cycle.

## DF-C1-001 — Mobile information architecture and discoverability polish
- **Source finding:** AGG-009
- **Original severity / confidence:** MEDIUM / HIGH
- **File citations:**
  - `src/components/FileUpload.tsx:111-123,193-197`
  - `src/components/TrackWorkspace.tsx:115-121`
  - `src/components/GlobalToolbar.tsx:23-26`
  - `src/components/TrackToolbar.tsx:123-220`
- **Reason for deferral:** This cycle is dominated by blocking correctness, security, export, and gate-failure work. The mobile IA issues are real but do not block the configured quality gates or create data-loss/security exposure.
- **Exit criterion:** Re-open when the blocking correctness/security backlog is green and a UX-focused cycle can address mobile title visibility, mobile control discoverability, and semantic heading cleanup together.

## DF-C1-002 — Broad maintainability/performance restructuring
- **Source finding:** AGG-010
- **Original severity / confidence:** MEDIUM / MEDIUM-HIGH
- **File citations:**
  - `src/app/page.tsx:32-419`
  - `src/lib/parser.ts:1-564`
  - `public/workers/trackParser.worker.js:1-275`
  - `src/components/MapView.tsx:500-506,754-777`
  - `src/lib/i18n.ts:11-1662`
  - `e2e/travelback.spec.ts:1-975`
- **Reason for deferral:** These are larger structural refactors that would materially expand cycle scope and risk destabilizing the blocking fixes. The immediate cycle instead addresses the concrete correctness/security defects and gate failures surfaced by the same reviews.
- **Exit criterion:** Re-open once the blocking fixes are merged and the repo can sustain a dedicated refactor/performance pass with regression coverage around parser ownership, page-state partitioning, rendering hot paths, and test/i18n modularization.
