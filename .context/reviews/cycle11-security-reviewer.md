# Cycle 11 security review

Target: `7273d464fdce24fc06350ce1444c3a2e8d26829d`
Role: security reviewer
Date: 2026-07-17

## Result

No fresh security vulnerability was confirmed. The two fresh roots are local correctness/accessibility failures, and the unsupported-drop race is an incomplete `AG2-02` lifecycle edge with no cross-user or privilege boundary. Existing workflow-authority items `B01`/`B02`, legal input `B03`, and evidence-gated `B04` remain explicitly separate.

## Inventory and threat coverage

Read all 56 source/test paths, all 20 E2E/fixture paths, all 19 public assets, seven scripts, workflow, README, manifests/configs, and lock metadata. Catalogued all 787 `.context/` and 39 `plan/` paths and searched current/historical security dispositions. Threat flows included local GPX/KML/Google JSON, XML preflight, worker messages/transfers, DOM and inline-script sinks, filenames/save/download/share, object URLs, same-origin fetch, map resources, local storage, static-server path resolution/headers, CSP postbuild hardening, dependency/workflow authority, logs, and credential-like strings.

A current-source credential-pattern scan found no credential material; the only live token-like match was expected `.github/workflows/deploy-pages.yml:11` `id-token: write`. Fresh runtime gates were unavailable due the incomplete primary dependencies, and no install/server was used. Accepted exact-code Cycle 10 audit/build/test evidence is historical only.

## Security findings

None fresh.

### Challenged cross-role issues

- `C11-CORE-01` — Medium/High, fresh, at `src/components/JourneyCreator.tsx:336-369,705-721,925-962`, `src/app/page.tsx:196-210,332-347`, and `src/components/MapView.tsx:836-856`. Scenario: delete all waypoints after Done, then Create; the app accepts a meaningless `0 / 0 locations` session while empty cumulative distances prevent track-layer hydration. Fix: freeze/revalidate and copy a valid draft. It is real local correctness, but has no persistence, remote delivery, code execution, authorization boundary, or victim other than the initiating browser session; do not inflate it into security.
- `C11-CORE-02` — Medium/High, fresh, at `src/lib/usePlaybackController.ts:199-249` and `src/app/page.tsx:243-259`. Scenario: focused buttons/inputs match the guard, so Escape never closes a nonmodal panel. Fix: give global dismissal precedence with modal/export consumption rules. This is keyboard/accessibility routing, not access control.
- `C11-REOPEN-01` — Medium/High, reopened `AG2-02`, at `src/components/FileUpload.tsx:64-66,126-140` and `src/app/page.tsx:414-447,604-609`. Scenario: a held same-origin sample wins after a newer unsupported local drop. Fix: invalidate sample ownership at every file attempt before preflight. The result is stale local state, not SSRF or untrusted remote replacement.

### Controls verified

- XML entity/declaration rejection, tag/depth/size bounds, coordinate validation, JSON depth/size, worker timeout/abort, and the 250,000-point bound remain present. Imported XML names now normalize controls/whitespace and cap at 256 Unicode code points.
- Track/error text is rendered as React text. The only `dangerouslySetInnerHTML` is a static repository-authored theme/locale/frame bootstrap string; production CSP hashes emitted inline scripts and places the CSP before active head content.
- Bundled map styles declare no external sources, glyphs, or sprites. Application fetches are fixed same-origin resources; user input does not form a request URL.
- Export filenames remove reserved/control characters, keep a fixed MP4 suffix, and are bounded; object URLs have explicit revocation ownership.
- `serve-static.mjs` decodes then normalizes paths, rejects NUL/traversal outside `out`, supports GET/HEAD only, and emits `nosniff`, frame, referrer, permissions, opener, and resource policies.

Unicode bidi/format controls in a locally imported display name were challenged as residual hardening. They are not HTML/script injection, the download suffix remains an actual `.mp4`, and exploitation requires explicit local import with no persistence or cross-user sink. The pass did not elevate that low residual into a fresh finding.

## Historical classification

- `B01` High/High: CI omits `npm test`; workflow mutation requires explicit authority.
- `B02` Medium/High: workflow-global Pages/OIDC writes reach the build job; narrowing requires explicit CI/CD authority.
- `B03` Medium/High: README says MIT while root LICENSE/legal holder/year input is absent.
- `B04`, `M10-01`, and `M9-01` retain their representative-device/evidence exits.
- Cycle 10 parser-name availability hardening is implemented and not reopened. Pending cleanup resources were neither inspected for secrets nor reused/removed because their provenance ledger expressly forbids doing so before the final stop condition.

## Final missed-issue sweep

The closing OWASP/privacy pass rechecked injection, resource bounds, unsafe design, misconfiguration, dependency integrity, auth assumptions, data integrity, logging/privacy, SSRF, path traversal, DOM sinks, browser storage, worker trust, URL/filename confusion, CSP/anti-framing, workflow permissions, and cleanup authority. No additional exploitable current-HEAD issue survived threat modeling and history deduplication.
