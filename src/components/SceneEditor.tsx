'use client'

import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import type { Scene, CameraMode } from '@/types'
import { CAMERA_MODE_LABELS, DEFAULT_CAMERA_PARAMS } from '@/types'
import { generateDefaultScenes, generateSimpleFlyover, generateBirdeyeFlyover, generateDynamicScenes } from '@/lib/camera'

const SCENE_COLORS = [
  'bg-cyan-400', 'bg-emerald-400', 'bg-amber-400', 'bg-violet-400',
  'bg-rose-400', 'bg-teal-400', 'bg-orange-400', 'bg-indigo-400',
]

interface SceneEditorProps {
  scenes: Scene[]
  onChange: (scenes: Scene[]) => void
  onClose: () => void
  transitionDuration: number
  onTransitionDurationChange: (v: number) => void
}

const MODES: CameraMode[] = ['overview', 'flyover', 'orbit', 'ground', 'closeup', 'birdeye']

export default function SceneEditor({ scenes, onChange, onClose, transitionDuration, onTransitionDurationChange }: SceneEditorProps) {
  const [deletedScene, setDeletedScene] = useState<{ scene: Scene; index: number } | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-clear undo after 5 seconds
  useEffect(() => {
    if (!deletedScene) return
    undoTimerRef.current = setTimeout(() => setDeletedScene(null), 5000)
    return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current) }
  }, [deletedScene])

  const addScene = useCallback(() => {
    const last = scenes[scenes.length - 1]
    const start = last ? last.endPercent : 0
    const end = Math.min(start + 0.15, 1)
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      name: `Scene ${scenes.length + 1}`,
      cameraMode: 'flyover',
      startPercent: start,
      endPercent: end,
      params: { ...DEFAULT_CAMERA_PARAMS.flyover },
    }
    onChange([...scenes, newScene])
  }, [scenes, onChange])

  const removeScene = useCallback((id: string) => {
    const idx = scenes.findIndex(s => s.id === id)
    if (idx >= 0) setDeletedScene({ scene: scenes[idx], index: idx })
    onChange(scenes.filter(s => s.id !== id))
  }, [scenes, onChange])

  const undoDelete = useCallback(() => {
    if (!deletedScene) return
    const restored = [...scenes]
    restored.splice(deletedScene.index, 0, deletedScene.scene)
    onChange(restored)
    setDeletedScene(null)
  }, [deletedScene, scenes, onChange])

  const updateScene = useCallback((id: string, patch: Partial<Scene>) => {
    onChange(scenes.map(s => {
      if (s.id !== id) return s
      const updated = { ...s, ...patch }
      // If camera mode changed, reset params to defaults
      if (patch.cameraMode && patch.cameraMode !== s.cameraMode) {
        updated.params = { ...DEFAULT_CAMERA_PARAMS[patch.cameraMode] }
      }
      return updated
    }))
  }, [scenes, onChange])

  // Detect overlaps and gaps
  const warnings = useMemo(() => {
    const sorted = [...scenes].sort((a, b) => a.startPercent - b.startPercent)
    const w: string[] = []
    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i]
      if (s.startPercent >= s.endPercent) {
        w.push(`"${s.name}" has start ≥ end`)
      }
      if (i > 0) {
        const prev = sorted[i - 1]
        if (s.startPercent < prev.endPercent) {
          w.push(`"${prev.name}" and "${s.name}" overlap`)
        }
      }
    }
    return w
  }, [scenes])

  return (
    <div className="absolute left-4 top-16 bottom-36 z-20 w-72 max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-zinc-800/95
      backdrop-blur-sm rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Scenes</h3>
        <div className="flex gap-2">
          <button onClick={addScene}
            className="text-xs px-2 py-1 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 cursor-pointer">
            + Add
          </button>
          <button onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="px-3 pt-2 flex flex-wrap gap-1">
        <span className="text-[10px] text-zinc-400 leading-6">Presets:</span>
        <button onClick={() => onChange(generateDefaultScenes())}
          className="text-[10px] px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 cursor-pointer">
          Cinematic
        </button>
        <button onClick={() => onChange(generateSimpleFlyover())}
          className="text-[10px] px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 cursor-pointer">
          Simple
        </button>
        <button onClick={() => onChange(generateBirdeyeFlyover())}
          className="text-[10px] px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 cursor-pointer">
          Bird&apos;s Eye
        </button>
        <button onClick={() => onChange(generateDynamicScenes())}
          className="text-[10px] px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 cursor-pointer">
          Dynamic
        </button>
      </div>

      {/* Blend duration */}
      {scenes.length > 1 && (
        <div className="px-3 pt-1">
          <label className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-400 whitespace-nowrap">Blend {Math.round(transitionDuration * 100)}%</span>
            <input type="range" min={0} max={20} step={1}
              value={Math.round(transitionDuration * 100)}
              onChange={e => onTransitionDurationChange(parseInt(e.target.value) / 100)}
              aria-label="Scene transition blend duration"
              className="flex-1 h-1 cursor-pointer" />
          </label>
        </div>
      )}

      {/* Coverage bar */}
      {scenes.length > 0 && (
        <div className="px-3 pt-2">
          <div className="relative h-3 bg-zinc-200 dark:bg-zinc-600 rounded-full overflow-hidden">
            {scenes.map((s, i) => (
              <div
                key={s.id}
                className={`absolute top-0 bottom-0 ${SCENE_COLORS[i % SCENE_COLORS.length]} opacity-80`}
                style={{
                  left: `${Math.max(0, s.startPercent) * 100}%`,
                  width: `${Math.max(0, s.endPercent - s.startPercent) * 100}%`,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-zinc-400 mt-0.5">
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
          {warnings.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {warnings.map((w, i) => (
                <p key={i} className="text-[10px] text-amber-500">⚠ {w}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {scenes.map((scene, i) => (
          <div key={scene.id}
            className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <input value={scene.name}
                onChange={e => updateScene(scene.id, { name: e.target.value })}
                className="text-xs font-semibold bg-transparent text-zinc-700 dark:text-zinc-200
                  w-32 outline-none border-b border-transparent focus:border-cyan-400" />
              <button onClick={() => removeScene(scene.id)}
                className="text-zinc-400 hover:text-red-500 text-xs cursor-pointer">✕</button>
            </div>

            <select value={scene.cameraMode}
              onChange={e => updateScene(scene.id, { cameraMode: e.target.value as CameraMode })}
              className="w-full text-xs px-2 py-1 bg-white dark:bg-zinc-600 rounded
                text-zinc-700 dark:text-zinc-200 cursor-pointer">
              {MODES.map(m => <option key={m} value={m}>{CAMERA_MODE_LABELS[m]}</option>)}
            </select>

            <div className="flex gap-2">
              <label className="flex-1">
                <span className="text-[10px] text-zinc-400">Start %</span>
                <input type="number" min={0} max={100} step={1}
                  value={Math.round(scene.startPercent * 100)}
                  onChange={e => updateScene(scene.id, { startPercent: parseInt(e.target.value) / 100 })}
                  className="w-full text-xs px-2 py-1 bg-white dark:bg-zinc-600 rounded
                    text-zinc-700 dark:text-zinc-200" />
              </label>
              <label className="flex-1">
                <span className="text-[10px] text-zinc-400">End %</span>
                <input type="number" min={0} max={100} step={1}
                  value={Math.round(scene.endPercent * 100)}
                  onChange={e => updateScene(scene.id, { endPercent: parseInt(e.target.value) / 100 })}
                  className="w-full text-xs px-2 py-1 bg-white dark:bg-zinc-600 rounded
                    text-zinc-700 dark:text-zinc-200" />
              </label>
            </div>

            <div className="flex gap-2">
              <label className="flex-1">
                <span className="text-[10px] text-zinc-400">Zoom {scene.params.zoom}</span>
                <input type="range" min={1} max={20} step={0.5}
                  value={scene.params.zoom}
                  onChange={e => updateScene(scene.id, {
                    params: { ...scene.params, zoom: parseFloat(e.target.value) }
                  })}
                  aria-label={`Zoom for ${scene.name}`}
                  className="w-full h-1 cursor-pointer" />
              </label>
              <label className="flex-1">
                <span className="text-[10px] text-zinc-400">Pitch {scene.params.pitch}°</span>
                <input type="range" min={0} max={85} step={1}
                  value={scene.params.pitch}
                  onChange={e => updateScene(scene.id, {
                    params: { ...scene.params, pitch: parseFloat(e.target.value) }
                  })}
                  aria-label={`Pitch for ${scene.name}`}
                  className="w-full h-1 cursor-pointer" />
              </label>
            </div>

            <div className="flex gap-2">
              <label className="flex-1">
                <span className="text-[10px] text-zinc-400">Bearing {scene.params.bearingOffset}°</span>
                <input type="range" min={-180} max={180} step={1}
                  value={scene.params.bearingOffset}
                  onChange={e => updateScene(scene.id, {
                    params: { ...scene.params, bearingOffset: parseFloat(e.target.value) }
                  })}
                  aria-label={`Bearing offset for ${scene.name}`}
                  className="w-full h-1 cursor-pointer" />
              </label>
              <label className="flex-1">
                <span className="text-[10px] text-zinc-400">Rotation {scene.params.rotationSpeed}°/s</span>
                <input type="range" min={0} max={90} step={1}
                  value={scene.params.rotationSpeed}
                  onChange={e => updateScene(scene.id, {
                    params: { ...scene.params, rotationSpeed: parseFloat(e.target.value) }
                  })}
                  aria-label={`Rotation speed for ${scene.name}`}
                  className="w-full h-1 cursor-pointer" />
              </label>
            </div>
          </div>
        ))}

        {scenes.length === 0 && (
          <p className="text-xs text-zinc-400 text-center py-8">
            No scenes yet. Click &ldquo;+ Add&rdquo; to create one,<br />
            or scenes will be auto-generated on export.
          </p>
        )}
      </div>

      {/* Undo delete banner */}
      {deletedScene && (
        <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Deleted &ldquo;{deletedScene.scene.name}&rdquo;
          </span>
          <button onClick={undoDelete}
            className="text-xs px-2 py-0.5 text-cyan-500 hover:text-cyan-400 font-medium cursor-pointer">
            Undo
          </button>
        </div>
      )}
    </div>
  )
}

