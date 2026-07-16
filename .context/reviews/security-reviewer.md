# Security Reviewer — Cycle 4 (2026-07-16)

## Result

**New security findings: 0.** No new confidentiality, integrity, privilege, or code-execution defect met the reporting threshold on revision 4917d39. No deployment or production mutation was performed.

## Inventory and coverage

Reviewed the current application and release surface: all 53 tracked src files (including 15 unit-test files), the Playwright specification and 18 fixtures, all 7 scripts, 19 public assets including the generated parser worker and local map styles, package/build/test configuration, the Pages workflow, README, and active project/development/plan context. Historical reviews and plans were searched to distinguish new issues from fixed findings and the four explicit Cycle 3 carryovers.

The security pass traced untrusted GPX/KML/Google JSON from File/FileReader through direct and worker parsers into React, MapLibre, and export filename sinks. It also checked XML declarations and depth/size/point budgets, worker origin/lifecycle/schema validation, DOM injection, localStorage, object URLs, File System Access and Web Share calls, external links, runtime fetch destinations, CSP/static hardening, frame handling, static-server path normalization, dependency advisories, and workflow authority.

Fresh local evidence:

- npm audit --audit-level=high: passed, zero vulnerabilities.
- npm test: passed, 15 files and 352/352 tests.
- Production build and deployment were not run in this role pass.

## Verified controls

- Uploaded route data remains browser-local. The only application fetch is the bundled sample trip; local map styles and coordinate jumps add no third-party runtime request. Web Share is an explicit user action over the generated video file.
- GPX/KML rejects DOCTYPE and ENTITY declarations before DOM parsing, caps XML input, and enforces structural limits. Google JSON has file and parse-wide point budgets plus non-null runtime record validation in both direct and generated-worker paths.
- Worker messages are origin-local, transferred buffers are validated on return, abort/timeout cleanup terminates the worker, and the checked-in worker is generated from shared TypeScript parser code.
- User-derived names are rendered through React text nodes and normalized before download. Reserved path characters and ASCII controls cannot escape the browser download boundary; no unsafe user-derived HTML, eval, or dynamic script sink was found.
- The static hardener places a hash-based CSP before active head content and retains object-src 'none', base-uri 'none', and self-only connect/style policies. The client frame-buster and documented host-header limitation remain accurately described.
- Preferences, UI hints, and the localhost-only export-test toggle are the only localStorage data. Raw tracks, authentication material, and secrets are not persisted.

## Existing blocked boundaries, not new findings

| Carryover | Severity / confidence | Current status |
| --- | --- | --- |
| B01 — Pages CI omits npm test | High / High | Still authorization-blocked at .github/workflows/deploy-pages.yml:26-32. The passing local unit corpus does not replace a CI gate. |
| B02 — Build inherits Pages/OIDC writes | Medium / High | Still authorization-blocked at .github/workflows/deploy-pages.yml:8-45. Writes should be scoped to deploy only after explicit CI/CD approval. |
| B03 — README says MIT without a root LICENSE | Medium / High | Still blocked on the owner's exact legal grant, holder, and year/range; no legal text should be invented. |

The representative-device preserveDrawingBuffer measurement remains Cycle 3 evidence carryover B04, not a security defect.

## Missed-issue sweep

Rechecked every network-capable API, untrusted-input property access, user-derived rendering/download sink, worker boundary, CSP directive/order assertion, package advisory, workflow permission, and privacy claim after drafting. The two actionable lifecycle defects documented by the critic/verifier/debugger affect map correctness and export consistency, but do not create a new data disclosure or privilege boundary. New security count remains **0**.
