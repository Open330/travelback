# Non-Tech Traveler Reviewer — Travelback (2026-05-09, Cycle 10)

## Scope
User-facing features, copy, workflow clarity, and overall experience for non-technical travelers.

## Findings

None. After reviewing all user-facing components and flows, no new UX issues were found.

## Analysis Details

### Onboarding
- **Landing page**: Clear heading, file upload drop zone with supported formats listed (.json Google Timeline, .gpx, .kml).
- **Sample trip CTA**: "Try with a sample trip" lets users experience the app without their own data.
- **Import guide**: "Need help finding your file?" link opens a step-by-step guide modal.
- **Draw a route**: Journey creator for users without existing travel data.

### File Import
- **Supported formats**: Google Location History (5 JSON variants), GPX, KML.
- **Error messages**: Friendly, localized messages for unsupported formats, oversized files, parse errors.
- **Progress**: No explicit progress indicator for parsing, but large files go to a worker thread so the UI stays responsive.

### Playback
- **Play/Pause**: Large button with clear icon. Spacebar shortcut.
- **Timeline**: Visual histogram showing point density. Drag handles to trim start/end. Click on selected region to seek.
- **Speed control**: Preset speeds (0.5x, 1x, 2x, 4x).
- **Duration**: Adjustable animation duration (3s - 300s, clamped to 180s for export).
- **Follow camera**: Toggle to lock camera to current position.

### Camera / Scenes
- **Scene editor**: "Camera" button opens scene panel.
- **Presets**: Cinematic, Simple, Birdeye, Dynamic — localized names in all 5 languages.
- **Scene types**: Flyover, Overview, Orbit, Ground, Closeup, Birdeye.
- **Parameters**: Zoom, pitch, bearing offset, rotation speed — all with sliders.
- **Preview**: Click "Customize" to preview scene parameters on the map.

### Export
- **Resolution presets**: YouTube (1920×1080), TikTok (1080×1920), Instagram Square (1080×1080), Instagram Post (1080×1350), HD (1280×720), 4K (3840×2160), 4K Portrait (2160×3840).
- **Quality**: Low, Medium, High, Maximum.
- **Codec**: H.264, H.265, AV1 (with availability check).
- **Estimated size**: Shown before starting export.
- **Progress**: Percentage + frame counter during rendering.
- **Result**: Video preview, download link, share button (if supported).

### Localization
- **5 languages**: English, Korean, Japanese, Chinese, Spanish.
- **All UI text localized**: Including error messages, button labels, tooltips, scene preset names.
- **Locale picker**: Available in both global toolbar and mobile menu.

### Theme
- **Light/Dark modes**: Automatic based on system preference, manually toggleable.
- **Map styles**: 5 styles that sync with theme (Dark for dark mode, Voyager for light mode).
- **Explicit choice tracking**: Manual overrides survive system theme changes and page reloads.

### Mobile Experience
- **Compact controls**: Playback stats on separate row below primary controls.
- **More controls menu**: Settings, units, locale, theme tucked into a mobile menu.
- **Swipe to dismiss**: Export panel can be swiped down to close.
- **Touch targets**: All buttons at least 44px tall.

## Verdict

No new user-facing issues. The app provides a smooth, localized, and accessible experience for non-technical travelers.
