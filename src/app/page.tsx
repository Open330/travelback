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
        <div className="absolute inset-0 z-20 bg-zinc-900/70 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center text-white">
            <div className="inline-block w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-lg font-medium">Rendering video...</p>
            <p className="text-sm text-zinc-300 mt-1">{Math.round(exportProgress * 100)}%</p>
            <button
              onClick={() => exportAbortRef.current?.abort()}
              aria-label="Cancel export"
              className="mt-4 px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white text-sm rounded-lg transition-colors cursor-pointer"
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

      {!track && !isCreatingJourney && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={() => setIsCreatingJourney(true)}
            className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm px-6 py-3 rounded-xl shadow-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition-colors cursor-pointer"
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
            className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 transition-colors cursor-pointer ring-1 ring-cyan-400/50"
          >
            ＋ New
          </button>
          <button
            onClick={() => setShowSceneEditor(s => !s)}
            title="Open scene editor"
            className={`backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors cursor-pointer ${
              showSceneEditor
                ? 'bg-cyan-500 text-white'
                : 'bg-white/90 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700'
            }`}
          >
            Scenes
          </button>
          <button
            onClick={cycleStyle}
            title="Cycle map style"
            className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm
              px-3 py-2 rounded-lg shadow-lg text-sm font-medium
              text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700
              transition-colors cursor-pointer"
          >
            {MAP_STYLES[mapStyleKey].label}
          </button>
          <button
            onClick={() => setShowExport(true)}
            title="Export video (E)"
            className="bg-cyan-500 hover:bg-cyan-600 text-white
              px-4 py-2 rounded-lg shadow-lg text-sm font-medium
              transition-colors cursor-pointer"
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
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10
          bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm px-4 py-2
          rounded-lg shadow-lg text-sm font-medium text-zinc-700 dark:text-zinc-200">
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
