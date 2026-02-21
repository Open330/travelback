'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { Track, MapStyleKey } from '@/types'
import MapView, { type MapViewHandle } from '@/components/MapView'
import FileUpload from '@/components/FileUpload'
import Controls from '@/components/Controls'
import ExportPanel, { type ExportSettings } from '@/components/ExportPanel'
import TimelineSelector from '@/components/TimelineSelector'
import JourneyCreator from '@/components/JourneyCreator'
import GoogleGuide from '@/components/GoogleGuide'
import { MAP_STYLES } from '@/types'

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

  const handleExport = useCallback(async (settings: ExportSettings) => {
    const canvas = mapViewRef.current?.getCanvas()
    if (!canvas || !track) return

    setIsExporting(true)
    setExportProgress(0)
    setIsPlaying(false)

    try {
      const stream = canvas.captureStream(settings.fps)
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm'
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8_000_000,
      })
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      const downloadPromise = new Promise<void>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${track.name.replace(/[^a-zA-Z0-9]/g, '_')}_travelback.webm`
          a.click()
          URL.revokeObjectURL(url)
          resolve()
        }
      })

      recorder.start()

      // Run animation programmatically
      const totalFrames = settings.duration * settings.fps
      const progressStep = 1 / totalFrames
      const frameInterval = 1000 / settings.fps

      for (let frame = 0; frame <= totalFrames; frame++) {
        const p = Math.min(frame * progressStep, 1)
        setProgress(p)
        progressRef.current = p
        setExportProgress(p)

        await new Promise((r) => setTimeout(r, frameInterval))
      }

      recorder.stop()
      await downloadPromise
    } catch (err) {
      console.error('Export failed:', err)
      alert('Video export failed. Your browser may not support MediaRecorder with canvas capture.')
    } finally {
      setIsExporting(false)
      setExportProgress(0)
      setShowExport(false)
    }
  }, [track])

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
