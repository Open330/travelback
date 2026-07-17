'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { Track } from '@/types'

interface PlaybackHotkeysOptions {
  track: Track | null
  isExporting: boolean
  onTogglePlay: () => void
  onStepSeek: (delta: number) => void
  onToggleFollowCamera: () => void
  onToggleExport: () => void
  onToggleKeyboardHelp: () => void
  onClosePanels: () => void
}

export function usePlaybackController(track: Track | null) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [duration, setDuration] = useState(30)
  const [followCamera, setFollowCamera] = useState(true)
  const [seekNonce, setSeekNonce] = useState(0)

  const animFrameRef = useRef<number>(0)
  const fallbackTimerRef = useRef<number>(0)
  const progressRef = useRef(0)
  const speedRef = useRef(speed)
  const durationRef = useRef(duration)
  const isPlayingRef = useRef(false)
  const startTimestampRef = useRef<number>(0)
  const startProgressRef = useRef<number>(0)
  const awaitingFirstFrameRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    isPlayingRef.current = isPlaying
    progressRef.current = progress
  }, [isPlaying, progress])

  useEffect(() => {
    speedRef.current = speed
    durationRef.current = duration
    if (isPlayingRef.current) {
      startTimestampRef.current = performance.now()
      startProgressRef.current = progressRef.current
      awaitingFirstFrameRef.current = false
    }
  }, [speed, duration])

  const setPlaybackProgress = useCallback((nextProgress: number) => {
    setProgress(nextProgress)
    progressRef.current = nextProgress
  }, [])

  const pausePlayback = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const resetPlayback = useCallback((nextProgress = 0) => {
    setPlaybackProgress(nextProgress)
    setIsPlaying(false)
  }, [setPlaybackProgress])

  const resetPlaybackSession = useCallback((nextProgress = 0) => {
    setPlaybackProgress(nextProgress)
    setIsPlaying(false)
    setSpeed(1)
    setDuration(30)
    setFollowCamera(true)
  }, [setPlaybackProgress])

  const togglePlay = useCallback(() => {
    if (progressRef.current >= 1) {
      setPlaybackProgress(0)
      setIsPlaying(true)
      return
    }

    setIsPlaying((playing) => !playing)
  }, [setPlaybackProgress])

  const seekTo = useCallback((nextProgress: number) => {
    const safe = Number.isFinite(nextProgress) ? nextProgress : 0
    const clampedProgress = Math.min(1, Math.max(0, safe))
    setPlaybackProgress(clampedProgress)

    if (isPlayingRef.current) {
      startProgressRef.current = clampedProgress
      startTimestampRef.current = performance.now()
      awaitingFirstFrameRef.current = false

      if (clampedProgress >= 1) {
        isPlayingRef.current = false
        setIsPlaying(false)
      }
    }

    setSeekNonce((nonce) => nonce + 1)
  }, [setPlaybackProgress])

  const stepSeek = useCallback((delta: number) => {
    seekTo(progressRef.current + delta)
  }, [seekTo])

  const toggleFollowCamera = useCallback(() => {
    setFollowCamera((following) => !following)
  }, [])

  useEffect(() => {
    if (!isPlaying || !track) return

    mountedRef.current = true

    // Use accumulator-based progress: record the timestamp and progress
    // when playback starts so each frame computes nextProgress from
    // elapsed wall-clock time rather than accumulating dt values.  This
    // eliminates both floating-point accumulation error and frame-rate
    // dependency (e.g. when rAF is throttled in background tabs).
    startProgressRef.current = progressRef.current
    awaitingFirstFrameRef.current = true

    const scheduleNextFrame = () => {
      cancelAnimationFrame(animFrameRef.current)
      window.clearTimeout(fallbackTimerRef.current)
      animFrameRef.current = requestAnimationFrame(animate)
      // Only schedule the fallback timer when the tab is hidden — in the
      // foreground rAF fires at 60 Hz and the timeout is wasted allocation.
      if (document.visibilityState === 'hidden') {
        fallbackTimerRef.current = window.setTimeout(() => animate(performance.now()), 250)
      }
    }

    const animate = (now: number) => {
      cancelAnimationFrame(animFrameRef.current)
      window.clearTimeout(fallbackTimerRef.current)
      if (!isPlayingRef.current || !mountedRef.current) return
      if (awaitingFirstFrameRef.current) {
        awaitingFirstFrameRef.current = false
        startTimestampRef.current = now
        setPlaybackProgress(startProgressRef.current)
        scheduleNextFrame()
        return
      }

      const elapsedSec = (now - startTimestampRef.current) / 1000
      const nextProgress = startProgressRef.current + (elapsedSec * speedRef.current) / durationRef.current

      if (nextProgress >= 1) {
        setPlaybackProgress(1)
        setIsPlaying(false)
        return
      }

      setPlaybackProgress(nextProgress)
      scheduleNextFrame()
    }

    scheduleNextFrame()

    return () => {
      mountedRef.current = false
      awaitingFirstFrameRef.current = false
      cancelAnimationFrame(animFrameRef.current)
      window.clearTimeout(fallbackTimerRef.current)
    }
  }, [isPlaying, track, setPlaybackProgress])

  return {
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
  }
}

export function usePlaybackHotkeys({
  track,
  isExporting,
  onTogglePlay,
  onStepSeek,
  onToggleFollowCamera,
  onToggleExport,
  onToggleKeyboardHelp,
  onClosePanels,
}: PlaybackHotkeysOptions) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName
      const isInteractiveTarget = Boolean(
        target?.closest('button, a, summary, canvas.maplibregl-canvas, [role="dialog"], [role="slider"], [role="spinbutton"], [contenteditable="true"], [data-disable-playback-hotkeys="true"]')
      )

      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || isInteractiveTarget) {
        return
      }

      // Suppress all playback hotkeys during video export to prevent
      // progress/camera state conflicts that would corrupt the exported video
      if (isExporting) return

      switch (event.key) {
        case ' ':
          event.preventDefault()
          if (track) {
            onTogglePlay()
          }
          break
        case 'ArrowRight':
          if (!track) break
          event.preventDefault()
          onStepSeek(0.02)
          break
        case 'ArrowLeft':
          if (!track) break
          event.preventDefault()
          onStepSeek(-0.02)
          break
        case 'f':
        case 'F':
          if (!track) break
          onToggleFollowCamera()
          break
        case 'e':
        case 'E':
          if (track) {
            onToggleExport()
          }
          break
        case '?':
          onToggleKeyboardHelp()
          break
        case 'Escape':
          onClosePanels()
          break
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [
    isExporting,
    onClosePanels,
    onStepSeek,
    onToggleExport,
    onToggleFollowCamera,
    onToggleKeyboardHelp,
    onTogglePlay,
    track,
  ])
}
