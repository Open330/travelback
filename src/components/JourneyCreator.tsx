'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { Check, Search } from 'lucide-react'
import maplibregl from 'maplibre-gl'
import type { Track, TrackPoint } from '@/types'
import type { MapViewHandle } from '@/components/MapView'
import { totalDistance, formatDistance, shortestLngDelta, type UnitSystem } from '@/lib/interpolate'
import { useLocale } from '@/lib/i18n'
import ModalDialog from '@/components/ModalDialog'

interface JourneyCreatorProps {
  isActive: boolean
  onComplete: (track: Track) => void
  onCancel: () => void
  mapRef: React.RefObject<MapViewHandle | null>
  units: UnitSystem
}

const SOURCE_POINTS = 'journey-points'
const SOURCE_LINE = 'journey-line'
const LAYER_LINE = 'journey-line'
const LAYER_POINTS = 'journey-points'
const MIN_SEARCH_QUERY_LENGTH = 3
const PROXIMITY_THRESHOLD_METERS = 5

/** Approximate meters between two lat/lng points (equirectangular, fine for short distances) */
function approxDistanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = shortestLngDelta(a.lng, b.lng) * Math.PI / 180 * Math.cos((a.lat + b.lat) / 2 * Math.PI / 180)
  return Math.sqrt(dLat * dLat + dLng * dLng) * R
}

interface ParsedLocationResult {
  display_name: string
  lat: string
  lon: string
}

const TRAVEL_ICON_OPTIONS = [
  { id: 'walk', symbol: '🚶', labelKey: 'journey.iconWalk' },
  { id: 'car', symbol: '🚗', labelKey: 'journey.iconCar' },
  { id: 'plane', symbol: '✈️', labelKey: 'journey.iconPlane' },
  { id: 'bus', symbol: '🚌', labelKey: 'journey.iconBus' },
  { id: 'train', symbol: '🚆', labelKey: 'journey.iconTrain' },
  { id: 'bike', symbol: '🚴', labelKey: 'journey.iconBike' },
] as const

type TravelIconId = typeof TRAVEL_ICON_OPTIONS[number]['id']

function buildPointsGeoJSON(waypoints: TrackPoint[], iconSymbol: string): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: waypoints.map((wp, i) => ({
      type: 'Feature',
      properties: { index: i, label: String(i + 1), icon: iconSymbol },
      geometry: { type: 'Point', coordinates: [wp.lng, wp.lat] },
    })),
  }
}

function buildLineGeoJSON(waypoints: TrackPoint[]): GeoJSON.Feature {
  const wrapLngNear = (referenceLng: number, nextLng: number) => {
    let adjusted = nextLng
    while (adjusted - referenceLng > 180) adjusted -= 360
    while (adjusted - referenceLng < -180) adjusted += 360
    return adjusted
  }
  const coordinates: [number, number][] = []
  for (const waypoint of waypoints) {
    const previous = coordinates[coordinates.length - 1]
    const lng = previous ? wrapLngNear(previous[0], waypoint.lng) : waypoint.lng
    coordinates.push([lng, waypoint.lat])
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates,
    },
  }
}

