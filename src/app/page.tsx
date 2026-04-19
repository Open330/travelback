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

function HomeInner() {
  const { t, locale, setLocale } = useLocale()
  const [fullTrack, setFullTrack] = useState<Track | null>(null)
  const [track, setTrack] = useState<Track | null>(null)
  const [colorMode, setColorMode] = useState<'dark' | 'light'>(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return 'light'
    const currentMode = document.documentElement.getAttribute('data-mode')
    if (currentMode === 'dark' || currentMode === 'light') return currentMode
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [hasExplicitMapStyleChoice, setHasExplicitMapStyleChoice] = useState(false)
  const [mapStyleKey, setMapStyleKey] = useState<MapStyleKey>(() => {
    if (typeof document === 'undefined') return 'voyager'
    const mode = document.documentElement.getAttribute('data-mode')
    const key = mode === 'dark' ? 'dark' : 'voyager'
    document.documentElement.setAttribute('data-mapstyle', key)
    return key
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

  const {
    isExporting,
    exportProgress,
    exportState,
    exportedVideoUrl,
    exportedVideoBlob,
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

    const filteredTrack: Track = {
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

    setTrack(filteredTrack)
    resetPlayback()
  }, [fullTrack, resetPlayback])

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
    if (exportState === 'done') {
      resetExportSession()
    }
    setShowExport(false)
  }, [exportState, resetExportSession])

  const handleResetExport = useCallback(() => {
    resetExportSession()
    setShowExport(false)
  }, [resetExportSession])

  const cumulativeDistances = useMemo(
    () => track ? computeCumulativeDistances(track.points, track.segmentStartIndices) : [],
    [track]
  )

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
  }, [applyDocumentMapStyle, applyDocumentMode, mapStyleKey])

  const handleUnitsChange = useCallback((nextUnits: UnitSystem) => {
    setUnitPreference(nextUnits)
    setUnits(nextUnits)
  }, [])

  useEffect(() => {
    applyDocumentMode(colorMode)
    applyDocumentMapStyle(mapStyleKey)
  }, [applyDocumentMapStyle, applyDocumentMode, colorMode, mapStyleKey])

  return (
    <ErrorBoundary>
      <div className="relative w-screen h-screen overflow-hidden" data-travelback-app-root="true">
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
        />

        {isExporting && (
          <div data-disable-playback-hotkeys="true" className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(12px)' }}>
            <div className="go p-8 text-center" style={{ color: 'var(--t1)' }}>
              <div className="inline-block w-12 h-12 border-4 rounded-full animate-spin mb-4" style={{ borderColor: 'rgba(var(--gl),.6)', borderTopColor: 'transparent' }} />
              <p className="text-lg font-medium">{t('app.renderingVideo')}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--t3)' }}>{Math.round(exportProgress * 100)}%</p>
              <button
                onClick={cancelExport}
                aria-label={t('app.cancelExportAria')}
                className="gi mt-4 px-4 py-2 text-sm cursor-pointer"
                style={{ background: 'rgba(var(--err-rgb, 244,63,94),.7)', color: '#fff', border: 'none' }}
              >
                {t('app.cancelExport')}
              </button>
            </div>
          </div>
        )}

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

        <ExportPanel
          isOpen={showExport}
          onClose={handleCloseExport}
          onExport={exportTrack}
          isExporting={isExporting}
          exportProgress={exportProgress}
          exportState={exportState}
          exportedVideoUrl={exportedVideoUrl}
          exportedVideoBlob={exportedVideoBlob}
          onResetExport={handleResetExport}
          playbackDuration={duration}
        />

        <Toast messages={toasts} onDismiss={dismissToast} />
      </div>
    </ErrorBoundary>
  )
}
