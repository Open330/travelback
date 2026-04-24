# Travelback — Project Context

This directory contains project context, conventions, and guidelines for AI assistants and contributors.

## Structure

``` 
.context/
├── README.md                          # This file
├── agents/
│   └── non-tech-traveler-reviewer.md  # Mina — casual traveler persona for UX reviews
├── project/
│   ├── 01-overview.md                 # Tech stack, build instructions, features, structure
│   └── 02-architecture.md             # Component tree, data flow, camera system, export pipeline
├── development/
│   └── 01-conventions.md              # Naming, code style, git rules, testing, dependencies
├── plans/
│   ├── README.md                      # Active/deferred plan index
│   └── archive/                       # Completed/superseded implementation-plan waves
└── reviews/
    ├── comprehensive-deep-code-review-post-remediation-2026-04-13.md
    ├── ultradeep-code-quality-review-post-remediation-2026-04-13.md
    ├── ultradeep-security-review-post-remediation-2026-04-13.md
    └── ...                            # Historical review waves retained for traceability
```

## Purpose

Travelback is a web application that animates GPX, KML, and Google Maps Location History files into cinematic travel videos. Users upload their track files (or create routes manually), preview the animated journey on an interactive map with customizable camera modes and scenes, and export the result as MP4 video with configurable resolution, codec, and quality.
