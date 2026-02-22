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
import { generateDefaultScenes } from '@/lib/camera'
import { exportVideo, downloadVideo } from '@/lib/videoEncoder'

export default function Home() {
  const [fullTrack, setFullTrack] = useState<Track | null>(null)
  const [track, setTrack] = useState<Track | null>(null)
  const [timelineRange, setTimelineRange] = useState<[number, number] | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [duration, setDuration] = useState(30)
  const [mapStyleKey, setMapStyleKey] = useState<MapStyleKey>('voyager')
  const [followCamera, setFollowCamera] = useState(true)
  const [showExport, setShowExport] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [isCreatingJourney, setIsCreatingJourney] = useState(false)
  const [showGoogleGuide, setShowGoogleGuide] = useState(false)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [showSceneEditor, setShowSceneEditor] = useState(false)
  const [transitionDuration, setTransitionDuration] = useState(0.03)
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
        setIsPlaying(false)
        return
      }

      setProgress(next)
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
          setProgress(p => Math.min(1, p + 0.02))
          break
        case 'ArrowLeft':
          e.preventDefault()
          setProgress(p => Math.max(0, p - 0.02))
          break
        case 'f':
        case 'F':
          setFollowCamera(f => !f)
          break
        case 'e':
        case 'E':
          if (track && !isExporting) setShowExport(s => !s)
          break
        case 'Escape':
          setShowExport(false)
          setShowSceneEditor(false)
          setShowGoogleGuide(false)
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
    setIsPlaying(false)
  }, [])

  const handleJourneyComplete = useCallback((t: Track) => {
    setFullTrack(t)
    setTrack(t)
    setProgress(0)
    setIsPlaying(false)
    setIsCreatingJourney(false)
  }, [])

  const handleTogglePlay = useCallback(() => {
    if (progress >= 1) {
      setProgress(0)
      setIsPlaying(true)
    } else {
      setIsPlaying((p) => !p)
    }
  }, [progress])

  const handleSeek = useCallback((p: number) => {
    setProgress(p)
    progressRef.current = p
  }, [])

  const handleExport = useCallback(async (config: ExportConfig) => {
    const mapHandle = mapViewRef.current
    const canvas = mapHandle?.getCanvas()
    if (!canvas || !track || !mapHandle) return

    const abortController = new AbortController()
    exportAbortRef.current = abortController

    setIsExporting(true)
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
      await mapHandle.waitForIdle()

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
        () => mapHandle.waitForIdle(),
        abortController.signal,
      )

      downloadVideo(result)
      addToast('Video exported successfully!', 'success')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        addToast('Export cancelled.', 'info')
      } else {
        console.error('Export failed:', err)
        addToast(
          `Export failed: ${err instanceof Error ? err.message : 'Unknown error'}. Your browser may not support WebCodecs with the selected codec.`,
          'error',
        )
      }
    } finally {
      exportAbortRef.current = null
      // Restore original map size
      mapViewRef.current?.resetSize()
      await new Promise(r => setTimeout(r, 200))
      setIsExporting(false)
      setExportProgress(0)
      setShowExport(false)
    }
  }, [track, scenes, addToast])

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
        scenes={scenes}
        duration={duration}
        transitionDuration={transitionDuration}
      />

      {isExporting && (
        <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(12px)' }}>
          <div className="go p-8 text-center" style={{ color: 'var(--t1)' }}>
            <div className="inline-block w-12 h-12 border-4 rounded-full animate-spin mb-4" style={{ borderColor: 'rgba(var(--gl),.6)', borderTopColor: 'transparent' }} />
            <p className="text-lg font-medium">Rendering video...</p>
            <p className="text-sm mt-1" style={{ color: 'var(--t3)' }}>{Math.round(exportProgress * 100)}%</p>
            <button
              onClick={() => exportAbortRef.current?.abort()}
              aria-label="Cancel export"
              className="gi mt-4 px-4 py-2 text-sm cursor-pointer"
              style={{ background: 'rgba(var(--err-rgb, 244,63,94),.7)', color: '#fff', border: 'none' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!isCreatingJourney && (
        <FileUpload
          onTrackLoaded={handleTrackLoaded}
          hasTrack={track !== null}
          onShowGoogleGuide={() => setShowGoogleGuide(true)}
        />
      )}

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {!track && !isCreatingJourney && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={() => setIsCreatingJourney(true)}
            className="gi px-6 py-3 text-sm font-medium cursor-pointer"
            style={{ color: 'var(--t2)' }}
          >
            or create a journey manually
          </button>
        </div>
      )}

      {!track && isCreatingJourney && (
        <JourneyCreator
          isActive={isCreatingJourney}
          onComplete={handleJourneyComplete}
          onCancel={() => setIsCreatingJourney(false)}
          mapRef={mapViewRef}
        />
      )}

      <GoogleGuide
        isOpen={showGoogleGuide}
        onClose={() => setShowGoogleGuide(false)}
      />

      {/* Top-right toolbar */}
      {track && (
        <div className="absolute top-4 right-16 z-10 flex flex-wrap gap-2 max-w-[calc(100vw-5rem)]">
          <button
            onClick={() => {
              setTrack(null)
              setFullTrack(null)
              setIsCreatingJourney(true)
            }}
            aria-label="Create a new journey"
            title="Create a new journey"
            className="gi px-3 py-2 text-sm font-medium cursor-pointer"
            style={{ color: 'var(--t1)', boxShadow: '0 0 0 1px rgba(var(--gl),.35), 0 4px 12px rgba(0,0,0,.1)' }}
          >
            <Plus size={14} strokeWidth={2.5} className="inline -mt-px" />{' '}New
          </button>
          <button
            onClick={() => setShowSceneEditor(s => !s)}
            title="Open scene editor"
            className={`gi px-3 py-2 text-sm font-medium cursor-pointer ${
              showSceneEditor ? '' : ''
            }`}
            style={showSceneEditor
              ? { background: 'rgba(var(--gl),.85)', color: '#fff', border: '1px solid rgba(var(--gl),.5)' }
              : { color: 'var(--t1)' }
            }
          >
            Scenes
          </button>
          <button
            onClick={cycleStyle}
            title="Cycle map style"
            className="gi px-3 py-2 text-sm font-medium cursor-pointer"
            style={{ color: 'var(--t1)' }}
          >
            {MAP_STYLES[mapStyleKey].label}
          </button>
          <button
            onClick={() => setShowExport(true)}
            title="Export video (E)"
            className="vitro-btn-primary px-4 py-2 text-sm font-medium cursor-pointer"
          >
            Export
          </button>
        </div>
      )}

      {/* Scene Editor */}
      {track && showSceneEditor && (
        <SceneEditor
          scenes={scenes}
          onChange={setScenes}
          onClose={() => setShowSceneEditor(false)}
          transitionDuration={transitionDuration}
          onTransitionDurationChange={setTransitionDuration}
        />
      )}

      {/* Track name */}
      {track && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 gi px-4 py-2 text-sm font-medium"
          style={{ color: 'var(--t1)' }}>
          {track.name} — {track.points.length.toLocaleString()} / {fullTrack!.points.length.toLocaleString()} points
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
            onFollowCameraToggle={() => setFollowCamera((f) => !f)}
          />
        </div>
      )}

      <ExportPanel
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        onExport={handleExport}
        isExporting={isExporting}
        exportProgress={exportProgress}
      />

      <Toast messages={toasts} onDismiss={dismissToast} />
    </div>
    </ErrorBoundary>
  )
}
