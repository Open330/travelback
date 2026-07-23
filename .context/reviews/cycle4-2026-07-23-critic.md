# Cycle 4 critic review — 2026-07-23

**Role:** critic

**Reviewed revision:** `975dded34c849db4eb972221ed9483d3d64fb81d` on `review-plan-fix/no-deploy-20260723`

**Outcome:** one genuinely new actionable finding

## Inventory and method

I inventoried the complete current implementation surface before reviewing:
production source, scripts, unit and E2E tests, workflow/build configuration,
public runtime assets, `README.md`, and current project documentation. I read
the Cycle 3 aggregate and implementation plan, the P01 platform-boundary
deferral, and the plans index before counting anything. Historical reviews and
plans were used only to suppress duplicate roots.

The cross-perspective sweep covered local-file trust boundaries, parser and
worker parity, geometry and antimeridian handling, state/session ownership,
MapLibre lifecycle, scene/trim/playback/export flows, accessibility and
responsive layouts, generated assets, static-server containment, process
supervision, and CI/deployment authority.

## Finding

### C4-CRIT-01 — XML comments can cancel real nesting in the preflight depth counter

- Severity: Medium
- Confidence/status: High / Guard bypass Confirmed with a deterministic
  source-equivalent probe; runtime availability impact Likely and needs manual
  validation
- Evidence: `src/lib/parser.ts:147-180`

`preflightXml` is intended to reject XML deeper than
`XML_MAX_NESTING_DEPTH`, but it scans raw text with a tag-shaped regular
expression. The scanner is unaware of XML lexical contexts. In particular, it
counts `</x>` text inside a valid comment as a real closing element and clamps
the tracked depth at zero.

A valid document can interleave every real opening tag with a fake closing tag
inside a comment:

```xml
<kml><x><!-- </x> --><x><!-- </x> --> ... </x></x></kml>
```

For a 1,000-element version, a read-only source-equivalent scan produced:

```text
actualElementDepth=1001
preflightMaxDepth=2
preflightFinalDepth=0
tagCount=3002
bytes=20011
```

The input is far below the 4 MiB file limit and the tag-count limit, yet it
bypasses the advertised depth limit of 128. `DOMParser` and
`@tmcw/togeojson` then receive the deeply nested tree that the preflight was
meant to exclude, reopening main-thread CPU, memory, or stack-availability
risk when a user selects a crafted local KML/GPX file. The inverse is also
possible: tag-like opening text in comments or CDATA can falsely reject a
shallow valid document.

#### Suggested fix

Replace the raw-text regex counter with a linear XML-aware tokenizer/state
machine that skips comments, CDATA sections, processing instructions, and
declarations, and that honors quoted `>` characters while counting only real
start, end, and self-closing tokens. A proper streaming/SAX parser with an
enforced depth budget is preferable if available; moving XML parsing off the
main thread would additionally contain residual parser cost.

Add regressions for:

- more than 128 real nested elements interleaved with fake comment closings;
- shallow XML containing tag-like text in comments and CDATA;
- quoted `>` characters and self-closing elements;
- both GPX and KML entry points, which share this preflight.

## Duplicate audit and missed-issue sweep

Prior reviews discussed entity stripping and XML complexity limits, but did
not identify comment/CDATA lexical confusion or demonstrate that valid XML can
neutralize the nesting counter. Prior security conclusions treated the depth
bound as intact. The concrete bypass is therefore new evidence rather than a
relabelled historical concern.

The architect review independently counts the import/export session-ownership
race; it is corroborated here but not double-counted. I found no additional
new root in worker cancellation, JSON preflight, segment metadata,
antimeridian geometry, scene targets, export presentation restoration,
responsive focus, process-supervisor boundaries, static path containment, or
workflow authority after the final missed-issue sweep.

## Process hygiene

I ran one deterministic, read-only Node calculation equivalent to the XML
counter to validate the arithmetic. I did not run application code, unit
tests, a browser, Playwright, Chrome, an app server, or E2E. No deployment,
commit, push, branch switch, source edit, or existing-review edit was
performed.
