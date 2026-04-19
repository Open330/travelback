import { writeFile } from 'node:fs/promises'
import path from 'node:path'

const STYLES_DIR = path.resolve(process.cwd(), 'public/map-styles')

const STYLE_BACKGROUNDS = {
  voyager: '#e7efe8',
  positron: '#f0f1f5',
  dark: '#0a0d14',
  liberty: '#eef2ec',
  bright: '#ecf0f8',
}

function buildLocalStyle(name, backgroundColor) {
  return {
    version: 8,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    sources: {},
    transition: { duration: 0, delay: 0 },
    center: [0, 20],
    zoom: 2,
    bearing: 0,
    pitch: 0,
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': backgroundColor,
        },
      },
    ],
    metadata: {
      'travelback:bundled': true,
      'travelback:description': 'Minimal bundled base style with no remote tiles, glyphs, or sprites.',
    },
  }
}

async function writeBundledStyles() {
  for (const [name, backgroundColor] of Object.entries(STYLE_BACKGROUNDS)) {
    const outPath = path.join(STYLES_DIR, `${name}.json`)
    const style = buildLocalStyle(name, backgroundColor)
    await writeFile(outPath, JSON.stringify(style, null, 2) + '\n')
    console.log(`Wrote ${outPath} (bundled local style)`)
  }

  console.log('\nDone! All 5 bundled map styles are now local-only.')
}

writeBundledStyles()
