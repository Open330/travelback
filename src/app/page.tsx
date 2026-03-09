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
import Toast, { useToast } from '@/components/Toast'
import ErrorBoundary from '@/components/ErrorBoundary'
import ElevationProfile from '@/components/ElevationProfile'
import ThemeToggle from '@/components/ThemeToggle'
import { Plus } from 'lucide-react'
import { MAP_STYLES } from '@/types'
import { generateDefaultScenes, computeCameraForScene } from '@/lib/camera'
import { computeCumulativeDistances } from '@/lib/interpolate'
import { exportVideo, downloadVideo } from '@/lib/videoEncoder'
import { parseTrackFile } from '@/lib/parser'
import { LocaleProvider, useLocale, type Locale } from '@/lib/i18n'

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
    if (typeof document === 'undefined') return 'dark'
    const mode = document.documentElement.getAttribute('data-mode')
    return mode === 'dark' ? 'dark' : 'voyager'
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
  const { messages: toasts, addToast, dismissToast } = useToast()

  const mapViewRef = useRef<MapViewHandle>(null)
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const progressRef = useRef(0)
  const speedRef = useRef(speed)
  const durationRef = useRef(duration)
  const exportAbortRef = useRef<AbortController | null>(null)

  // Keep refs in sync without restarting the animation loop
  useEffect(() => { progressRef.current = progress }, [progress])
  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { durationRef.current = duration }, [duration])

  // Animation loop — only restarts on play/pause or track change
  useEffect(() => {
    if (!isPlaying || !track) return

    lastTimeRef.current = performance.now()

    const animate = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000
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
    }
    setTrack(filtered)
    setProgress(0)
    progressRef.current = 0
  }, [fullTrack])

  const handleTrackLoaded = useCallback((t: Track) => {
    setFullTrack(t)
    setTrack(t)
    setProgress(0)
    progressRef.current = 0
    setIsPlaying(false)
  }, [])

  const handleJourneyComplete = useCallback((t: Track) => {
    setFullTrack(t)
    setTrack(t)
    setProgress(0)
    progressRef.current = 0
    setIsPlaying(false)
    setIsCreatingJourney(false)
  }, [])

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
    setShowExport(false)
  }, [])

  const handleToggleFollowCamera = useCallback(() => {
    setFollowCamera((f) => !f)
  }, [])

  const handleStartNewTrack = useCallback(() => {
    setTrack(null)
    setFullTrack(null)
    setIsCreatingJourney(true)
  }, [])

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
      await mapHandle.waitForIdle(abortController.signal)

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
        () => mapHandle.waitForIdle(abortController.signal),
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
  }, [track, scenes, addToast, t])

  const handleResetExport = useCallback(() => {
    if (exportedVideoUrl) {
      URL.revokeObjectURL(exportedVideoUrl)
    }
    setExportedVideoUrl(null)
    setExportState('idle')
    setShowExport(false)
  }, [exportedVideoUrl])

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
    const cumulDist = computeCumulativeDistances(track.points)
    const cameraState = computeCameraForScene(track, cumulDist, scene, 0.5, 0)
    mapViewRef.current?.applyCameraState(cameraState)
  }, [track])

  const handleModeChange = useCallback((mode: 'dark' | 'light') => {
    // Auto-match map style with theme
    setMapStyleKey(mode === 'dark' ? 'dark' : 'voyager')
  }, [])

  const cycleStyle = useCallback(() => {
    const keys = Object.keys(MAP_STYLES) as MapStyleKey[]
    const idx = keys.indexOf(mapStyleKey)
    setMapStyleKey(keys[(idx + 1) % keys.length])
  }, [mapStyleKey])

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

      {/* Theme toggle + Language picker */}
      <div data-testid="global-toolbar" className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <select
          value={locale}
          onChange={e => setLocale(e.target.value as Locale)}
          aria-label={t('locale.label')}
          className="gi px-2 py-1.5 text-xs font-medium cursor-pointer appearance-none text-center"
          style={{ color: 'var(--t2)', minWidth: '3.5rem' }}
        >
          <option value="en">EN</option>
          <option value="ko">KO</option>
          <option value="ja">JA</option>
          <option value="zh">ZH</option>
          <option value="es">ES</option>
        </select>
        <ThemeToggle onModeChange={handleModeChange} />
      </div>

      {/* Keyboard help button — hidden on touch devices */}
      {track && (
        <button
          onClick={() => setShowKeyboardHelp(h => !h)}
          aria-label={t('shortcuts.title')}
          className="absolute bottom-4 right-4 z-10 gi w-8 h-8 text-sm font-bold cursor-pointer hidden sm:flex items-center justify-center"
          style={{ color: 'var(--t4)', borderRadius: '50%' }}
        >?</button>
      )}

      {/* Keyboard shortcuts overlay */}
      {showKeyboardHelp && (
        <div className="absolute inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowKeyboardHelp(false)}>
          <div className="go p-6 max-w-xs w-full mx-4" style={{ borderRadius: 'var(--r-glass)' }}
            onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--t1)' }}>{t('shortcuts.title')}</h3>
            <div className="space-y-2 text-xs" style={{ color: 'var(--t3)' }}>
              {([
                ['Space', t('shortcuts.playPause')],
                ['← →', t('shortcuts.seek')],
                ['F', t('shortcuts.follow')],
                ['E', t('shortcuts.export')],
                ['Esc', t('shortcuts.close')],
                ['?', t('shortcuts.help')],
              ] as const).map(([key, desc]) => (
                <div key={key} className="flex items-center gap-3">
                  <kbd className="gi px-2 py-0.5 text-[10px] font-mono font-bold shrink-0"
                    style={{ color: 'var(--t2)', minWidth: '2.5rem', textAlign: 'center' }}>{key}</kbd>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!track && !isCreatingJourney && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={handleStartJourney}
            className="gi px-6 py-3 text-sm font-medium cursor-pointer"
            style={{ color: 'var(--t2)' }}
          >
            {t('app.createJourney')}
          </button>
        </div>
      )}

      {!track && isCreatingJourney && (
        <JourneyCreator
          isActive={isCreatingJourney}
          onComplete={handleJourneyComplete}
          onCancel={handleCancelJourney}
          mapRef={mapViewRef}
        />
      )}

      <GoogleGuide
        isOpen={showGoogleGuide}
        onClose={handleCloseGoogleGuide}
      />

      {/* Top-right toolbar */}
      {track && (
        <div data-testid="track-toolbar" className="absolute left-4 right-4 top-20 z-10 flex flex-wrap justify-end gap-2 sm:left-auto sm:right-16 sm:top-4 sm:max-w-[calc(100vw-5rem)]">
          <button
            onClick={handleStartNewTrack}
            aria-label={t('app.newJourneyAria')}
            title={t('app.newJourneyAria')}
            className="gi px-3 py-2 text-sm font-medium cursor-pointer"
            style={{ color: 'var(--t1)', boxShadow: '0 0 0 1px rgba(var(--gl),.35), 0 4px 12px rgba(0,0,0,.1)' }}
          >
            <Plus size={14} strokeWidth={2.5} className="inline -mt-px" />{' '}{t('app.new')}
          </button>
          <button
            onClick={handleToggleSceneEditor}
            title={t('app.openSceneEditor')}
            className={`gi px-3 py-2 text-sm font-medium cursor-pointer ${
              showSceneEditor ? '' : ''
            }`}
            style={showSceneEditor
              ? { background: 'rgba(var(--gl),.85)', color: '#fff', border: '1px solid rgba(var(--gl),.5)' }
              : { color: 'var(--t1)' }
            }
          >
            {t('app.scenes')}
          </button>
          <button
            data-testid="map-style-button"
            onClick={cycleStyle}
            title={t('app.cycleMapStyle')}
            className="gi px-3 py-2 text-sm font-medium cursor-pointer"
            style={{ color: 'var(--t1)' }}
          >
            {t('app.mapStylePrefix')} {t(`mapStyle.${mapStyleKey}` as 'mapStyle.voyager')}
          </button>
          <button
            onClick={handleOpenExport}
            title={t('app.exportVideoKey')}
            className="vitro-btn-primary px-4 py-2 text-sm font-medium cursor-pointer"
          >
            {t('app.export')}
          </button>
        </div>
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
          className="hidden sm:block absolute left-4 right-4 top-36 z-10 gi px-4 py-2 text-sm font-medium text-center leading-tight sm:left-1/2 sm:right-auto sm:top-4 sm:w-auto sm:max-w-[min(36rem,calc(100vw-28rem))] sm:-translate-x-1/2 sm:whitespace-nowrap"
          style={{ color: 'var(--t1)' }}>
          {track.name} — {track.points.length.toLocaleString()} / {fullTrack!.points.length.toLocaleString()} {t('timeline.points')}
        </div>
      )}

      {fullTrack && fullTrack.points.length > 2 && (
        <div className="absolute bottom-28 left-0 right-0 z-10 px-4">
          <TimelineSelector
            track={fullTrack}
            onRangeChange={handleRangeChange}
          />
        </div>
      )}

      {track && (
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div className="px-4 pb-1 sm:hidden">
            <div
              data-testid="track-title-mobile"
              className="gi px-3 py-2 text-[11px] font-medium text-center leading-tight"
              style={{ color: 'var(--t1)' }}
            >
              {track.name} — {track.points.length.toLocaleString()} / {fullTrack!.points.length.toLocaleString()} {t('timeline.points')}
            </div>
          </div>
          <div className="px-4 mb-1">
            <ElevationProfile track={track} progress={progress} onSeek={handleSeek} />
          </div>
          <Controls
            track={track}
            isPlaying={isPlaying}
            progress={progress}
            speed={speed}
            duration={duration}
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
