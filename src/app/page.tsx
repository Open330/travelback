'use client'

import { useState, useRef, useCallback, useEffect, useMemo, type SetStateAction } from 'react'
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
import ModalDialog from '@/components/ModalDialog'
import { MAP_STYLES } from '@/types'
import { computeCameraForProgress, computeCameraForScene } from '@/lib/camera'
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

/**
 * Slice a track by point-index range and remap segment-start indices
 * into the trimmed coordinate space. A segment boundary at exactly
 * `startIdx` maps to index 0, which is then filtered out (index > 0)
 * since a boundary at the first point carries no meaningful break
 * information — the trimmed range always starts a fresh segment.
 */
function buildFilteredTrack(fullTrack: Track, startIdx: number, endIdx: number): Track | null {
  const slicedPoints = fullTrack.points.slice(startIdx, endIdx + 1)
  if (slicedPoints.length < 2) return null
  return {
    name: fullTrack.name,
    points: slicedPoints,
    ...(fullTrack.segmentStartIndices
      ? {
          segmentStartIndices: fullTrack.segmentStartIndices
            .filter((index) => index >= startIdx && index <= endIdx)
            .map((index) => index - startIdx)
            .filter((index) => index > 0),
        }
      : {}),
  }
}

const MAP_STYLE_STORAGE_KEY = 'travelback-mapstyle'
const MAP_STYLE_EXPLICIT_STORAGE_KEY = 'travelback-mapstyle-explicit'
const THEME_STORAGE_KEY = 'travelback-theme'
const THEME_EXPLICIT_STORAGE_KEY = 'travelback-theme-explicit'

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
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      const explicit = localStorage.getItem(THEME_EXPLICIT_STORAGE_KEY)
      if ((explicit === '1' || explicit == null) && (stored === 'dark' || stored === 'light')) return stored
    } catch { /* ignore */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [hasExplicitThemeChoice, setHasExplicitThemeChoice] = useState(() => {
    if (typeof localStorage === 'undefined') return false
    try {
      const explicit = localStorage.getItem(THEME_EXPLICIT_STORAGE_KEY)
      if (explicit === '1') return true
      if (explicit === '0') return false
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      return stored === 'dark' || stored === 'light'
    } catch {
      return false
    }
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
  const [workspaceAnnouncement, setWorkspaceAnnouncement] = useState('')
  const [pendingWorkspaceFocus, setPendingWorkspaceFocus] = useState(false)
  const [pendingTrimRange, setPendingTrimRange] = useState<{ startIdx: number; endIdx: number } | null>(null)
  const workspaceStatusRef = useRef<HTMLDivElement>(null)
  const tRef = useRef(t)
  useEffect(() => { tRef.current = t }, [t])
  const { messages: toasts, addToast, dismissToast } = useToast()

  const applyDocumentMode = useCallback((mode: 'dark' | 'light') => {
    document.documentElement.setAttribute('data-mode', mode)
  }, [])

  const applyDocumentMapStyle = useCallback((key: MapStyleKey) => {
    document.documentElement.setAttribute('data-mapstyle', key)
  }, [])

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
    resetPlaybackSession,
    setPlaybackProgress,
  } = playback

  const fullTrackCumulativeDistances = useMemo(
    () => fullTrack ? computeCumulativeDistances(fullTrack.points, fullTrack.segmentStartIndices) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: keep the full-track timeline in full-track distance space
    [fullTrack?.points, fullTrack?.segmentStartIndices]
  )
  const cumulativeDistances = useMemo(
    () => {
      if (!track) return []
      // When no trimming is applied, reuse the full-track distances to avoid
      // redundant O(n) haversine computation (CF5-12).
      if (track === fullTrack && fullTrackCumulativeDistances.length > 0) return fullTrackCumulativeDistances
      return computeCumulativeDistances(track.points, track.segmentStartIndices)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: avoid O(n) recomputation when only the track object reference changes
    [track, track?.points, track?.segmentStartIndices, fullTrack, fullTrackCumulativeDistances]
  )

  const {
    isExporting,
    exportProgress,
    exportState,
    exportedVideoUrl,
    exportedVideoBlob,
    exportedVideoFilename,
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

  useEffect(() => {
    if (!pendingWorkspaceFocus || !track) return
    const frameId = requestAnimationFrame(() => {
      const firstWorkspaceControl = document.querySelector<HTMLButtonElement>('[data-testid="controls-primary-row"] button')
      const focusTarget = firstWorkspaceControl ?? workspaceStatusRef.current
      focusTarget?.focus({ preventScroll: true })
      setPendingWorkspaceFocus(false)
    })
    return () => cancelAnimationFrame(frameId)
  }, [pendingWorkspaceFocus, track])

  useEffect(() => {
    if (hasExplicitThemeChoice || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applySystemMode = (matches: boolean) => {
      const nextMode = matches ? 'dark' : 'light'
      setColorMode(nextMode)
      applyDocumentMode(nextMode)
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextMode)
        localStorage.setItem(THEME_EXPLICIT_STORAGE_KEY, '0')
      } catch { /* ignore */ }

      if (!hasExplicitMapStyleChoice) {
        const nextStyle = nextMode === 'dark' ? 'dark' : 'voyager'
        setMapStyleKey(nextStyle)
        applyDocumentMapStyle(nextStyle)
        try {
          localStorage.setItem(MAP_STYLE_STORAGE_KEY, nextStyle)
          localStorage.setItem(MAP_STYLE_EXPLICIT_STORAGE_KEY, '0')
        } catch { /* ignore */ }
      }
    }
    // MediaQueryList.addEventListener is supported since Safari 14, Chrome 80, Firefox 65
    const handler = (event: MediaQueryListEvent) => applySystemMode(event.matches)
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [applyDocumentMapStyle, applyDocumentMode, hasExplicitMapStyleChoice, hasExplicitThemeChoice])

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
    resetPlaybackSession()
    setIsCreatingJourney(false)
    setTrackSessionKey((key) => key + 1)
    setWorkspaceAnnouncement(`${tRef.current('app.trackLoaded')} ${nextTrack.name}`)
    setPendingWorkspaceFocus(true)
  }, [resetPlaybackSession, resetTrackWorkspace])

  const startFreshJourneySession = useCallback(() => {
    resetTrackWorkspace()
    mapViewRef.current?.clearTrackArtifacts()
    setTrack(null)
    setFullTrack(null)
    resetPlaybackSession()
    setIsCreatingJourney(true)
    setTrackSessionKey((key) => key + 1)
  }, [resetPlaybackSession, resetTrackWorkspace])

  const handleRangeChange = useCallback((startIdx: number, endIdx: number) => {
    if (!fullTrack) return

    const slicedPoints = fullTrack.points.slice(startIdx, endIdx + 1)
    if (slicedPoints.length < 2) return
    const isFullRange = startIdx === 0 && endIdx === fullTrack.points.length - 1
    if (!isFullRange && scenes.length > 0) {
      setPendingTrimRange({ startIdx, endIdx })
      return
    }
    resetExportSession()

    const filteredTrack = buildFilteredTrack(fullTrack, startIdx, endIdx)
    if (!filteredTrack) return

    setTrack(filteredTrack)
    resetPlayback()
  }, [fullTrack, resetExportSession, resetPlayback, scenes.length])

  const confirmTrimClear = useCallback(() => {
    if (!pendingTrimRange || !fullTrack) return
    setScenes([])
    setShowSceneEditor(false)
    setPendingTrimRange(null)
    const { startIdx, endIdx } = pendingTrimRange
    const slicedPoints = fullTrack.points.slice(startIdx, endIdx + 1)
    if (slicedPoints.length < 2) return
    resetExportSession()
    const filteredTrack = buildFilteredTrack(fullTrack, startIdx, endIdx)
    if (!filteredTrack) return
    setTrack(filteredTrack)
    resetPlayback()
  }, [pendingTrimRange, fullTrack, resetExportSession, resetPlayback])

  const cancelTrimClear = useCallback(() => {
    setPendingTrimRange(null)
  }, [])

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
      addToast(tRef.current('app.sampleLoadFailed'), 'error')
    }
  }, [addToast, loadTrackIntoSession])

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

  const handleScenesChange = useCallback((value: SetStateAction<Scene[]>) => {
    resetExportSession()
    setScenes(value)
  }, [resetExportSession])

  // Clear stale pendingTrimRange when scenes are emptied — avoids applying a
  // stale trim confirmation range after the user deletes all scenes.
  useEffect(() => {
    if (scenes.length === 0 && pendingTrimRange) {
      setPendingTrimRange(null)
    }
  }, [scenes.length, pendingTrimRange])

  const handleTransitionDurationChange = useCallback((value: number) => {
    resetExportSession()
    setTransitionDuration(value)
  }, [resetExportSession])

  const handlePreviewScene = useCallback((scene: Scene | null) => {
    if (!track) return
    if (!scene) {
      const cameraState = computeCameraForProgress(
        track,
        cumulativeDistances,
        scenes,
        progress,
        progress * duration,
        transitionDuration,
      )
      mapViewRef.current?.applyCameraState(cameraState)
      return
    }

    const cameraState = computeCameraForScene(track, cumulativeDistances, scene, 0.5, 0)
    mapViewRef.current?.applyCameraState(cameraState)
  }, [track, cumulativeDistances, scenes, progress, duration, transitionDuration])

  const handleModeChange = useCallback((mode: 'dark' | 'light') => {
    setHasExplicitThemeChoice(true)
    setColorMode(mode)
    applyDocumentMode(mode)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode)
      localStorage.setItem(THEME_EXPLICIT_STORAGE_KEY, '1')
    } catch { /* ignore */ }

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
    setHasExplicitThemeChoice(true)
    setMapStyleKey(nextKey)
    setColorMode(nextMode)
    applyDocumentMapStyle(nextKey)
    applyDocumentMode(nextMode)
    try {
      localStorage.setItem(MAP_STYLE_STORAGE_KEY, nextKey)
      localStorage.setItem(MAP_STYLE_EXPLICIT_STORAGE_KEY, '1')
    } catch { /* ignore */ }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextMode)
      localStorage.setItem(THEME_EXPLICIT_STORAGE_KEY, '1')
    } catch { /* ignore */ }
  }, [applyDocumentMapStyle, applyDocumentMode, mapStyleKey])

  const handleUnitsChange = useCallback((nextUnits: UnitSystem) => {
    setUnitPreference(nextUnits)
    setUnits(nextUnits)
  }, [])

  const handleErrorReset = useCallback(() => {
    setFullTrack(null)
    setTrack(null)
    setScenes([])
    setShowExport(false)
    setShowSceneEditor(false)
    setIsCreatingJourney(false)
    resetPlaybackSession()
    resetExportSession()
  }, [resetPlaybackSession, resetExportSession])

  return (
    <ErrorBoundary onReset={handleErrorReset}>
      <main id="app" className="relative w-screen h-screen overflow-hidden" data-travelback-app-root="true" data-travelback-exporting={isExporting ? 'true' : undefined} data-has-track={track ? 'true' : undefined}>
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
          isExporting={isExporting}
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
          <>
            <div ref={workspaceStatusRef} tabIndex={-1} role="status" aria-live="polite" aria-atomic="true" className="sr-only">
              {workspaceAnnouncement}
            </div>
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
              onScenesChange={handleScenesChange}
              transitionDuration={transitionDuration}
              onTransitionDurationChange={handleTransitionDurationChange}
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
          </>
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
            exportedVideoFilename={exportedVideoFilename}
            downloadMethod={downloadMethod}
            onResetExport={handleResetExport}
            onCancelExport={cancelExport}
            playbackDuration={duration}
          />
        ) : null}

        <Toast messages={toasts} onDismiss={dismissToast} />

        {pendingTrimRange && (
          <ModalDialog
            open
            onClose={cancelTrimClear}
            labelledBy="trim-confirm-title"
            overlayClassName="z-40 flex items-center justify-center bg-black/35 p-4 backdrop-blur-md"
            panelClassName="go w-full max-w-sm p-5 shadow-xl"
          >
            <p id="trim-confirm-title" className="mb-4 text-sm font-medium" style={{ color: 'var(--t1)' }}>{t('scenes.trimClearConfirm')}</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={cancelTrimClear}
                className="gi px-4 py-2 text-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]" style={{ color: 'var(--t2)' }}>
                {t('app.cancel')}
              </button>
              <button type="button" onClick={confirmTrimClear}
                className="vitro-btn-primary px-4 py-2 text-sm cursor-pointer">
                {t('app.discard')}
              </button>
            </div>
          </ModalDialog>
        )}
      </main>
    </ErrorBoundary>
  )
}
