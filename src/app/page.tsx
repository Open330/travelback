'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import type { Track, MapStyleKey, Scene } from '@/types'
import MapView, { type MapViewHandle } from '@/components/MapView'
import FileUpload from '@/components/FileUpload'
import ExportPanel from '@/components/ExportPanel'
import JourneyCreator from '@/components/JourneyCreator'
import GoogleGuide from '@/components/GoogleGuide'
import GlobalToolbar from '@/components/GlobalToolbar'
import KeyboardHelp from '@/components/KeyboardHelp'
import Toast, { useToast } from '@/components/Toast'
import ErrorBoundary from '@/components/ErrorBoundary'
import TrackWorkspace from '@/components/TrackWorkspace'
import { MAP_STYLES } from '@/types'
import { computeCameraForScene } from '@/lib/camera'
import { computeCumulativeDistances, getUnitPreference, setUnitPreference, type UnitSystem } from '@/lib/interpolate'
import { parseTrackFile } from '@/lib/parser'
import { LocaleProvider, useLocale } from '@/lib/i18n'
import { useExportController } from '@/lib/useExportController'
import { usePlaybackController, usePlaybackHotkeys } from '@/lib/usePlaybackController'
import { basePath } from '@/lib/env'

export default function Home() {
  return (
    <LocaleProvider>
      <HomeInner />
    </LocaleProvider>
  )
}

const MAP_STYLE_STORAGE_KEY = 'travelback-mapstyle'
const MAP_STYLE_EXPLICIT_STORAGE_KEY = 'travelback-mapstyle-explicit'

function readStoredMapStyleKey(): MapStyleKey | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const saved = localStorage.getItem(MAP_STYLE_STORAGE_KEY)
    if (saved && (MAP_STYLES as Record<string, unknown>)[saved]) return saved as MapStyleKey
  } catch { /* ignore */ }
  return null
}

function readInitialExplicitMapStyleChoice(): boolean {
  if (typeof document === 'undefined' || typeof localStorage === 'undefined') return false
  try {
    const explicit = localStorage.getItem(MAP_STYLE_EXPLICIT_STORAGE_KEY)
    if (explicit === '1') return true
    if (explicit === '0') return false
  } catch { /* ignore */ }

  const saved = readStoredMapStyleKey()
  if (!saved) return false
  const mode = document.documentElement.getAttribute('data-mode')
  const themeDefault = mode === 'dark' ? 'dark' : 'voyager'
  return saved !== themeDefault
}

