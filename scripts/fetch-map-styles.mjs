/**
 * Fetch official CARTO basemap GL styles and adapt them for local use.
 *
 * The official styles use a TileJSON `url` source. This script replaces it
 * with a direct `tiles` array pointing to the CARTO CDN vector tile endpoints,
 * matching the existing CSP `connect-src` allowlist.
 *
 * Liberty and Bright were originally OpenFreeMap styles, but since CSP only
 * allows *.basemaps.cartocdn.com, we derive them from the CARTO Voyager style
 * with custom color overrides.
 */

import { writeFile } from 'node:fs/promises'
import path from 'node:path'

const STYLES_DIR = path.resolve(process.cwd(), 'public/map-styles')

const CARTO_STYLES = {
  voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  positron: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
}

const TILE_URLS = [
  'https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/{z}/{x}/{y}.mvt',
  'https://tiles-b.basemaps.cartocdn.com/vectortiles/carto.streets/v1/{z}/{x}/{y}.mvt',
  'https://tiles-c.basemaps.cartocdn.com/vectortiles/carto.streets/v1/{z}/{x}/{y}.mvt',
  'https://tiles-d.basemaps.cartocdn.com/vectortiles/carto.streets/v1/{z}/{x}/{y}.mvt',
]

function adaptSource(source) {
  if (source.type !== 'vector') return source
  const adapted = { ...source }
  delete adapted.url
  adapted.tiles = TILE_URLS
  adapted.minzoom = 0
  adapted.maxzoom = 14
  if (!adapted.attribution) {
    adapted.attribution = '&copy; <a href="https://carto.com/about-carto/" target="_blank" rel="noopener">CARTO</a>, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
  }
  return adapted
}

function adaptStyle(style, targetName, overrides) {
  let adapted = JSON.parse(JSON.stringify(style))

  // Adapt sources
  if (adapted.sources) {
    const newSources = {}
    for (const [key, source] of Object.entries(adapted.sources)) {
      newSources[key] = adaptSource(source)
    }
    adapted.sources = newSources
  }

  adapted.name = targetName.charAt(0).toUpperCase() + targetName.slice(1)

  // Apply layer color overrides
  if (overrides) {
    for (const layer of adapted.layers) {
      if (overrides[layer.id]) {
        const layerOverrides = overrides[layer.id]
        if (layerOverrides.paint) {
          layer.paint = { ...layer.paint, ...layerOverrides.paint }
        }
        if (layerOverrides.layout) {
          layer.layout = { ...layer.layout, ...layerOverrides.layout }
        }
      }
    }
  }

  return adapted
}

// Liberty overrides: earthy olive-green palette (matching the vitro-base.css data-mapstyle=liberty vars)
const LIBERTY_OVERRIDES = {
  background: { paint: { 'background-color': '#eef2ec' } },
  landcover: { paint: { 'fill-color': [
    'match', ['get', 'class'],
    'wood', '#c8d5be',
    'grass', '#d4dece',
    'scrub', '#cdd7c5',
    'farmland', '#dde5d8',
    '#e8ede4'
  ] } },
  park: { paint: { 'fill-color': '#bdd0b2' } },
  water: { paint: { 'fill-color': '#a3c4af' } },
  waterway: { paint: { 'line-color': '#a3c4af' } },
}

// Bright overrides: vivid cobalt-blue accent palette (matching vitro-base.css data-mapstyle=bright vars)
const BRIGHT_OVERRIDES = {
  background: { paint: { 'background-color': '#e8ecf4' } },
  water: { paint: { 'fill-color': '#8db4e8' } },
  waterway: { paint: { 'line-color': '#8db4e8' } },
}

async function fetchAndAdapt() {
  const fetchedStyles = {}

  for (const [name, url] of Object.entries(CARTO_STYLES)) {
    console.log(`Fetching ${name} from ${url}...`)
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`)
      }
      const style = await response.json()
      fetchedStyles[name] = style
      console.log(`  OK — ${style.layers?.length ?? 0} layers`)
    } catch (err) {
      console.error(`  FAILED: ${err.message}`)
      process.exit(1)
    }
  }

  // Write the three official CARTO styles
  for (const [name, style] of Object.entries(fetchedStyles)) {
    const adapted = adaptStyle(style, name)
    const outPath = path.join(STYLES_DIR, `${name}.json`)
    await writeFile(outPath, JSON.stringify(adapted, null, 2) + '\n')
    console.log(`Wrote ${outPath} (${adapted.layers?.length ?? 0} layers)`)
  }

  // Liberty: based on Voyager with earthy olive-green color overrides
  const liberty = adaptStyle(fetchedStyles.voyager, 'liberty', LIBERTY_OVERRIDES)
  const libertyPath = path.join(STYLES_DIR, 'liberty.json')
  await writeFile(libertyPath, JSON.stringify(liberty, null, 2) + '\n')
  console.log(`Wrote ${libertyPath} (${liberty.layers?.length ?? 0} layers — Voyager-based with olive-green palette)`)

  // Bright: based on Voyager with vivid blue color overrides
  const bright = adaptStyle(fetchedStyles.voyager, 'bright', BRIGHT_OVERRIDES)
  const brightPath = path.join(STYLES_DIR, 'bright.json')
  await writeFile(brightPath, JSON.stringify(bright, null, 2) + '\n')
  console.log(`Wrote ${brightPath} (${bright.layers?.length ?? 0} layers — Voyager-based with vivid blue palette)`)

  console.log('\nDone! All 5 map styles fetched and adapted.')
}

fetchAndAdapt()
