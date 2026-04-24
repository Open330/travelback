# Aggregate Review — Cycle r9 (2026-04-24)

## Methodology

Cycle r9 ran a source-side multi-agent review on the cycle-r8 tip
`000000084f`. All six quality gates were green at cycle start.
User-injected queue was empty.

Eleven lanes ran: code-reviewer, perf, security, critic, verifier,
test-engineer, tracer, architect, debugger, document-specialist,
designer (UI/UX + a11y combined). Per-agent reviews live in
`.context/reviews/cycle-r9-*.md`.

---

## GATE STATUS — all green at cycle r9 start

- ESLint (`npm run lint`): **PASS**
- TypeScript (`npm run typecheck`): **PASS**
- Next.js build (`npm run build`): last verified cycle r8
- `npm run smoke:static`: last verified cycle r8
- `npm run test:e2e:static:ci`: last verified cycle r8 (54 passed)
- `npm audit --audit-level=high`: last verified cycle r8 (0 vulnerabilities)

---

## NEW FINDINGS — SCHEDULED THIS CYCLE

### C9-AGG-001: FileUpload `matchedKey` variable holds error code, not i18n key [LOW/MEDIUM]

**Source:** code-reviewer (C9-CR-001), confirmed by critic and tracer.

**File:** `src/components/FileUpload.tsx:75`

```js
const matchedKey = code && code in errorCodeMap ? code : ''
```

`matchedKey` holds an error code like `'UNSUPPORTED_FORMAT'`, not the
i18n key from `errorCodeMap`. The subsequent `errorCodeMap[matchedKey]`
does a correct second lookup, so there is no runtime bug. However, the
name is misleading for maintainers — a future edit could easily treat
`matchedKey` as the i18n key and introduce a bug.

Cross-agent agreement:
- code-reviewer: flagged as MEDIUM/HIGH
- critic: AGREED, re-rated LOW/MEDIUM for maintainability
- tracer: confirmed as maintainability risk (not a functional bug)

**Action:** Rename to `matchedCode`, introduce `knownCode` boolean,
simplify the `isSafe` logic. This supersedes cycle-r8 TASK-1 which
described the same fix.

### C9-AGG-002: No `prefers-reduced-motion` media query support [MEDIUM/MEDIUM]

**Source:** designer (C9-DS-001).

The app does not respect `prefers-reduced-motion`. Animations include:
- Loading spinner (`animate-spin`)
- Toast slide-in (`transition-all duration-300`)
- Scene editor chevron rotation (`transition-transform`)
- Export progress bar width transition (`transition: 'width .3s linear'`)

Users with vestibular disorders may experience discomfort.

**Fix:** Add a global CSS rule:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## NEW FINDINGS — DEFERRED

### C9-AGG-D23: `buildReferenceGridData` called on every style load without memoization [LOW/MEDIUM]

**Source:** perf-reviewer (C9-PR-001).

The grid data depends only on the track, not on map style or camera, so
it could be memoized. However, the computation cost is negligible
compared to the WebGL rendering cost, making the optimization
low-priority.

**Defer reason:** Unfavorable cost/benefit ratio. Grid computation is
fast even for large tracks.

---

## CARRYOVER DEFERRED

All prior deferred items continue to apply unchanged. No exit criteria
have been triggered this cycle:

- R7-AGG-D21 (full ModalDialog migration for export-overlay)
- R7-AGG-D22 (e2e regression guard for export-overlay a11y)
- R6-AGG-D18..D20 — all unchanged
- R5-AGG-D14..D17 — all unchanged
- R4-AGG-D1..D13 — all unchanged
- DF-C1-001 through DF-C7-001 — all unchanged

---

## AGENT FAILURES

None this cycle.
