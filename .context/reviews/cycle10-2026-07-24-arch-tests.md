# Cycle 10 Architecture, Tests, and Documentation Review

Date: 2026-07-24
Reviewed revision: `570aa3510b6ca1431b47001e860d43876df39e15`
Branch: `review-plan-fix/no-deploy-20260723`

## Coverage

This grouped lane covered architecture, verification, tests, parsing and
workers, export and MP4, static hardening and serving, process-supervisor code,
CI/configuration, and documentation. It inventoried every relevant source,
test, script, fixture, configuration, project document, prior review/plan
artifact, and Cycle 1–9 commit before a final missed-file sweep.

A focused parser verification passed: 180/180 tests. No full suite, process
supervisor, E2E, Playwright, browser, server, process signal, commit, push, or
deployment was run.

Three read-only inventory commands initially used unmatched zsh globs. They
changed no state and were rerun safely with bounded file discovery.

## New supported root

### ARCH10-01 — XML display-name lookup ignores schema ownership

Severity: **Low**
Confidence: **High**

Evidence:

- `src/lib/parser.ts:396-402`
- `src/lib/parser.ts:406-416`

GPX and KML geometry now enforce schema namespace and ancestry ownership, but
the display-name path still uses namespace-blind selectors:

- `trk > name`
- `metadata > name`
- `Document > name`
- `Placemark > name`

Current XML selector behavior selected a leading vendor element such as
`Vendor override [urn:vendor]` before the real schema-owned name for all four
selectors. A valid extension can therefore replace the visible title, live
announcement, and export filename while the route geometry correctly comes
from the document schema.

Fix: select a direct schema-owned `name` child only from schema-owned GPX/KML
semantic parents, preserving existing track/document priority and fallback
behavior. Add GPX and KML regressions with leading foreign extension names,
plus foreign-only fallback coverage.

This is distinct from Cycle 5's point/segment semantic ownership repair and
the earlier display-name length/control canonicalization.

## Rejected and deduplicated candidates

- Dense Google/KML intermediate allocation and conservative pre-dedup budgets
  are historical accepted boundaries.
- Mediabunny finalizer cancellation after finalization begins is a documented
  limitation.
- Parser argument spreading, nested GPX amplification, XML lexical scanning,
  empty-track route fallback, and Unicode filename truncation were fixed in
  prior cycles.
- Duration-draft eligibility, social metadata, and export-presentation docs
  were fixed in Cycle 9.
- Pre-observation marker erasure, pidfd-grade identity, and exact global
  marker recovery without native/host support are excluded platform residuals.
- No new static-server, CSP, worker parity, E2E assertion, MP4 validation, CI,
  or documentation root survived the closing sweep.

