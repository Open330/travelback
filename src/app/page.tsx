'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { Track, MapStyleKey } from '@/types'
import MapView, { type MapViewHandle } from '@/components/MapView'
import FileUpload from '@/components/FileUpload'
import Controls from '@/components/Controls'
import ExportPanel, { type ExportSettings } from '@/components/ExportPanel'
import { MAP_STYLES } from '@/types'

export default function Home() {
  const [track, setTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [duration, setDuration] = useState(30)
  const [mapStyleKey, setMapStyleKey] = useState<MapStyleKey>('voyager')
  const [followCamera, setFollowCamera] = useState(true)
  const [showExport, setShowExport] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

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

  const handleTrackLoaded = useCallback((t: Track) => {
    setTrack(t)
    setProgress(0)
    setIsPlaying(false)
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

      <FileUpload
        onTrackLoaded={handleTrackLoaded}
        hasTrack={track !== null}
      />

      {/* Top-right toolbar */}
      {track && (
        <div className="absolute top-4 right-16 z-10 flex gap-2">
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
          {track.name} — {track.points.length.toLocaleString()} points
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
