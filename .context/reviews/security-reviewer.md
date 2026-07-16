# Security Reviewer — Cycle 5 (2026-07-16)

Reviewed revision: bdfb1d7

## Result

**New security findings: 0.** No new confidentiality, integrity, availability, privilege, privacy, or code-execution defect met the reporting threshold. No deployment or production mutation was performed.

## Inventory and coverage

Reviewed all 53 tracked src files, the Playwright specification and 18 fixtures, all 7 scripts, 19 public assets including the generated worker and local map styles, package/build/test configuration, the Pages workflow, README, and active context. The security trace followed uploaded GPX/KML/Google JSON through direct and worker parsing into React, MapLibre, and export/download/share sinks. It also checked XML declaration rejection, size/depth/point budgets, runtime shape validation, worker lifecycle and schema checks, DOM injection, localStorage, object URLs, external links, network destinations, static CSP hardening, frame handling, path normalization, dependencies, and workflow authority.

The source at bdfb1d7 matches the exact source revision c6eec45. The Cycle 4 completion record reports a zero-high-vulnerability audit and a green build/test/E2E matrix for that source. This role did not represent those prior results as a fresh audit.

## Controls still intact

- Uploaded route content remains browser-local; no new upload or telemetry destination was introduced.
- XML rejection and structural limits, Google JSON parse-wide budgets, and direct/generated-worker parity remain in place.
- User-derived names flow through React text rendering and filename normalization; no unsafe HTML, eval, dynamic script, or executable URL sink was found.
- Worker timeout/abort termination and returned-data validation remain bounded to the local worker.
- Static hardening still emits the documented hash-based CSP with object-src none, base-uri none, and self-constrained runtime connections.
- Object URL, File System Access, and Web Share use remains tied to explicit export/download actions with cleanup paths.

## Existing blocked boundaries, not new findings

| Carryover | Severity / confidence | Current status |
| --- | --- | --- |
| B01 — Pages CI omits npm test | High / High | Still authorization-blocked at .github/workflows/deploy-pages.yml:26-32. |
| B02 — Build inherits Pages/OIDC writes | Medium / High | Still authorization-blocked at .github/workflows/deploy-pages.yml:8-45. |
| B03 — README says MIT without a root LICENSE | Medium / High | Still blocked on exact owner-supplied legal terms and attribution. |

B04 remains a representative-hardware performance evidence item, not a security finding.

## Missed-issue sweep

Rechecked every network-capable API, untrusted-input property access, rendering/download sink, worker boundary, CSP assertion, workflow permission, and privacy claim after drafting. CR5-01 is a MapLibre current-pose consistency defect and does not cross a security or privacy boundary. New security count remains **0**.
