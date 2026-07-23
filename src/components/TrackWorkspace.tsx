'use client'

import { useLayoutEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import type { MapStyleKey, Scene, Track } from '@/types'
import type { UnitSystem } from '@/lib/interpolate'
import { resolveTrackDisplayName, useLocale, type Locale } from '@/lib/i18n'
import Controls from '@/components/Controls'
import ElevationProfile from '@/components/ElevationProfile'
import SceneEditor from '@/components/SceneEditor'
import TimelineSelector from '@/components/TimelineSelector'
import TrackToolbar from '@/components/TrackToolbar'

interface TrackWorkspaceProps {
  fullTrack: Track
  track: Track
  cumulativeDistances: number[]
  fullTrackCumulativeDistances: number[]
  trackSessionKey: number
  mapStyleKey: MapStyleKey
  showSceneEditor: boolean
  scenes: Scene[]
  locale: Locale
  setLocale: Dispatch<SetStateAction<Locale>> | ((locale: Locale) => void)
  mode: 'dark' | 'light'
  onModeChange: (mode: 'dark' | 'light') => void
  units: UnitSystem
  onUnitsChange: (units: UnitSystem) => void
  onOpenHelp: () => void
  onOpenImportGuide: () => void
  onScenesChange: Dispatch<SetStateAction<Scene[]>>
  onScenesCommitted: (scenes: Scene[]) => void
  transitionDuration: number
  onTransitionDurationChange: (duration: number) => void
  onPreviewScene: (scene: Scene | null) => void
  onStartNewTrack: () => void
  onToggleSceneEditor: () => void
  onCloseSceneEditor: () => void
  onCycleStyle: () => void
  onOpenExport: () => void
  onRangeChange: (startIdx: number, endIdx: number) => void
  acceptedTrimRange: { startIdx: number; endIdx: number }
  trimSelectionRevision: number
  progress: number
  isPlaying: boolean
  speed: number
  duration: number
  followCamera: boolean
  onTogglePlay: () => void
  onSeek: (progress: number) => void
  onSpeedChange: (speed: number) => void
  onDurationChange: (duration: number) => void
  onFollowCameraToggle: () => void
}

export default function TrackWorkspace({
  fullTrack,
  track,
  cumulativeDistances,
  fullTrackCumulativeDistances,
  trackSessionKey,
  mapStyleKey,
  showSceneEditor,
  scenes,
  locale,
  setLocale,
  mode,
  onModeChange,
  units,
  onUnitsChange,
  onOpenHelp,
  onOpenImportGuide,
  onScenesChange,
  onScenesCommitted,
  transitionDuration,
  onTransitionDurationChange,
  onPreviewScene,
  onStartNewTrack,
  onToggleSceneEditor,
  onCloseSceneEditor,
  onCycleStyle,
  onOpenExport,
  onRangeChange,
  acceptedTrimRange,
  trimSelectionRevision,
  progress,
  isPlaying,
  speed,
  duration,
  followCamera,
  onTogglePlay,
  onSeek,
  onSpeedChange,
  onDurationChange,
  onFollowCameraToggle,
}: TrackWorkspaceProps) {
  const { t } = useLocale()
  const displayName = resolveTrackDisplayName(track, t)
  const bottomStackRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const bottomStack = bottomStackRef.current
    const appRoot = bottomStack?.closest<HTMLElement>('[data-travelback-app-root="true"]')
    const toolbar = appRoot?.querySelector<HTMLElement>('[data-testid="track-toolbar"]')
    if (!bottomStack || !appRoot || !toolbar) return

    const bottomStackProperty = '--track-bottom-stack-height'
    const toolbarProperty = '--track-toolbar-reserved-inline-end'
    const previousBottomStackValue = appRoot.style.getPropertyValue(bottomStackProperty)
    const previousToolbarValue = appRoot.style.getPropertyValue(toolbarProperty)

    const updateMeasurements = () => {
      const stackRect = bottomStack.getBoundingClientRect()
      const stackHeight = Math.max(stackRect.height, bottomStack.offsetHeight)
      if (stackHeight > 0) {
        appRoot.style.setProperty(bottomStackProperty, `${Math.ceil(stackHeight)}px`)
      }

      const appRect = appRoot.getBoundingClientRect()
      const toolbarRect = toolbar.getBoundingClientRect()
      const appWidth = Math.max(appRect.width, appRoot.clientWidth)
      const toolbarWidth = Math.max(toolbarRect.width, toolbar.offsetWidth)
      if (appWidth > 0 && toolbarWidth > 0) {
        const toolbarInlineStart = toolbarRect.left - appRect.left
        const reservedInlineEnd = Math.max(0, appWidth - toolbarInlineStart)
        appRoot.style.setProperty(toolbarProperty, `${Math.ceil(reservedInlineEnd)}px`)
      }
    }

    updateMeasurements()
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateMeasurements)
    resizeObserver?.observe(bottomStack)
    resizeObserver?.observe(toolbar)
    resizeObserver?.observe(appRoot)
    window.addEventListener('resize', updateMeasurements)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateMeasurements)
      if (previousBottomStackValue) {
        appRoot.style.setProperty(bottomStackProperty, previousBottomStackValue)
      } else {
        appRoot.style.removeProperty(bottomStackProperty)
      }
      if (previousToolbarValue) {
        appRoot.style.setProperty(toolbarProperty, previousToolbarValue)
      } else {
        appRoot.style.removeProperty(toolbarProperty)
      }
    }
  }, [locale, mapStyleKey, showSceneEditor])

  return (
    <>
      <TrackToolbar
        mapStyleKey={mapStyleKey}
        showSceneEditor={showSceneEditor}
        locale={locale}
        setLocale={setLocale}
        units={units}
        mode={mode}
        onUnitsChange={onUnitsChange}
        onModeChange={onModeChange}
        onOpenHelp={onOpenHelp}
        onOpenImportGuide={onOpenImportGuide}
        onStartNewTrack={onStartNewTrack}
        onToggleSceneEditor={onToggleSceneEditor}
        onCycleStyle={onCycleStyle}
        onOpenExport={onOpenExport}
      />

      {showSceneEditor && (
        <SceneEditor
          scenes={scenes}
          onChange={onScenesChange}
          onScenesCommitted={onScenesCommitted}
          onClose={onCloseSceneEditor}
          transitionDuration={transitionDuration}
          onTransitionDurationChange={onTransitionDurationChange}
          onPreviewScene={onPreviewScene}
        />
      )}

      <h1
        data-testid="track-title"
        className="track-title-desktop absolute left-4 top-4 z-20 hidden overflow-hidden text-ellipsis whitespace-nowrap gi px-4 py-2 text-sm font-medium leading-tight text-center md:block"
        style={{ color: 'var(--t1)', pointerEvents: 'none' }}
      >
        {displayName}<span className="hidden xl:inline"> — {track.points.length.toLocaleString(locale)} / {fullTrack.points.length.toLocaleString(locale)} {t('timeline.points')}</span>
      </h1>

      <h1
        data-testid="track-title-mobile"
        className="track-title-mobile absolute left-4 right-4 top-16 z-20 overflow-hidden text-ellipsis whitespace-nowrap gi px-3 py-2 text-xs font-medium leading-tight text-center md:hidden"
        style={{ color: 'var(--t1)', pointerEvents: 'none' }}
      >
        {displayName} — {track.points.length.toLocaleString(locale)} / {fullTrack.points.length.toLocaleString(locale)} {t('timeline.points')}
      </h1>

      <div ref={bottomStackRef} data-testid="track-bottom-stack" className="track-bottom-stack absolute bottom-0 left-0 right-0 z-10">
        {fullTrack.points.length > 2 && (
          <div className="mb-2 px-4">
            <TimelineSelector
              key={trackSessionKey}
              track={fullTrack}
              cumulativeDistances={fullTrackCumulativeDistances}
              onRangeChange={onRangeChange}
              onSeek={onSeek}
              acceptedRange={acceptedTrimRange}
              selectionRevision={trimSelectionRevision}
            />
          </div>
        )}
        <div className="px-4 mb-1.5">
          <ElevationProfile track={track} cumulativeDistances={cumulativeDistances} progress={progress} onSeek={onSeek} units={units} />
        </div>
        <Controls
          cumulativeDistances={cumulativeDistances}
          isPlaying={isPlaying}
          progress={progress}
          speed={speed}
          duration={duration}
          units={units}
          followCamera={followCamera}
          onTogglePlay={onTogglePlay}
          onSeek={onSeek}
          onSpeedChange={onSpeedChange}
          onDurationChange={onDurationChange}
          onFollowCameraToggle={onFollowCameraToggle}
        />
      </div>
    </>
  )
}
