# Dependency Expert — Cycle 6 (2026-07-17)

Reviewed revision: `1d2755c` on `codex/review-plan-fix-2026-07-16`

## Result

**No new dependency, supply-chain, or third-party API compatibility finding.** The locked versions and used APIs are coherent. Two Tailwind packages received a registry patch after the previous cycle; that is maintenance drift, not evidence of a current failure or security defect, and no dependency mutation was authorized in this read-only review.

## Coverage and verification

- Read `package.json`, lockfile root/overrides and dependency/engine/peer-relevant graph entries, all framework/tool configs, Pages workflow, scripts, README/current context, and every source import/use of MapLibre, Mediabunny, `@tmcw/togeojson`, Lucide, Next, React, and browser platform APIs.
- Compared all 19 direct declarations with the npm registry `latest` metadata on 2026-07-17. Current exact matches include `@tmcw/togeojson` 7.1.2, Lucide 1.24.0, MapLibre 5.24.0, Mediabunny 1.50.8, Next/eslint-config-next 16.2.10, React/React DOM 19.2.7, Playwright 1.61.1, esbuild 0.28.1, jsdom 29.1.1, Vitest 4.1.10, and React type packages. Tailwind and `@tailwindcss/postcss` latest are 4.3.3 while the lock is 4.3.2.
- `@types/node` remains intentionally on the Node 24 line used by the workflow/context rather than the unrelated registry-latest Node 26 line. ESLint 10 and TypeScript 7 are newer majors, but Cycle 2's peer-compatibility decision retains ESLint 9.39.5 and TypeScript 6.0.3; no new evidence shows that constraint has changed.
- Inspected installed Mediabunny 1.50.8 type contracts for `BufferTarget`, `Output`, `VideoSample`, `VideoSampleSource.add`, and `canEncodeVideo`, plus MapLibre 5.24 style abort/diff behavior and `@tmcw/togeojson` parser entry points.
- Reused the Cycle 5 full matrix at the same code/dependency graph: `.context/plans/cycle5-implementation-2026-07-16.md:144-155` records zero high-severity audit vulnerabilities, green build/static smoke, unit/E2E/static E2E, and a real Mediabunny export. This role did not rerun artifact-mutating gates.

## Contract findings not raised

- **Mediabunny:** `src/lib/videoEncoder.ts:157-173,205-217,245-280,369-386` matches the installed constructors, state/cancel/finalize lifecycle, seconds-based sample timestamps, awaited source backpressure, sample close contract, and video codec probe options. The old large-`BufferTarget` issue is mitigated by the 256 MiB preflight and remains completed rather than re-reported.
- **MapLibre:** superseded string style diffs abort their prior request and filter `AbortError` in 5.24 (`node_modules/maplibre-gl/src/ui/map.ts:2159-2179`); shipped styles contain no remote source/sprite/glyph fan-out. The hypothesized late stale-request error therefore was rejected for the current integration.
- **`@tmcw/togeojson`:** GPX/KML conversion use matches the installed API. README/current context explicitly bound compatibility to well-formed/known-compatible inputs, so the old universal-compatibility concern is resolved at the contract layer.
- **Next/static export:** `next.config.ts:3-25`, runtime `basePath` asset URLs, worker build/check, CSP hardening, and static-serving scripts agree with the installed Next 16 export model.

## Environment observation (not a repository finding)

`npm ls --depth=0 --json` found five extraneous, optional WASM-support packages in this workspace's existing `node_modules` (`@emnapi/*`, `@napi-rs/wasm-runtime` 0.2.12, and `@tybys/wasm-util`). Lock metadata marks these as optional children of platform fallback packages, and `npm explain` did not connect the orphaned copies to a required root package on this Darwin installation. That indicates local install residue, not a tracked dependency-graph defect. A clean-install comparison would be needed before treating it as reproducibility evidence; no install, removal, or lock rewrite was performed.

## Registry drift disposition

The `^4.3.2` declarations permit Tailwind 4.3.3, but `npm ci` correctly preserves the 4.3.2 lock. With no cited security/advisory or project failure fixed by 4.3.3, a one-day patch release is not elevated to a product finding. The next authorized dependency-maintenance change should refresh `tailwindcss` and `@tailwindcss/postcss` together and run the complete gate matrix.

## Final missed-issue sweep and explicit skips

Rechecked dynamic imports, worker/runtime asset resolution, React/Next client boundaries, type/runtime API agreement, browser API fallbacks, overrides, peer-major choices, lock integrity, audit provenance, and CSP requirements. No actionable breakage or newly evidenced vulnerability was found.

Of 721 tracked `.context/` files, 21 active/provenance records were read and 700 historical artifacts skipped; all 39 legacy root `plan/` files were skipped. Generated lock boilerplate was inspected structurally rather than line by line, and the WOFF2 binary body was not decoded. No tracked source, config, script, textual public asset, test, or fixture was skipped.
