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

  const mapViewRef = useRef<MapViewHandle>(null)
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const progressRef = useRef(0)

  // Keep progressRef in sync
  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !track) return

    lastTimeRef.current = performance.now()

    const animate = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000
      lastTimeRef.current = now

      const increment = (dt * speed) / duration
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
  }, [isPlaying, speed, duration, track])

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

      // Wait for resize
      await new Promise(r => setTimeout(r, 500))
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
      )

      downloadVideo(result)
    } catch (err) {
      console.error('Export failed:', err)
      alert(`Video export failed: ${err instanceof Error ? err.message : 'Unknown error'}. Your browser may not support WebCodecs with the selected codec.`)
    } finally {
      // Restore original map size
      mapViewRef.current?.resetSize()
      await new Promise(r => setTimeout(r, 200))
      setIsExporting(false)
      setExportProgress(0)
      setShowExport(false)
    }
  }, [track, scenes])

  const cycleStyle = useCallback(() => {
    const keys: MapStyleKey[] = ['voyager', 'positron', 'dark']
    const idx = keys.indexOf(mapStyleKey)
    setMapStyleKey(keys[(idx + 1) % keys.length])
  }, [mapStyleKey])

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <MapView
        ref={mapViewRef}
        track={track}
        progress={progress}
        mapStyleKey={mapStyleKey}
        followCamera={followCamera}
        scenes={scenes}
      />

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
        <div className="absolute top-4 right-16 z-10 flex gap-2">
          <button
            onClick={() => {
              setTrack(null)
              setFullTrack(null)
              setIsCreatingJourney(true)
            }}
            className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            Create New
          </button>
          <button
            onClick={() => setShowSceneEditor(s => !s)}
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
            className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm
              px-3 py-2 rounded-lg shadow-lg text-sm font-medium
              text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700
              transition-colors cursor-pointer"
          >
            {MAP_STYLES[mapStyleKey].label}
          </button>
          <button
            onClick={() => setShowExport(true)}
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

      {fullTrack && fullTrack.points.length > 10 && (
        <div className="absolute bottom-28 left-0 right-0 z-10 px-4">
          <TimelineSelector
            track={fullTrack}
            onRangeChange={handleRangeChange}
          />
        </div>
      )}

      {track && (
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
      )}

      <ExportPanel
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        onExport={handleExport}
        isExporting={isExporting}
        exportProgress={exportProgress}
      />
    </div>
  )
}
