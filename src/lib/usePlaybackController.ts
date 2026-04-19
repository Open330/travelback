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
  const lastTimeRef = useRef<number>(0)
  const progressRef = useRef(0)
  const speedRef = useRef(speed)
  const durationRef = useRef(duration)
  const isPlayingRef = useRef(false)

  useEffect(() => {
    isPlayingRef.current = isPlaying
    progressRef.current = progress
    speedRef.current = speed
    durationRef.current = duration
  }, [isPlaying, progress, speed, duration])

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

    lastTimeRef.current = performance.now()

    const animate = (now: number) => {
      if (!isPlayingRef.current) return
      const rawDt = (now - lastTimeRef.current) / 1000
      const dt = Math.min(rawDt, 1 / 30)
      lastTimeRef.current = now

      const increment = (dt * speedRef.current) / durationRef.current
      const nextProgress = progressRef.current + increment

      if (nextProgress >= 1) {
        setPlaybackProgress(1)
        setIsPlaying(false)
        return
      }

      setPlaybackProgress(nextProgress)
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
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
        target?.closest('button, a, summary, [role="dialog"], [contenteditable="true"], [data-disable-playback-hotkeys="true"]')
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
          event.preventDefault()
          onStepSeek(0.02)
          break
        case 'ArrowLeft':
          event.preventDefault()
          onStepSeek(-0.02)
          break
        case 'f':
        case 'F':
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
