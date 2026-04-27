# Genuinely Blocked Deferred Items

These 5 findings cannot be implemented without external infrastructure or design decisions beyond the current development environment.

| ID | Severity | Summary | Blocker | Exit Criterion |
|----|----------|---------|---------|----------------|
| N03 | HIGH | E2E export success path exercises only stub | Requires real WebCodecs + MapLibre rendering in CI. No headless browser with WebGL + WebCodecs available in current test infrastructure. | Reopen when E2E infrastructure supports WebGL canvas rendering (e.g., Playwright with hardware acceleration or dedicated GPU CI runner). |
| N14 | MEDIUM | Export memory guard underestimates 4K peak | Requires profiling real 4K exports to calibrate the memory multiplier. No 4K export testing hardware available. | Reopen when 4K export testing is available and memory peaks can be measured on real devices. |
| N17 | MEDIUM | Mobile toolbar dialog not truly modal | Partially resolved with focus trap. Full fix requires testing on real mobile devices to verify touch/focus behavior. | Reopen if mobile focus issues are reported by users on real devices. |
| C13-F03 | LOW | iOS Safari download fallback | Requires physical iOS device testing infrastructure. Safari-specific blob download behavior cannot be tested in other browsers or emulators. | Reopen when iOS device testing is set up (physical device or BrowserStack/Sauce Labs with real iOS). |
| C19-F03 | LOW | Single-level undo design limitation in SceneEditor | Correct behavior per current design — single-level undo is intentional. Not a defect. | Reopen if multi-level undo is requested as a feature. |

## Resolved / Not Applicable

| ID | Original Severity | Summary | Resolution |
|----|-------------------|---------|------------|
| N12 | MEDIUM | Track session state spread across 15+ atoms | **NOT APPLICABLE** — project does not use Jotai. State is managed via React `useState` with only 8 track-related state variables, which is appropriate for the component complexity. |