function HomeInner() {
  const { t, locale, setLocale } = useLocale()
  const [fullTrack, setFullTrack] = useState<Track | null>(null)
  const [track, setTrack] = useState<Track | null>(null)
  const [colorMode, setColorMode] = useState<'dark' | 'light'>(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return 'light'
    // Prefer the attribute set by the inline bootstrap script (which reads localStorage + matchMedia).
    // Fall back to reading localStorage directly, then matchMedia, then 'light'.
    const currentMode = document.documentElement.getAttribute('data-mode')
    if (currentMode === 'dark' || currentMode === 'light') return currentMode
    try {
      const stored = localStorage.getItem('travelback-theme')
      if (stored === 'dark' || stored === 'light') return stored
    } catch { /* ignore */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [hasExplicitMapStyleChoice, setHasExplicitMapStyleChoice] = useState(readInitialExplicitMapStyleChoice)
  const [mapStyleKey, setMapStyleKey] = useState<MapStyleKey>(() => {
    if (typeof document === 'undefined') return 'voyager'
    // Prefer an explicitly-saved map style from localStorage (set by cycleStyle).
    const saved = readStoredMapStyleKey()
    if (saved) return saved
    // Fall back to the theme-derived style set by the bootstrap script.
    const mode = document.documentElement.getAttribute('data-mode')
    return mode === 'dark' ? 'dark' : 'voyager'
  })
  const [showExport, setShowExport] = useState(false)
  const [isCreatingJourney, setIsCreatingJourney] = useState(false)
  const [showGoogleGuide, setShowGoogleGuide] = useState(false)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [showSceneEditor, setShowSceneEditor] = useState(false)
  const [transitionDuration, setTransitionDuration] = useState(0.03)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [trackSessionKey, setTrackSessionKey] = useState(0)
  const [units, setUnits] = useState<UnitSystem>(() => getUnitPreference())
  const { messages: toasts, addToast, dismissToast } = useToast()

  useEffect(() => {
    applyDocumentMode(colorMode)
    applyDocumentMapStyle(mapStyleKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once after mount to apply client-detected theme
  }, [])

  const mapViewRef = useRef<MapViewHandle>(null)
  const playback = usePlaybackController(track)
  const {
    isPlaying,
    progress,
    speed,
    duration,
    followCamera,
    seekNonce,
    setSpeed,
    setDuration,
    togglePlay,
    seekTo,
    stepSeek,
    toggleFollowCamera,
    pausePlayback,
    resetPlayback,
    setPlaybackProgress,
  } = playback

  const cumulativeDistances = useMemo(
    () => track ? computeCumulativeDistances(track.points, track.segmentStartIndices) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: avoid O(n) recomputation when only the track object reference changes
    [track?.points, track?.segmentStartIndices]
  )
  const fullTrackCumulativeDistances = useMemo(
    () => fullTrack ? computeCumulativeDistances(fullTrack.points, fullTrack.segmentStartIndices) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: keep the full-track timeline in full-track distance space
    [fullTrack?.points, fullTrack?.segmentStartIndices]
  )

  const {
    isExporting,
    exportProgress,
    exportState,
    exportedVideoUrl,
    exportedVideoBlob,
    downloadMethod,
    cancelExport,
    exportTrack,
    resetExportSession,
  } = useExportController({
    track,
    scenes,
    transitionDuration,
    mapViewRef,
    t,
    addToast,
    pausePlayback,
    setPlaybackProgress,
    playbackProgress: progress,
    cumulativeDistances,
  })

  usePlaybackHotkeys({
    track,
    isExporting,
    onTogglePlay: togglePlay,
    onStepSeek: stepSeek,
    onToggleFollowCamera: toggleFollowCamera,
    onToggleExport: () => setShowExport((open) => !open),
    onToggleKeyboardHelp: () => setShowKeyboardHelp((open) => !open),
    onClosePanels: () => {
      setShowExport(false)
      setShowSceneEditor(false)
      setShowGoogleGuide(false)
      setShowKeyboardHelp(false)
    },
  })

  // Escape-to-cancel while the export-overlay progress dialog is visible.
  // Matches the repo's modal convention (ModalDialog binds Escape to onClose).
  useEffect(() => {
    if (!isExporting) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      cancelExport()
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [isExporting, cancelExport])

  const resetTrackWorkspace = useCallback(() => {
    setShowExport(false)
    setShowSceneEditor(false)
    setScenes([])
    setTransitionDuration(0.03)
    resetExportSession()
  }, [resetExportSession])

  const loadTrackIntoSession = useCallback((nextTrack: Track) => {
    resetTrackWorkspace()
    mapViewRef.current?.clearTrackArtifacts()
    setFullTrack(nextTrack)
    setTrack(nextTrack)
    resetPlayback()
    setIsCreatingJourney(false)
    setTrackSessionKey((key) => key + 1)
  }, [resetPlayback, resetTrackWorkspace])

  const startFreshJourneySession = useCallback(() => {
    resetTrackWorkspace()
    mapViewRef.current?.clearTrackArtifacts()
    setTrack(null)
    setFullTrack(null)
    resetPlayback()
    setIsCreatingJourney(true)
    setTrackSessionKey((key) => key + 1)
  }, [resetPlayback, resetTrackWorkspace])

  const handleRangeChange = useCallback((startIdx: number, endIdx: number) => {
    if (!fullTrack) return

    const slicedPoints = fullTrack.points.slice(startIdx, endIdx + 1)
    if (slicedPoints.length < 2) return
    const isFullRange = startIdx === 0 && endIdx === fullTrack.points.length - 1
    if (!isFullRange && scenes.length > 0) {
      setScenes([])
      setShowSceneEditor(false)
    }

    const filteredTrack: Track = {
      name: fullTrack.name,
      points: slicedPoints,
      ...(fullTrack.segmentStartIndices
        ? {
            segmentStartIndices: fullTrack.segmentStartIndices
              .filter((index) => index >= startIdx && index <= endIdx)
              .map((index) => index - startIdx)
              .filter((index) => index >= 0),
          }
        : {}),
    }

    setTrack(filteredTrack)
    resetPlayback()
  }, [fullTrack, resetPlayback, scenes.length])

  const handleTrackLoaded = useCallback((nextTrack: Track) => {
    loadTrackIntoSession(nextTrack)
  }, [loadTrackIntoSession])

  const handleJourneyComplete = useCallback((nextTrack: Track) => {
    loadTrackIntoSession(nextTrack)
  }, [loadTrackIntoSession])

  const handleLoadSample = useCallback(async () => {
    const sampleUrl = `${basePath}/sample-trip.gpx`
    let responseStatus: number | null = null

    try {
      const response = await fetch(sampleUrl)
      responseStatus = response.status
      if (!response.ok) {
        throw new Error('fetch failed')
      }

      const text = await response.text()
      const sampleFile = new File([text], 'sample-trip.gpx', { type: 'application/gpx+xml' })
      const parsedTrack = await parseTrackFile(sampleFile)
      loadTrackIntoSession(parsedTrack)
    } catch (error) {
      console.error('Sample load failed:', {
        sampleUrl,
        responseStatus,
        error: error instanceof Error ? error.message : String(error),
      })
      addToast(t('app.sampleLoadFailed'), 'error')
    }
  }, [addToast, loadTrackIntoSession, t])

  const handleOpenGoogleGuide = useCallback(() => {
    setShowGoogleGuide(true)
  }, [])

  const handleCloseGoogleGuide = useCallback(() => {
    setShowGoogleGuide(false)
  }, [])

  const handleStartJourney = useCallback(() => {
    setIsCreatingJourney(true)
  }, [])

  const handleCancelJourney = useCallback(() => {
    setIsCreatingJourney(false)
  }, [])

  const handleToggleSceneEditor = useCallback(() => {
    setShowSceneEditor((visible) => !visible)
  }, [])

  const handleCloseSceneEditor = useCallback(() => {
    setShowSceneEditor(false)
  }, [])

  const handleOpenExport = useCallback(() => {
    setShowExport(true)
  }, [])

  const handleCloseExport = useCallback(() => {
    setShowExport(false)
  }, [])

  const handleResetExport = useCallback(() => {
    resetExportSession()
    setShowExport(false)
  }, [resetExportSession])

  const handlePreviewScene = useCallback((scene: Scene | null) => {
    if (!scene || !track) return

    const cameraState = computeCameraForScene(track, cumulativeDistances, scene, 0.5, 0)
    mapViewRef.current?.applyCameraState(cameraState)
  }, [track, cumulativeDistances])

  const applyDocumentMode = useCallback((mode: 'dark' | 'light') => {
    document.documentElement.setAttribute('data-mode', mode)
  }, [])

  const applyDocumentMapStyle = useCallback((key: MapStyleKey) => {
    document.documentElement.setAttribute('data-mapstyle', key)
  }, [])

  const handleModeChange = useCallback((mode: 'dark' | 'light') => {
    setColorMode(mode)
    applyDocumentMode(mode)
    try { localStorage.setItem('travelback-theme', mode) } catch { /* ignore */ }

    if (!hasExplicitMapStyleChoice) {
      const key = mode === 'dark' ? 'dark' : 'voyager'
      setMapStyleKey(key)
      applyDocumentMapStyle(key)
      try {
        localStorage.setItem(MAP_STYLE_STORAGE_KEY, key)
        localStorage.setItem(MAP_STYLE_EXPLICIT_STORAGE_KEY, '0')
      } catch { /* ignore */ }
    }
  }, [applyDocumentMapStyle, applyDocumentMode, hasExplicitMapStyleChoice])

  const cycleStyle = useCallback(() => {
    const keys = Object.keys(MAP_STYLES) as MapStyleKey[]
    const currentIndex = keys.indexOf(mapStyleKey)
    const nextKey = keys[(currentIndex + 1) % keys.length]
    const nextMode = nextKey === 'dark' ? 'dark' : 'light'
    setHasExplicitMapStyleChoice(true)
    setMapStyleKey(nextKey)
    setColorMode(nextMode)
    applyDocumentMapStyle(nextKey)
    applyDocumentMode(nextMode)
    try {
      localStorage.setItem(MAP_STYLE_STORAGE_KEY, nextKey)
      localStorage.setItem(MAP_STYLE_EXPLICIT_STORAGE_KEY, '1')
    } catch { /* ignore */ }
    try { localStorage.setItem('travelback-theme', nextMode) } catch { /* ignore */ }
  }, [applyDocumentMapStyle, applyDocumentMode, mapStyleKey])

  const handleUnitsChange = useCallback((nextUnits: UnitSystem) => {
    setUnitPreference(nextUnits)
    setUnits(nextUnits)
  }, [])

  return (
    <ErrorBoundary>
      <main id="app" className="relative w-screen h-screen overflow-hidden" data-travelback-app-root="true">
        <MapView
          ref={mapViewRef}
          track={track}
          progress={progress}
          mapStyleKey={mapStyleKey}
          followCamera={followCamera}
          suspendAutoCamera={isExporting}
          seekNonce={seekNonce}
          scenes={scenes}
          duration={duration}
          transitionDuration={transitionDuration}
          cumulativeDistances={cumulativeDistances}
          allowInteractionWithoutTrack={isCreatingJourney}
        />

        {!isCreatingJourney && (
          <FileUpload
            onTrackLoaded={handleTrackLoaded}
            hasTrack={track !== null}
            onShowGoogleGuide={handleOpenGoogleGuide}
            onLoadSample={handleLoadSample}
            onCreateJourney={handleStartJourney}
          />
        )}

        <GlobalToolbar
          locale={locale}
          setLocale={setLocale}
          units={units}
          mode={colorMode}
          onUnitsChange={handleUnitsChange}
          onModeChange={handleModeChange}
          hasTrack={track !== null}
        />

        <KeyboardHelp
          isOpen={showKeyboardHelp}
          hasTrack={Boolean(track)}
          onToggle={() => setShowKeyboardHelp((open) => !open)}
          onClose={() => setShowKeyboardHelp(false)}
        />

        {!track && isCreatingJourney && (
          <JourneyCreator
            isActive={isCreatingJourney}
            onComplete={handleJourneyComplete}
            onCancel={handleCancelJourney}
            mapRef={mapViewRef}
            units={units}
          />
        )}

        <GoogleGuide isOpen={showGoogleGuide} onClose={handleCloseGoogleGuide} />

        {track && fullTrack && (
          <TrackWorkspace
            fullTrack={fullTrack}
            track={track}
            cumulativeDistances={cumulativeDistances}
            fullTrackCumulativeDistances={fullTrackCumulativeDistances}
            trackSessionKey={trackSessionKey}
            mapStyleKey={mapStyleKey}
            showSceneEditor={showSceneEditor}
            scenes={scenes}
            locale={locale}
            setLocale={setLocale}
            mode={colorMode}
            onModeChange={handleModeChange}
            units={units}
            onUnitsChange={handleUnitsChange}
            onOpenHelp={() => setShowKeyboardHelp(true)}
            onOpenImportGuide={handleOpenGoogleGuide}
            onScenesChange={setScenes}
            transitionDuration={transitionDuration}
            onTransitionDurationChange={setTransitionDuration}
            onPreviewScene={handlePreviewScene}
            onStartNewTrack={startFreshJourneySession}
            onToggleSceneEditor={handleToggleSceneEditor}
            onCloseSceneEditor={handleCloseSceneEditor}
            onCycleStyle={cycleStyle}
            onOpenExport={handleOpenExport}
            onRangeChange={handleRangeChange}
            progress={progress}
            isPlaying={isPlaying}
            speed={speed}
            duration={duration}
            followCamera={followCamera}
            onTogglePlay={togglePlay}
            onSeek={seekTo}
            onSpeedChange={setSpeed}
            onDurationChange={setDuration}
            onFollowCameraToggle={toggleFollowCamera}
          />
        )}

        {showExport ? (
          <ExportPanel
            isOpen={showExport}
            onClose={handleCloseExport}
            onExport={exportTrack}
            isExporting={isExporting}
            exportProgress={exportProgress}
            exportState={exportState}
            exportedVideoUrl={exportedVideoUrl}
            exportedVideoBlob={exportedVideoBlob}
            downloadMethod={downloadMethod}
            onResetExport={handleResetExport}
            onCancelExport={cancelExport}
            playbackDuration={duration}
          />
        ) : null}

        <Toast messages={toasts} onDismiss={dismissToast} />
      </main>
    </ErrorBoundary>
  )
}
