# Cycle r5 — document-specialist (2026-04-23)

## Scope

Verify `.context/` documentation remains accurate after cycle-r4 landed the frame-ancestors drop, landmark, drop-zone labeling, reload-button height, and focus-visible ring.

## Findings

### DS-1 (INFO, HIGH) — Architecture doc reflects cycle-r4 change

- **Files**: `.context/project/02-architecture.md:114-118`.
- **Evidence**: the doc contains the cycle-r4 note about `frame-ancestors` being dropped from the meta CSP, with references to the JS frame-buster and host-header. Accurate.

### DS-2 (LOW, HIGH) — Conventions doc does not mention `<main>` requirement

- **Files**: `.context/development/01-conventions.md`.
- **Evidence**: file covers naming, code style, git — no landmark conventions. Not required, but adding a one-line "All Next.js pages use a single `<main>` landmark as the app root" would help future contributors. Tiny polish.
- **Schedule**: DEFER (no explicit user request; the a11y architecture section in `02-architecture.md` is already the authoritative surface).

### DS-3 (INFO, HIGH) — Scenes architecture table remains accurate

- **Files**: `.context/project/02-architecture.md:73-82`.
- **Evidence**: 6 camera modes listed match `src/types.ts` and `SceneEditor.tsx:26`. Accurate.

### DS-4 (INFO, HIGH) — Component tree doc accurate

- **Files**: `.context/project/02-architecture.md:3-22`.
- **Evidence**: components listed still reflect the source tree under `src/components/`.

### DS-5 (LOW, MEDIUM) — Scene editor panel not documented as a landmark

- **Files**: `.context/project/02-architecture.md`.
- **Evidence**: if AR-3 lands (adding `role="region"` to the Scene editor panel), a one-line doc update noting this helps. Low-priority; can follow the implementation.
- **Schedule**: YES if AR-3 lands — append to the architecture section the note that SceneEditor/JourneyCreator panels carry `role="region"` with a labelledby to their title. But skip adding if AR-3 doesn't land.

## Confidence summary

DS-5 only lands if AR-3/AR-4 do. No other doc drift found.
