'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { MapStyleKey, Scene, Track } from '@/types'
import type { UnitSystem } from '@/lib/interpolate'
import { useLocale } from '@/lib/i18n'
import Controls from '@/components/Controls'
import ElevationProfile from '@/components/ElevationProfile'
import SceneEditor from '@/components/SceneEditor'
import TimelineSelector from '@/components/TimelineSelector'
import TrackToolbar from '@/components/TrackToolbar'

interface TrackWorkspaceProps {
  fullTrack: Track
  track: Track
  trackSessionKey: number
  mapStyleKey: MapStyleKey
  showSceneEditor: boolean
  scenes: Scene[]
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
  units: UnitSystem
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
  trackSessionKey,
  mapStyleKey,
  showSceneEditor,
  scenes,
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
  units,
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
        className="hidden sm:block absolute left-4 right-4 top-36 z-10 gi px-4 py-2 text-sm font-medium text-center leading-tight sm:top-4 sm:left-36 sm:right-[34rem] sm:overflow-hidden sm:text-ellipsis sm:whitespace-nowrap"
        style={{ color: 'var(--t1)' }}
      >
        {track.name} — {track.points.length.toLocaleString()} / {fullTrack.points.length.toLocaleString()} {t('timeline.points')}
      </div>

      {fullTrack.points.length > 2 && (
        <div className="absolute bottom-44 sm:bottom-36 left-0 right-0 z-10 px-4">
          <TimelineSelector
            key={trackSessionKey}
            track={fullTrack}
            onRangeChange={onRangeChange}
          />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="px-4 pb-0.5 sm:hidden">
          <div
            data-testid="track-title-mobile"
            className="gi px-3 py-1.5 text-[10px] font-medium text-center leading-tight truncate"
            style={{ color: 'var(--t1)' }}
          >
            {track.name}
          </div>
        </div>
        <div className="px-4 mb-1.5">
          <ElevationProfile track={track} progress={progress} onSeek={onSeek} units={units} />
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
