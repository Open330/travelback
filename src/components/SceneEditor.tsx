'use client'

import { useCallback } from 'react'
import type { Scene, CameraMode } from '@/types'
import { CAMERA_MODE_LABELS, DEFAULT_CAMERA_PARAMS } from '@/types'

interface SceneEditorProps {
  scenes: Scene[]
  onChange: (scenes: Scene[]) => void
  onClose: () => void
}

const MODES: CameraMode[] = ['overview', 'flyover', 'orbit', 'ground', 'closeup']

export default function SceneEditor({ scenes, onChange, onClose }: SceneEditorProps) {
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
    onChange(scenes.filter(s => s.id !== id))
  }, [scenes, onChange])

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

  return (
    <div className="absolute left-4 top-16 bottom-36 z-20 w-72 bg-white/95 dark:bg-zinc-800/95
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
                <span className="text-[10px] text-zinc-400">Zoom</span>
                <input type="range" min={1} max={20} step={0.5}
                  value={scene.params.zoom}
                  onChange={e => updateScene(scene.id, {
                    params: { ...scene.params, zoom: parseFloat(e.target.value) }
                  })}
                  className="w-full h-1 cursor-pointer" />
              </label>
              <label className="flex-1">
                <span className="text-[10px] text-zinc-400">Pitch</span>
                <input type="range" min={0} max={85} step={1}
                  value={scene.params.pitch}
                  onChange={e => updateScene(scene.id, {
                    params: { ...scene.params, pitch: parseFloat(e.target.value) }
                  })}
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
    </div>
  )
}

