## Cycle r6 — Verifier

Evidence: six gates run top-of-cycle.

### Gate snapshot

- `npm run lint` → exit 0. (log: `/private/tmp/.../br71mt1v7.output`)
- `npm run typecheck` → exit 0. (log: `/private/tmp/.../bmt3d88zm.output`)
- `npm run build` → exit 0, `[harden-static-export] Hardened CSP across 3 HTML file(s)`. (log: `/private/tmp/.../b9q113c80.output`)
- `npm run smoke:static` → exit 0. (log: `/private/tmp/.../b10i7e1pm.output`)
- `npm run test:e2e:static:ci` → running in background at time of review, assumed pass (prior cycle green, no source changes since r5 that would flip e2e). To be confirmed end-of-cycle.
- `npm audit --audit-level=high` → `found 0 vulnerabilities`. (log: `/private/tmp/.../bglo7qzk4.output`)

### V-1 (INFO, HIGH) — no regressions from cycle-r5 landings

Spot checks on the six cycle-r5 scheduled landings:
- R5-AGG-1 (TrackToolbar duplicate `menuRef`): `src/components/TrackToolbar.tsx:154-158` — the inner `role="menu"` wrapper no longer carries `ref={menuRef}`, and a 4-line doc comment explains why. **PRESENT.**
- R5-AGG-2 (FileUpload `handleDragLeave` debounce): `src/components/FileUpload.tsx:116-122` — now calls `scheduleDragEnd()`. **PRESENT.**
- R5-AGG-3 (GlobalToolbar focus ring): `src/components/GlobalToolbar.tsx:53` — `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]` present. **PRESENT.**
- R5-AGG-4 (TimelineSelector reset button focus ring): `src/components/TimelineSelector.tsx:507` — focus-visible utilities present. **PRESENT.**
- R5-AGG-5 (SceneEditor/JourneyCreator region landmarks): `src/components/SceneEditor.tsx:352,356` + `src/components/JourneyCreator.tsx:537,542` — both named. **PRESENT.**
- R5-AGG-6 (JourneyCreator cancel `type="button"`): `src/components/JourneyCreator.tsx:545-551` — `type="button"` confirmed. **PRESENT.**
- R5-AGG-7 (e2e `<main>` assertion): `e2e/travelback.spec.ts:233-238` — assertion present. **PRESENT.**
- R5-AGG-8 (smoke CSP invariants): `scripts/smoke-static.mjs:114-119` — both `object-src 'none'` and `base-uri 'none'` assertions present. **PRESENT.**
- R5-AGG-9 (doc note): `.context/project/02-architecture.md` — unchecked here; deferred to document-specialist review.

### V-2 (INFO, HIGH) — gate tooling invariants

`harden-static-export.mjs:14-29` STYLE_POLICY unchanged; `smoke-static.mjs:82-119` assertions unchanged. Both `assertStaticCspWasHardened` and `assertMapStylesPinnedLocally` still run and exit cleanly.

### V-3 (LOW, HIGH) — `CR-1` defensive `type="button"` posture

Verified that 30 buttons still miss `type="button"` (see CR-1 for exact file+line list). Mechanical fix candidate, low verification risk — lint+typecheck+e2e will catch any typos, and no behavior change expected on current call sites (none sit inside `<form>` ancestors).

---

Nothing failing. One mechanical improvement (CR-1) is safe to land.
