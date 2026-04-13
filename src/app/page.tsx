'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { Track, MapStyleKey, Scene, ExportConfig } from '@/types'
import MapView, { type MapViewHandle } from '@/components/MapView'
import FileUpload from '@/components/FileUpload'
import Controls from '@/components/Controls'
import ExportPanel from '@/components/ExportPanel'
import SceneEditor from '@/components/SceneEditor'
import TimelineSelector from '@/components/TimelineSelector'
import JourneyCreator from '@/components/JourneyCreator'
import GoogleGuide from '@/components/GoogleGuide'
import GlobalToolbar from '@/components/GlobalToolbar'
import KeyboardHelp from '@/components/KeyboardHelp'
import TrackToolbar from '@/components/TrackToolbar'
import Toast, { useToast } from '@/components/Toast'
import ErrorBoundary from '@/components/ErrorBoundary'
import ElevationProfile from '@/components/ElevationProfile'
import { MAP_STYLES } from '@/types'
import { generateDefaultScenes, computeCameraForScene } from '@/lib/camera'
import { computeCumulativeDistances, getUnitPreference, setUnitPreference, type UnitSystem } from '@/lib/interpolate'
import { exportVideo, downloadVideo } from '@/lib/videoEncoder'
import { parseTrackFile } from '@/lib/parser'
import { LocaleProvider, useLocale } from '@/lib/i18n'

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
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [duration, setDuration] = useState(30)
  const [mapStyleKey, setMapStyleKey] = useState<MapStyleKey>(() => {
    if (typeof document === 'undefined') return 'voyager'
    const mode = document.documentElement.getAttribute('data-mode')
    const key = mode === 'dark' ? 'dark' : 'voyager'
    document.documentElement.setAttribute('data-mapstyle', key)
    return key
  })
  const [followCamera, setFollowCamera] = useState(true)
  const [showExport, setShowExport] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'done'>('idle')
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null)
  const [isCreatingJourney, setIsCreatingJourney] = useState(false)
  const [showGoogleGuide, setShowGoogleGuide] = useState(false)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [showSceneEditor, setShowSceneEditor] = useState(false)
  const [transitionDuration, setTransitionDuration] = useState(0.03)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [seekNonce, setSeekNonce] = useState(0)
  const [trackSessionKey, setTrackSessionKey] = useState(0)
  const [units, setUnits] = useState<UnitSystem>(() => getUnitPreference())
  const { messages: toasts, addToast, dismissToast } = useToast()

  const mapViewRef = useRef<MapViewHandle>(null)
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const progressRef = useRef(0)
  const speedRef = useRef(speed)
  const durationRef = useRef(duration)
  const exportAbortRef = useRef<AbortController | null>(null)
  const exportedVideoUrlRef = useRef<string | null>(null)

  // Keep refs in sync without restarting the animation loop
  useEffect(() => { progressRef.current = progress }, [progress])
  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { durationRef.current = duration }, [duration])
  useEffect(() => { exportedVideoUrlRef.current = exportedVideoUrl }, [exportedVideoUrl])
  useEffect(() => {
    return () => {
      if (exportedVideoUrlRef.current) {
        URL.revokeObjectURL(exportedVideoUrlRef.current)
      }
    }
  }, [])

  // Animation loop — only restarts on play/pause or track change
  useEffect(() => {
    if (!isPlaying || !track) return

    lastTimeRef.current = performance.now()

    const animate = (now: number) => {
      const rawDt = (now - lastTimeRef.current) / 1000
      const dt = Math.min(rawDt, 1 / 30) // clamp to prevent jumps from frame spikes
      lastTimeRef.current = now

      const increment = (dt * speedRef.current) / durationRef.current
      const next = progressRef.current + increment

      if (next >= 1) {
        setProgress(1)
        progressRef.current = 1
        setIsPlaying(false)
        return
      }

      setProgress(next)
      progressRef.current = next
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [isPlaying, track])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          if (track) setIsPlaying(p => !p)
          break
        case 'ArrowRight':
          e.preventDefault()
          {
            const next = Math.min(1, progressRef.current + 0.02)
            setProgress(next)
            progressRef.current = next
            setSeekNonce(n => n + 1)
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          {
            const next = Math.max(0, progressRef.current - 0.02)
            setProgress(next)
            progressRef.current = next
            setSeekNonce(n => n + 1)
          }
          break
        case 'f':
        case 'F':
          setFollowCamera(f => !f)
          break
        case 'e':
        case 'E':
          if (track && !isExporting) setShowExport(s => !s)
          break
        case '?':
          setShowKeyboardHelp(h => !h)
          break
        case 'Escape':
          setShowExport(false)
          setShowSceneEditor(false)
          setShowGoogleGuide(false)
          setShowKeyboardHelp(false)
          break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [track, isExporting])

  const handleRangeChange = useCallback((startIdx: number, endIdx: number) => {
    if (!fullTrack) return
    const filtered = {
      name: fullTrack.name,
      points: fullTrack.points.slice(startIdx, endIdx + 1),
      ...(fullTrack.segmentStartIndices
        ? {
            segmentStartIndices: fullTrack.segmentStartIndices
              .filter((index) => index > startIdx && index <= endIdx)
              .map((index) => index - startIdx),
          }
        : {}),
    }
    setTrack(filtered)
    setProgress(0)
    progressRef.current = 0
  }, [fullTrack])

  const revokeExportedVideoUrl = useCallback(() => {
    setExportedVideoUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev)
      }
      return null
    })
  }, [])

  const resetTrackSessionUi = useCallback(() => {
    setShowExport(false)
    setShowSceneEditor(false)
    setScenes([])
    setTransitionDuration(0.03)
    setExportState('idle')
    setExportProgress(0)
    revokeExportedVideoUrl()
  }, [revokeExportedVideoUrl])

  const handleTrackLoaded = useCallback((t: Track) => {
    resetTrackSessionUi()
    mapViewRef.current?.clearTrackArtifacts()
    setFullTrack(t)
    setTrack(t)
    setProgress(0)
    progressRef.current = 0
    setIsPlaying(false)
    setTrackSessionKey((key) => key + 1)
  }, [resetTrackSessionUi])

  const handleJourneyComplete = useCallback((t: Track) => {
    resetTrackSessionUi()
    mapViewRef.current?.clearTrackArtifacts()
    setFullTrack(t)
    setTrack(t)
    setProgress(0)
    progressRef.current = 0
    setIsPlaying(false)
    setIsCreatingJourney(false)
    setTrackSessionKey((key) => key + 1)
  }, [resetTrackSessionUi])

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
    setShowSceneEditor((s) => !s)
  }, [])

  const handleCloseSceneEditor = useCallback(() => {
    setShowSceneEditor(false)
  }, [])

  const handleOpenExport = useCallback(() => {
    setShowExport(true)
  }, [])

  const handleCloseExport = useCallback(() => {
    if (exportState === 'done') {
      revokeExportedVideoUrl()
      setExportState('idle')
    }
    setShowExport(false)
  }, [exportState, revokeExportedVideoUrl])

  const handleToggleFollowCamera = useCallback(() => {
    setFollowCamera((f) => !f)
  }, [])

  const handleStartNewTrack = useCallback(() => {
    resetTrackSessionUi()
    mapViewRef.current?.clearTrackArtifacts()
    setTrack(null)
    setFullTrack(null)
    setProgress(0)
    progressRef.current = 0
    setIsPlaying(false)
    setIsCreatingJourney(true)
    setTrackSessionKey((key) => key + 1)
  }, [resetTrackSessionUi])

  const handleTogglePlay = useCallback(() => {
    if (progress >= 1) {
      setProgress(0)
      progressRef.current = 0
      setIsPlaying(true)
    } else {
      setIsPlaying((p) => !p)
    }
  }, [progress])

  const handleSeek = useCallback((p: number) => {
    setProgress(p)
    progressRef.current = p
    setSeekNonce(n => n + 1)
  }, [])

  const handleExport = useCallback(async (config: ExportConfig) => {
    const mapHandle = mapViewRef.current
    const canvas = mapHandle?.getCanvas()
    if (!canvas || !track || !mapHandle) return

    const abortController = new AbortController()
    exportAbortRef.current = abortController

    revokeExportedVideoUrl()

    setIsExporting(true)
    setExportState('exporting')
    setExportProgress(0)
    setIsPlaying(false)

    try {
      // Use scenes from config, or auto-generate if empty
      const exportScenes = config.scenes.length > 0 ? config.scenes
        : scenes.length > 0 ? scenes
        : generateDefaultScenes()

      const exportConfig: ExportConfig = { ...config, scenes: exportScenes }

      // Resize map to export resolution
      mapHandle.resize(config.resolution.width, config.resolution.height)

      // Wait for resize to settle then wait for map idle
      await new Promise(r => setTimeout(r, 200))
      const mapSettledAfterResize = await mapHandle.waitForIdle(abortController.signal)
      if (!mapSettledAfterResize) {
        throw new Error('Map did not finish rendering after resize')
      }

      let consecutiveIdleTimeouts = 0
      const waitForStableMap = async () => {
        const didIdle = await mapHandle.waitForIdle(abortController.signal)
        if (didIdle) {
          consecutiveIdleTimeouts = 0
          return
        }

        consecutiveIdleTimeouts += 1
        if (consecutiveIdleTimeouts >= 2) {
          throw new Error('Map did not finish rendering in time for export')
        }
      }

      const result = await exportVideo(
        canvas,
        track,
        exportConfig,
        async (progress, cameraState) => {
          // Apply camera and update UI
          mapHandle.applyCameraState(cameraState)
          setProgress(progress)
          progressRef.current = progress
        },
        (p) => setExportProgress(p),
        waitForStableMap,
        abortController.signal,
      )

      downloadVideo(result)

      // Store blob URL for video preview in success screen
      const blob = new Blob([result.buffer], { type: result.mimeType })
      const videoUrl = URL.createObjectURL(blob)
      setExportedVideoUrl(videoUrl)
      setExportState('done')
      addToast(t('app.exportSuccess'), 'success')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        addToast(t('app.exportCancelled'), 'info')
      } else {
        console.error('Export failed:', err)
        addToast(
          `${t('app.exportFailed')} ${t('app.exportFailedSuffix')}`,
          'error',
        )
      }
      setExportState('idle')
    } finally {
      exportAbortRef.current = null
      // Restore original map size
      mapViewRef.current?.resetSize()
      await new Promise(r => setTimeout(r, 200))
      setIsExporting(false)
      setExportProgress(0)
    }
  }, [track, scenes, addToast, revokeExportedVideoUrl, t])

  const handleResetExport = useCallback(() => {
    revokeExportedVideoUrl()
    setExportState('idle')
    setShowExport(false)
  }, [revokeExportedVideoUrl])

  const handleLoadSample = useCallback(async () => {
    const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')
    const sampleUrl = `${basePath}/sample-trip.gpx`
    let responseStatus: number | null = null

    try {
      const res = await fetch(sampleUrl)
      responseStatus = res.status
      if (!res.ok) throw new Error('fetch failed')
      const text = await res.text()
      const file = new File([text], 'sample-trip.gpx', { type: 'application/gpx+xml' })
      const parsed = await parseTrackFile(file)
      setFullTrack(parsed)
      setTrack(parsed)
      setProgress(0)
      progressRef.current = 0
      setIsPlaying(false)
    } catch (err) {
      console.error('Sample load failed:', {
        sampleUrl,
        responseStatus,
        error: err instanceof Error ? err.message : String(err),
      })
      addToast(t('app.sampleLoadFailed'), 'error')
    }
  }, [addToast, t])

  const handlePreviewScene = useCallback((scene: Scene | null) => {
    if (!scene || !track) return
    const cumulDist = computeCumulativeDistances(track.points, track.segmentStartIndices)
    const cameraState = computeCameraForScene(track, cumulDist, scene, 0.5, 0)
    mapViewRef.current?.applyCameraState(cameraState)
  }, [track])

  const applyMapStyleTheme = useCallback((key: MapStyleKey) => {
    const mode = key === 'dark' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-mode', mode)
    document.documentElement.setAttribute('data-mapstyle', key)
  }, [])

  const handleModeChange = useCallback((mode: 'dark' | 'light') => {
    const key = mode === 'dark' ? 'dark' : 'voyager'
    setMapStyleKey(key)
    applyMapStyleTheme(key)
  }, [applyMapStyleTheme])

  const cycleStyle = useCallback(() => {
    const keys = Object.keys(MAP_STYLES) as MapStyleKey[]
    const idx = keys.indexOf(mapStyleKey)
    const nextKey = keys[(idx + 1) % keys.length]
    setMapStyleKey(nextKey)
    applyMapStyleTheme(nextKey)
  }, [mapStyleKey, applyMapStyleTheme])

  const handleUnitsChange = useCallback((nextUnits: UnitSystem) => {
    setUnitPreference(nextUnits)
    setUnits(nextUnits)
  }, [])

  return (
    <ErrorBoundary>
    <div className="relative w-screen h-screen overflow-hidden">
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
        <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(12px)' }}>
          <div className="go p-8 text-center" style={{ color: 'var(--t1)' }}>
            <div className="inline-block w-12 h-12 border-4 rounded-full animate-spin mb-4" style={{ borderColor: 'rgba(var(--gl),.6)', borderTopColor: 'transparent' }} />
            <p className="text-lg font-medium">{t('app.renderingVideo')}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--t3)' }}>{Math.round(exportProgress * 100)}%</p>
            <button
              onClick={() => exportAbortRef.current?.abort()}
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
        onUnitsChange={handleUnitsChange}
        onModeChange={handleModeChange}
      />

      <KeyboardHelp
        isOpen={showKeyboardHelp}
        hasTrack={Boolean(track)}
        onToggle={() => setShowKeyboardHelp(h => !h)}
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

      <GoogleGuide
        isOpen={showGoogleGuide}
        onClose={handleCloseGoogleGuide}
      />

      {/* Top-right toolbar */}
      {track && (
        <TrackToolbar
          mapStyleKey={mapStyleKey}
          showSceneEditor={showSceneEditor}
          onStartNewTrack={handleStartNewTrack}
          onToggleSceneEditor={handleToggleSceneEditor}
          onCycleStyle={cycleStyle}
          onOpenExport={handleOpenExport}
        />
      )}

      {/* Scene Editor */}
      {track && showSceneEditor && (
        <SceneEditor
          scenes={scenes}
          onChange={setScenes}
          onClose={handleCloseSceneEditor}
          transitionDuration={transitionDuration}
          onTransitionDurationChange={setTransitionDuration}
          onPreviewScene={handlePreviewScene}
        />
      )}

      {/* Track name */}
      {track && (
        <div
          data-testid="track-title"
          className="hidden sm:block absolute left-4 right-4 top-36 z-10 gi px-4 py-2 text-sm font-medium text-center leading-tight sm:top-4 sm:left-36 sm:right-[34rem] sm:overflow-hidden sm:text-ellipsis sm:whitespace-nowrap"
          style={{ color: 'var(--t1)' }}>
          {track.name} — {track.points.length.toLocaleString()} / {fullTrack!.points.length.toLocaleString()} {t('timeline.points')}
        </div>
      )}

      {fullTrack && fullTrack.points.length > 2 && (
        <div className="absolute bottom-44 sm:bottom-36 left-0 right-0 z-10 px-4">
          <TimelineSelector
            key={trackSessionKey}
            track={fullTrack}
            onRangeChange={handleRangeChange}
          />
        </div>
      )}

      {track && (
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div className="px-4 pb-0.5 sm:hidden">
            <div
              data-testid="track-title-mobile"
              className="gi px-3 py-1.5 text-[10px] font-medium text-center leading-tight truncate"
              style={{ color: 'var(--t1)' }}
            >
              {track.name}
            </div>
          </div>
          <div className="px-4 mb-1.5">
            <ElevationProfile track={track} progress={progress} onSeek={handleSeek} units={units} />
          </div>
          <Controls
            track={track}
            isPlaying={isPlaying}
            progress={progress}
            speed={speed}
            duration={duration}
            units={units}
            followCamera={followCamera}
            onTogglePlay={handleTogglePlay}
            onSeek={handleSeek}
            onSpeedChange={setSpeed}
            onDurationChange={setDuration}
            onFollowCameraToggle={handleToggleFollowCamera}
          />
        </div>
      )}

      <ExportPanel
        isOpen={showExport}
        onClose={handleCloseExport}
        onExport={handleExport}
        isExporting={isExporting}
        exportProgress={exportProgress}
        exportState={exportState}
        exportedVideoUrl={exportedVideoUrl}
        onResetExport={handleResetExport}
      />

      <Toast messages={toasts} onDismiss={dismissToast} />
    </div>
    </ErrorBoundary>
  )
}