function parseCoordinateQuery(query: string): ParsedLocationResult | null {
  const trimmedQuery = query.trim()
  if (trimmedQuery.length === 0) return null

  let decoded = trimmedQuery
  try {
    decoded = decodeURIComponent(trimmedQuery)
  } catch {
    decoded = trimmedQuery
  }

  const patterns = [
    /geo:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i,
    /@(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
    /[?&#](?:q|ll)=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i,
    /#map=\d+(?:\.\d+)?\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/i,
    /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
  ]

  for (const pattern of patterns) {
    const match = decoded.match(pattern)
    if (!match) continue

    const lat = Number.parseFloat(match[1])
    const lon = Number.parseFloat(match[2])
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue

    return {
      display_name: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
      lat: String(lat),
      lon: String(lon),
    }
  }

  return null
}

export default function JourneyCreator({ isActive, onComplete, onCancel, mapRef, units }: JourneyCreatorProps) {
  const { t } = useLocale()
  // Use refs for waypoints to avoid stale closure issues in map event handlers
  const waypointsRef = useRef<TrackPoint[]>([])
  // State drives UI re-renders
  const [pointCount, setPointCount] = useState(0)
  const [distanceMeters, setDistanceMeters] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [searchEnabled, setSearchEnabled] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ParsedLocationResult[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1)
  const [selectedIconId, setSelectedIconId] = useState<TravelIconId>('walk')
  const [mapReadyRetry, setMapReadyRetry] = useState(0)
  const selectedIconSymbol = TRAVEL_ICON_OPTIONS.find(option => option.id === selectedIconId)?.symbol ?? TRAVEL_ICON_OPTIONS[0].symbol
  const selectedIconSymbolRef = useRef(selectedIconSymbol)
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null)

  // Track whether layers have been added to the map
  const layersAddedRef = useRef(false)
  // Track dragging state
  const draggingIndexRef = useRef<number | null>(null)
  const dragMovedRef = useRef(false)
  // Store cleanup functions
  const cleanupRef = useRef<(() => void) | null>(null)

  const syncUI = useCallback(() => {
    const pts = waypointsRef.current
    setPointCount(pts.length)
    setDistanceMeters(pts.length >= 2 ? totalDistance(pts) : 0)
  }, [])

  // Keep icon symbol ref in sync (avoid render-phase ref mutation — same pattern as Toast/ModalDialog)
  useEffect(() => {
    selectedIconSymbolRef.current = selectedIconSymbol
  }, [selectedIconSymbol])

  useEffect(() => {
    if (!isActive) return
    const frameId = requestAnimationFrame(() => cancelButtonRef.current?.focus())
    return () => cancelAnimationFrame(frameId)
  }, [isActive])

  const updateMapData = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map || !layersAddedRef.current) return

    const pointsSrc = map.getSource(SOURCE_POINTS) as maplibregl.GeoJSONSource | undefined
    const lineSrc = map.getSource(SOURCE_LINE) as maplibregl.GeoJSONSource | undefined

    if (pointsSrc) pointsSrc.setData(buildPointsGeoJSON(waypointsRef.current, selectedIconSymbolRef.current))
    if (lineSrc) lineSrc.setData(buildLineGeoJSON(waypointsRef.current))
  }, [mapRef])

  const addLayers = useCallback((map: maplibregl.Map) => {
    if (layersAddedRef.current) return

    // Line source + layer
    if (!map.getSource(SOURCE_LINE)) {
      map.addSource(SOURCE_LINE, {
        type: 'geojson',
        data: buildLineGeoJSON([]),
      })
    }
    if (!map.getLayer(LAYER_LINE)) {
      map.addLayer({
        id: LAYER_LINE,
        type: 'line',
        source: SOURCE_LINE,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#f97316',
          'line-width': 3,
          'line-opacity': 0.9,
        },
      })
    }

    // Points source + circle layer
    if (!map.getSource(SOURCE_POINTS)) {
      map.addSource(SOURCE_POINTS, {
        type: 'geojson',
        data: buildPointsGeoJSON([], selectedIconSymbolRef.current),
      })
    } else {
      const source = map.getSource(SOURCE_POINTS) as maplibregl.GeoJSONSource | undefined
      source?.setData(buildPointsGeoJSON(waypointsRef.current, selectedIconSymbolRef.current))
    }
    if (!map.getLayer(LAYER_POINTS)) {
      map.addLayer({
        id: LAYER_POINTS,
        type: 'circle',
        source: SOURCE_POINTS,
        paint: {
          'circle-radius': 12,
          'circle-color': '#f97316',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })
    }

    layersAddedRef.current = true
  }, [])

  const removeLayers = useCallback((map: maplibregl.Map) => {
    if (!layersAddedRef.current) return
    for (const layerId of [LAYER_POINTS, LAYER_LINE]) {
      if (map.getLayer(layerId)) map.removeLayer(layerId)
    }
    for (const srcId of [SOURCE_POINTS, SOURCE_LINE]) {
      if (map.getSource(srcId)) map.removeSource(srcId)
    }
    layersAddedRef.current = false
  }, [])

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map) {
      if (!isActive || mapReadyRetry >= 30) return
      const retryId = window.setTimeout(() => {
        setMapReadyRetry((retry) => retry + 1)
      }, 100)
      return () => window.clearTimeout(retryId)
    }

    if (!isActive) {
      // Clean up when deactivated
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
      removeLayers(map)
      waypointsRef.current = []
      setPointCount(0)
      setDistanceMeters(0)
      return
    }
    setMapReadyRetry(0)

    // Set up layers and event handlers
    const bindListeners = () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }

      addLayers(map)
      updateMapData()

      // --- Click to add waypoint ---
      const onClick = (e: maplibregl.MapMouseEvent) => {
        // Ignore clicks on existing waypoints (handled separately)
        const features = map.queryRenderedFeatures(e.point, { layers: [LAYER_POINTS] })
        if (features.length > 0) return

        const { lng, lat } = e.lngLat
        // Skip if too close to the last waypoint (likely accidental double-click)
        const pts = waypointsRef.current
        if (pts.length > 0) {
          const last = pts[pts.length - 1]
          if (approxDistanceMeters({ lat, lng }, last) < PROXIMITY_THRESHOLD_METERS) return
        }
        waypointsRef.current = [...pts, { lng, lat }]
        updateMapData()
        syncUI()
      }

      // --- Click on waypoint to delete ---
      const onPointClick = (e: maplibregl.MapLayerMouseEvent) => {
        e.preventDefault()
        if (draggingIndexRef.current !== null) return
        if (dragMovedRef.current) {
          dragMovedRef.current = false
          return
        }
        const feature = e.features?.[0]
        if (feature == null) return
        const idx = feature.properties?.index as number
        const pts = [...waypointsRef.current]
        pts.splice(idx, 1)
        waypointsRef.current = pts
        updateMapData()
        syncUI()
      }

      // --- Drag waypoints ---
      const startDrag = (index: number) => {
        draggingIndexRef.current = index
        dragMovedRef.current = false
        map.getCanvas().style.cursor = 'grabbing'
        map.dragPan.disable()
      }

      const updateDraggedPoint = (lng: number, lat: number) => {
        if (draggingIndexRef.current === null) return
        dragMovedRef.current = true
        const pts = [...waypointsRef.current]
        pts[draggingIndexRef.current] = { ...pts[draggingIndexRef.current], lng, lat }
        waypointsRef.current = pts
        updateMapData()
        syncUI()
      }

      const stopDrag = () => {
        draggingIndexRef.current = null
        map.getCanvas().style.cursor = ''
        map.dragPan.enable()
      }

      const onMouseMove = (ev: maplibregl.MapMouseEvent) => {
        updateDraggedPoint(ev.lngLat.lng, ev.lngLat.lat)
      }

      const onMouseUp = () => {
        stopDrag()
        map.off('mousemove', onMouseMove)
        map.off('mouseup', onMouseUp)
      }

      const onTouchMove = (ev: maplibregl.MapTouchEvent) => {
        updateDraggedPoint(ev.lngLat.lng, ev.lngLat.lat)
      }

      const onTouchEnd = () => {
        stopDrag()
        map.off('touchmove', onTouchMove)
        map.off('touchend', onTouchEnd)
        map.off('touchcancel', onTouchEnd)
      }

      const onMouseDownPoint = (e: maplibregl.MapLayerMouseEvent) => {
        e.preventDefault()
        const feature = e.features?.[0]
        if (feature == null) return
        startDrag(feature.properties?.index as number)

        map.on('mousemove', onMouseMove)
        map.on('mouseup', onMouseUp)
      }

      const onTouchStartPoint = (e: maplibregl.MapLayerTouchEvent) => {
        e.preventDefault()
        const feature = e.features?.[0]
        if (feature == null) return
        startDrag(feature.properties?.index as number)

        map.on('touchmove', onTouchMove)
        map.on('touchend', onTouchEnd)
        map.on('touchcancel', onTouchEnd)
      }

      const onMouseEnterPoint = () => {
        map.getCanvas().style.cursor = 'pointer'
      }

      const onMouseLeavePoint = () => {
        map.getCanvas().style.cursor = ''
      }

      map.on('click', onClick)
      map.on('click', LAYER_POINTS, onPointClick)
      map.on('mousedown', LAYER_POINTS, onMouseDownPoint)
      map.on('touchstart', LAYER_POINTS, onTouchStartPoint)
      map.on('mouseenter', LAYER_POINTS, onMouseEnterPoint)
      map.on('mouseleave', LAYER_POINTS, onMouseLeavePoint)

      cleanupRef.current = () => {
        map.off('click', onClick)
        map.off('click', LAYER_POINTS, onPointClick)
        map.off('mousedown', LAYER_POINTS, onMouseDownPoint)
        map.off('touchstart', LAYER_POINTS, onTouchStartPoint)
        map.off('mouseenter', LAYER_POINTS, onMouseEnterPoint)
        map.off('mouseleave', LAYER_POINTS, onMouseLeavePoint)
        map.off('mousemove', onMouseMove)
        map.off('mouseup', onMouseUp)
        map.off('touchmove', onTouchMove)
        map.off('touchend', onTouchEnd)
        map.off('touchcancel', onTouchEnd)
        map.getCanvas().style.cursor = ''
        map.dragPan.enable()
        draggingIndexRef.current = null
        dragMovedRef.current = false
      }
    }

    const handleStyleReload = () => {
      layersAddedRef.current = false
      bindListeners()
    }

    const handleInitialStyleLoad = () => {
      bindListeners()
      map.on('style.load', handleStyleReload)
    }

    if (map.isStyleLoaded()) {
      handleInitialStyleLoad()
    } else {
      map.once('style.load', handleInitialStyleLoad)
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
      map.off('style.load', handleInitialStyleLoad)
      map.off('style.load', handleStyleReload)
      removeLayers(map)
      waypointsRef.current = []
      setPointCount(0)
      setDistanceMeters(0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- map ref and handlers are stable; only re-run when active state changes or the bounded map-ready retry advances
  }, [isActive, mapReadyRetry])

  const handleUndo = useCallback(() => {
    if (waypointsRef.current.length === 0) return
    draggingIndexRef.current = null
    waypointsRef.current = waypointsRef.current.slice(0, -1)
    updateMapData()
    syncUI()
  }, [updateMapData, syncUI])

  const handleClear = useCallback(() => {
    waypointsRef.current = []
    updateMapData()
    syncUI()
  }, [updateMapData, syncUI])

  const runSearch = useCallback((query: string) => {
    const trimmedQuery = query.trim()
    if (trimmedQuery.length < MIN_SEARCH_QUERY_LENGTH) {
      setSearchResults([])
      setActiveSearchIndex(-1)
      setSearchError(null)
      return
    }

    const parsedResult = parseCoordinateQuery(trimmedQuery)
    if (!parsedResult) {
      setSearchResults([])
      setActiveSearchIndex(-1)
      setSearchError(t('journey.searchInvalid'))
      return
    }

    setSearchResults([parsedResult])
    setActiveSearchIndex(0)
    setSearchError(null)
  }, [t])

  const handleSearchInputChange = useCallback((query: string) => {
    setSearchQuery(query)
    setSearchError(null)
    setSearchResults([])
    setActiveSearchIndex(-1)
  }, [])

  const handleSelectPlace = useCallback((lat: string, lon: string) => {
    const lng = parseFloat(lon)
    const latNum = parseFloat(lat)
    if (!Number.isFinite(lng) || !Number.isFinite(latNum)) return
    if (Math.abs(latNum) > 90 || Math.abs(lng) > 180) return
    // Skip if too close to the last waypoint
    const pts = waypointsRef.current
    if (pts.length > 0 && approxDistanceMeters({ lat: latNum, lng }, pts[pts.length - 1]) < PROXIMITY_THRESHOLD_METERS) {
      setSearchResults([])
      setActiveSearchIndex(-1)
      setSearchQuery('')
      return
    }
    const map = mapRef.current?.getMap()
    if (map) map.flyTo({ center: [lng, latNum], zoom: 14 })
    waypointsRef.current = [...pts, { lng, lat: latNum }]
    updateMapData()
    syncUI()
    setSearchResults([])
    setActiveSearchIndex(-1)
    setSearchQuery('')
  }, [mapRef, updateMapData, syncUI])

  const handleSearchSubmit = useCallback(() => {
    if (!searchEnabled) return
    runSearch(searchQuery)
  }, [runSearch, searchEnabled, searchQuery])

  const handleSearchKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (activeSearchIndex >= 0 && activeSearchIndex < searchResults.length) {
        const result = searchResults[activeSearchIndex]
        handleSelectPlace(result.lat, result.lon)
        return
      }
      handleSearchSubmit()
      return
    }

    if (searchResults.length === 0) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveSearchIndex((index) => (index + 1 + searchResults.length) % searchResults.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveSearchIndex((index) => (index - 1 + searchResults.length) % searchResults.length)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveSearchIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveSearchIndex(searchResults.length - 1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setSearchResults([])
      setActiveSearchIndex(-1)
    }
  }, [activeSearchIndex, handleSearchSubmit, handleSelectPlace, searchResults])

  const handleToggleSearch = useCallback(() => {
    setSearchEnabled((enabled) => !enabled)
  }, [])

  useEffect(() => {
    if (!searchEnabled) {
      setSearchQuery('')
      setSearchResults([])
      setSearchError(null)
      setActiveSearchIndex(-1)
    }
  }, [searchEnabled])

  const handleDone = useCallback(() => {
    if (waypointsRef.current.length < 2) return
    setShowConfirm(true)
  }, [])

  const handleConfirmCreate = useCallback(() => {
    const track: Track = {
      name: `${selectedIconSymbol} ${t('journey.defaultName')}`,
      points: waypointsRef.current as TrackPoint[],
    }
    setShowConfirm(false)
    onComplete(track)
  }, [onComplete, selectedIconSymbol, t])

  useEffect(() => {
    updateMapData()
  }, [selectedIconSymbol, updateMapData])

  if (!isActive) return null

  return (
    <div data-testid="journey-creator-panel" role="region" aria-labelledby="journey-creator-title" className="absolute top-20 left-4 z-10 w-72 max-w-[calc(100vw-2rem)] gs overflow-hidden sm:top-4"
      style={{ borderRadius: 'var(--r-glass)' }}>
      {/* Header */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--div)' }}>
        <div className="flex items-center justify-between">
          <span id="journey-creator-title" className="font-semibold text-sm" style={{ color: 'var(--t1)' }}>
            {t('journey.title')}
          </span>
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={() => { if (pointCount >= 1) setShowDiscardConfirm(true); else onCancel() }}
            className="text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]" style={{ color: 'var(--t3)' }}
          >
            {t('journey.cancel')}
          </button>
        </div>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--t4)' }}>
          {t('journey.subtitle')}
        </p>
      </div>

      {/* Search bar */}
      <div className="relative px-4 pt-2 pb-1">
        {!searchEnabled ? (
          <div className="gi rounded-lg px-3 py-2" style={{ border: '1px solid var(--div)' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium" style={{ color: 'var(--t2)' }}>
                  {t('journey.searchEnableTitle')}
                </div>
                <p className="mt-0.5 text-[10px]" style={{ color: 'var(--t4)' }}>
                  {t('journey.searchDisabledPrivacy')}
                </p>
              </div>
              <button
                type="button"
                data-testid="journey-enable-search"
                onClick={handleToggleSearch}
                className="rounded-md px-2.5 py-1 text-[10px] font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
                style={{ color: 'rgb(var(--gl))', border: '1px solid rgba(var(--gl), .35)' }}
              >
                {t('journey.searchEnableAction')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--t4)' }} />
              <input
                type="text"
                role="combobox"
                aria-label={t('journey.searchPlaceholder')}
                aria-expanded={searchResults.length > 0}
                aria-controls="journey-search-listbox"
                aria-activedescendant={activeSearchIndex >= 0 ? `journey-search-option-${activeSearchIndex}` : undefined}
                aria-autocomplete="list"
                value={searchQuery}
                onChange={e => handleSearchInputChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={t('journey.searchPlaceholder')}
                className="w-full text-xs pl-7 pr-28 py-1.5 rounded-lg outline-none"
                style={{ background: 'var(--bg2)', color: 'var(--t1)', border: '1px solid var(--div)' }}
              />
              <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1">
                <button
                  type="button"
                  data-testid="journey-search-submit"
                  onClick={handleSearchSubmit}
                  disabled={searchQuery.trim().length < MIN_SEARCH_QUERY_LENGTH}
                  aria-label={t('journey.searchAction')}
                  title={t('journey.searchAction')}
                  className="rounded-md px-2 py-1 text-[10px] font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
                  style={{ color: 'rgb(var(--gl))' }}
                >
                  {t('journey.searchAction')}
                </button>
                <button
                  type="button"
                  onClick={handleToggleSearch}
                  className="rounded-md px-2 py-1 text-[10px] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
                  style={{ color: 'var(--t4)' }}
                >
                  {t('journey.searchDisableAction')}
                </button>
              </div>
            </div>
            <p className="mt-1 text-[10px]" style={{ color: 'var(--t4)' }}>
              {t('journey.searchPrivacy')}
            </p>
            {searchError && (
              <p className="mt-1 text-[10px]" style={{ color: 'var(--err)' }}>
                {searchError}
              </p>
            )}
            {searchResults.length > 0 && (
              <div id="journey-search-listbox" role="listbox" className="absolute left-4 right-4 top-full mt-0.5 rounded-lg overflow-hidden shadow-lg z-20"
                style={{ background: 'var(--bg1)', border: '1px solid var(--div)' }}>
                {searchResults.map((r, i) => (
                  <button type="button" key={i} id={`journey-search-option-${i}`} role="option" aria-selected={activeSearchIndex === i} onMouseEnter={() => setActiveSearchIndex(i)} onClick={() => handleSelectPlace(r.lat, r.lon)}
                    className="block w-full text-left text-xs px-3 py-2 transition-colors hover:brightness-110 cursor-pointer truncate focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
                    style={{ color: 'var(--t2)', borderBottom: i < searchResults.length - 1 ? '1px solid var(--div)' : 'none', background: activeSearchIndex === i ? 'var(--bg2)' : 'var(--bg1)' }}>
                    {r.display_name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-4 pb-2">
        <div className="text-[10px] mb-1" style={{ color: 'var(--t4)' }}>
          {t('journey.travelIconLabel')}
        </div>
        <div className="flex flex-wrap gap-1">
          {TRAVEL_ICON_OPTIONS.map((option) => {
            const isSelected = option.id === selectedIconId
            const optionLabel = t(option.labelKey)
            return (
              <button
                key={option.id}
                data-testid={`journey-icon-${option.id}`}
                type="button"
                aria-label={optionLabel}
                title={optionLabel}
                onClick={() => setSelectedIconId(option.id)}
                className="gi px-2 py-1 text-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
                style={{
                  color: 'var(--t1)',
                  borderColor: isSelected ? 'rgb(var(--gl))' : undefined,
                  boxShadow: isSelected ? '0 0 0 1px rgba(var(--gl),.45) inset' : undefined,
                }}
              >
                {option.symbol}
              </button>
            )
          })}
        </div>
      </div>

      {/* Instructions overlay when no points yet */}
      {pointCount === 0 ? (
        <div className="px-4 py-4 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--t2)' }}>
            {t('journey.instructionTitle')}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--t4)' }}>
            {t('journey.instructionSubtitle')}
          </p>
        </div>
      ) : (
        <>
          {/* Hint */}
          <div className="px-4 py-2">
            <p className="text-xs" style={{ color: 'var(--t3)' }}>
              {t('journey.hint')}
            </p>
          </div>

          {/* Stats */}
          <div className="px-4 py-2 text-xs font-medium" style={{ color: 'var(--t2)' }}>
            {pointCount === 1
              ? t('journey.onePoint')
              : `${pointCount} ${t('timeline.points')} · ${formatDistance(distanceMeters, units)}`}
          </div>
        </>
      )}

      {/* Confirmation card */}
      {showConfirm && (
        <div className="px-4 py-3" style={{ borderTop: '1px solid var(--div)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--t1)' }}>
            {t('journey.confirmTitle')}
          </p>
          <p className="text-[10px] mb-3" style={{ color: 'var(--t3)' }}>
            {pointCount} {t('timeline.points')} · {formatDistance(distanceMeters, units)}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowConfirm(false)}
              className="gi px-3 py-1.5 text-xs font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
              style={{ color: 'var(--t1)' }}>
              {t('journey.confirmEdit')}
            </button>
            <button type="button" onClick={handleConfirmCreate}
              className="ml-auto px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
              style={{ background: 'rgb(var(--gl))', color: 'var(--gl-fg)' }}>
              {t('journey.confirmCreate')}
              <Check size={14} strokeWidth={2.5} className="inline -mt-px ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {!showConfirm && (
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--div)' }}>
          <button
            type="button"
            onClick={handleUndo}
            disabled={pointCount === 0}
            className="gi px-3 py-1.5 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
            style={{ color: 'var(--t1)' }}
          >
            {t('journey.undo')}
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={pointCount === 0}
            className="gi px-3 py-1.5 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
            style={{ color: 'var(--t1)' }}
          >
            {t('journey.clear')}
          </button>
          <button
            type="button"
            onClick={handleDone}
            disabled={pointCount < 2}
            className="ml-auto px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
            style={{ background: 'rgb(var(--gl))', color: 'var(--gl-fg)' }}
          >
            {t('journey.done')}
            <Check size={14} strokeWidth={2.5} className="inline -mt-px ml-1" />
          </button>
          {pointCount === 1 && (
            <p className="text-[10px] mt-1 ml-2" style={{ color: 'rgb(var(--gl))' }}>
              {t('journey.addOneMore')}
            </p>
          )}
        </div>
      )}

      {showDiscardConfirm && (
        <ModalDialog
          open
          onClose={() => setShowDiscardConfirm(false)}
          labelledBy="journey-discard-title"
          overlayClassName="z-40 flex items-center justify-center bg-black/35 p-4 backdrop-blur-md"
          panelClassName="go w-full max-w-sm p-5 shadow-xl"
        >
          <p id="journey-discard-title" className="mb-4 text-sm font-medium" style={{ color: 'var(--t1)' }}>{t('journey.discardConfirm')}</p>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowDiscardConfirm(false)}
              className="gi px-4 py-2 text-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]" style={{ color: 'var(--t2)' }}>
              {t('app.cancel')}
            </button>
            <button type="button" onClick={() => { setShowDiscardConfirm(false); onCancel() }}
              className="vitro-btn-primary px-4 py-2 text-sm cursor-pointer">
              {t('app.discard')}
            </button>
          </div>
        </ModalDialog>
      )}
    </div>
  )
}
