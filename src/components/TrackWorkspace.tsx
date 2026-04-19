'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { MapStyleKey, Scene, Track } from '@/types'
import type { UnitSystem } from '@/lib/interpolate'
import { useLocale, type Locale } from '@/lib/i18n'
import Controls from '@/components/Controls'
import ElevationProfile from '@/components/ElevationProfile'
import SceneEditor from '@/components/SceneEditor'
import TimelineSelector from '@/components/TimelineSelector'
import TrackToolbar from '@/components/TrackToolbar'

interface TrackWorkspaceProps {
  fullTrack: Track
  track: Track
  cumulativeDistances: number[]
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
  onScenesChange: Dispatch<SetStateAction<Scene[]>>
  transitionDuration: number
  onTransitionDurationChange: (duration: number) => void
  onPreviewScene: (scene: Scene | null) => void
  onStartNewTrack: () => void
  onToggleSceneEditor: () => void
  onCloseSceneEditor: () => void
  onCycleStyle: () => void
  onOpenExport: () => void
  onRangeChange: (startIdx: number, endIdx: number) => void
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
  onScenesChange,
  transitionDuration,
  onTransitionDurationChange,
  onPreviewScene,
  onStartNewTrack,
  onToggleSceneEditor,
  onCloseSceneEditor,
  onCycleStyle,
  onOpenExport,
  onRangeChange,
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
        onStartNewTrack={onStartNewTrack}
        onToggleSceneEditor={onToggleSceneEditor}
        onCycleStyle={onCycleStyle}
        onOpenExport={onOpenExport}
      />

      {showSceneEditor && (
        <SceneEditor
          scenes={scenes}
          onChange={onScenesChange}
          onClose={onCloseSceneEditor}
          transitionDuration={transitionDuration}
          onTransitionDurationChange={onTransitionDurationChange}
          onPreviewScene={onPreviewScene}
        />
      )}

      <div
        data-testid="track-title"
        className="absolute left-4 right-56 top-4 z-10 hidden overflow-hidden text-ellipsis whitespace-nowrap gi px-4 py-2 text-sm font-medium leading-tight text-center lg:block"
        style={{ color: 'var(--t1)' }}
      >
        {track.name}<span className="hidden xl:inline"> — {track.points.length.toLocaleString()} / {fullTrack.points.length.toLocaleString()} {t('timeline.points')}</span>
      </div>

      {fullTrack.points.length > 2 && (
        <div className="absolute bottom-40 left-0 right-0 z-10 px-4 sm:bottom-36">
          <TimelineSelector
            key={trackSessionKey}
            track={fullTrack}
            cumulativeDistances={cumulativeDistances}
            onRangeChange={onRangeChange}
          />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="px-4 mb-1.5">
          <ElevationProfile track={track} cumulativeDistances={cumulativeDistances} progress={progress} onSeek={onSeek} units={units} />
        </div>
        <Controls
          track={track}
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
