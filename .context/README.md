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
│   ├── archive/                      # Completed/superseded plans
│   │   └── ux-overhaul-non-technical-traveler.md  # Archived: fully implemented UX overhaul plan
│   ├── address-post-remediation-reviews-2026-04-13.md  # Current follow-up plan for residual issues
│   ├── address-comprehensive-code-review-2026-04-13.md  # Comprehensive review remediation
│   ├── address-ultradeep-code-quality-review-2026-04-13.md  # Deep quality remediation
│   ├── address-ultradeep-security-review-2026-04-13.md  # Deep security remediation
│   ├── address-open-ux-review-items-2026-04-13.md  # Consolidated remaining UX follow-ups
│   └── ...                           # Additional active implementation plans
└── reviews/
    └── ux-review-non-technical-traveler.md    # UX review from traveler perspective
```

## Purpose

Travelback is a web application that animates GPX, KML, and Google Maps Location History files into cinematic travel videos. Users upload their track files (or create routes manually), preview the animated journey on an interactive map with customizable camera modes and scenes, and export the result as MP4 video with configurable resolution, codec, and quality.
