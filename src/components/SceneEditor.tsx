'use client'

import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { X, ChevronDown } from 'lucide-react'
import type { Scene, CameraMode } from '@/types'
import { DEFAULT_CAMERA_PARAMS } from '@/types'
import { generateDefaultScenes, generateSimpleFlyover, generateBirdeyeFlyover, generateDynamicScenes } from '@/lib/camera'
import { useLocale, type TranslationKey } from '@/lib/i18n'

const SCENE_COLORS = [
  'rgba(var(--gl),.7)', '#34D399', '#FBBF24', '#A78BFA',
  '#FB7185', '#2DD4BF', '#FB923C', '#818CF8',
]

interface SceneEditorProps {
  scenes: Scene[]
  onChange: (scenes: Scene[]) => void
  onClose: () => void
  transitionDuration: number
  onTransitionDurationChange: (v: number) => void
}

const MODES: CameraMode[] = ['overview', 'flyover', 'orbit', 'ground', 'closeup', 'birdeye']

/** Small inline SVG icons for each camera mode */
function CameraModeIcon({ mode, size = 16 }: { mode: CameraMode; size?: number }) {
  const s = { width: size, height: size, flexShrink: 0 }
  switch (mode) {
    case 'overview':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={s}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>
    case 'flyover':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={s}><path d="M4 20L12 4l8 16"/><path d="M8 14h8"/></svg>
    case 'orbit':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={s}><circle cx="12" cy="12" r="3"/><path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20"/><path d="M19 5l-2 2"/></svg>
    case 'ground':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={s}><path d="M3 20h18"/><path d="M5 20V10l7-6 7 6v10"/><path d="M9 20v-6h6v6"/></svg>
    case 'closeup':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={s}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>
    case 'birdeye':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={s}><path d="M2 12l10-8 10 8"/><path d="M12 4v16"/><path d="M6 8v12h12V8"/></svg>
  }
}

export default function SceneEditor({ scenes, onChange, onClose, transitionDuration, onTransitionDurationChange }: SceneEditorProps) {
  const { t } = useLocale()
  const [deletedScene, setDeletedScene] = useState<{ scene: Scene; index: number } | null>(null)
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-clear undo after 5 seconds
  useEffect(() => {
    if (!deletedScene) return
    // Clear any previous timer before setting a new one
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
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
        w.push(`"${s.name}" ${t('scenes.hasStartGteEnd')}`)
      }
      if (i > 0) {
        const prev = sorted[i - 1]
        if (s.startPercent < prev.endPercent) {
          w.push(`"${prev.name}" ${t('scenes.overlap')} "${s.name}" ${t('scenes.overlapSuffix')}`)
        }
      }
    }
    return w
  }, [scenes])

  return (
    <div className="absolute left-4 top-16 bottom-36 z-20 w-72 max-w-[calc(100vw-2rem)] gs flex flex-col overflow-hidden"
      style={{ borderRadius: 'var(--r-glass)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--div)' }}>
        <h3 className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{t('scenes.title')}</h3>
        <div className="flex gap-2">
          <button onClick={addScene}
            className="vitro-btn-primary text-xs px-2 py-1 cursor-pointer">
            {t('scenes.add')}
          </button>
          <button onClick={onClose}
            className="cursor-pointer" style={{ color: 'var(--t4)' }}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="px-3 pt-2 flex flex-wrap gap-1">
        <span className="text-[10px] leading-6" style={{ color: 'var(--t4)' }}>{t('scenes.presets')}</span>
        <button onClick={() => onChange(generateDefaultScenes())}
          className="gi text-[10px] px-2 py-0.5 cursor-pointer" style={{ color: 'var(--t2)' }}>
          {t('scenes.cinematic')}
        </button>
        <button onClick={() => onChange(generateSimpleFlyover())}
          className="gi text-[10px] px-2 py-0.5 cursor-pointer" style={{ color: 'var(--t2)' }}>
          {t('scenes.simple')}
        </button>
        <button onClick={() => onChange(generateBirdeyeFlyover())}
          className="gi text-[10px] px-2 py-0.5 cursor-pointer" style={{ color: 'var(--t2)' }}>
          {t('scenes.birdsEye')}
        </button>
        <button onClick={() => onChange(generateDynamicScenes())}
          className="gi text-[10px] px-2 py-0.5 cursor-pointer" style={{ color: 'var(--t2)' }}>
          {t('scenes.dynamic')}
        </button>
      </div>

      {/* Blend duration */}
      {scenes.length > 1 && (
        <div className="px-3 pt-1">
          <label className="flex items-center gap-2">
            <span className="text-[10px] whitespace-nowrap" style={{ color: 'var(--t4)' }}>{t('scenes.blend')} {Math.round(transitionDuration * 100)}%</span>
            <input type="range" min={0} max={20} step={1}
              value={Math.round(transitionDuration * 100)}
              onChange={e => onTransitionDurationChange(parseInt(e.target.value) / 100)}
              aria-label={t('scenes.blendAria')}
              className="flex-1 h-1 cursor-pointer"
              style={{ accentColor: 'rgb(var(--gl))' }} />
          </label>
        </div>
      )}

      {/* Coverage bar */}
      {scenes.length > 0 && (
        <div className="px-3 pt-2">
          <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'var(--div)' }}>
            {scenes.map((s, i) => (
              <div
                key={s.id}
                className="absolute top-0 bottom-0"
                style={{
                  left: `${Math.max(0, s.startPercent) * 100}%`,
                  width: `${Math.max(0, s.endPercent - s.startPercent) * 100}%`,
                  background: SCENE_COLORS[i % SCENE_COLORS.length],
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[9px] mt-0.5" style={{ color: 'var(--t4)' }}>
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
          {warnings.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {warnings.map((w, i) => (
                <p key={i} className="text-[10px]" style={{ color: 'var(--warn)' }}>⚠ {w}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {scenes.map((scene, i) => (
          <div key={scene.id}
            className="gi p-3 space-y-2" style={{ borderRadius: '10px' }}>
            <div className="flex items-center justify-between">
              <input value={scene.name}
                onChange={e => updateScene(scene.id, { name: e.target.value })}
                className="text-xs font-semibold bg-transparent w-32 outline-none border-b border-transparent"
                style={{ color: 'var(--t1)', borderBottomColor: 'transparent' }}
                onFocus={e => e.target.style.borderBottomColor = 'rgb(var(--gl))'}
                onBlur={e => e.target.style.borderBottomColor = 'transparent'} />
              <button onClick={() => removeScene(scene.id)}
                className="text-xs cursor-pointer flex items-center justify-center" style={{ color: 'var(--t4)' }}>
                <X size={14} strokeWidth={2} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--t3)' }}><CameraModeIcon mode={scene.cameraMode} /></span>
              <select value={scene.cameraMode}
                onChange={e => updateScene(scene.id, { cameraMode: e.target.value as CameraMode })}
                className="vitro-select flex-1 text-xs px-2 py-1">
                {MODES.map(m => (
                  <option key={m} value={m}>
                    {t(`camera.${m}` as TranslationKey)} — {t(`camera.${m}Desc` as TranslationKey)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <label className="flex-1">
                <span className="text-[10px]" style={{ color: 'var(--t4)' }}>{t('scenes.startPct')}</span>
                <input type="number" min={0} max={100} step={1}
                  value={Math.round(scene.startPercent * 100)}
                  onChange={e => updateScene(scene.id, { startPercent: parseInt(e.target.value) / 100 })}
                  className="vitro-input w-full text-xs px-2 py-1" />
              </label>
              <label className="flex-1">
                <span className="text-[10px]" style={{ color: 'var(--t4)' }}>{t('scenes.endPct')}</span>
                <input type="number" min={0} max={100} step={1}
                  value={Math.round(scene.endPercent * 100)}
                  onChange={e => updateScene(scene.id, { endPercent: parseInt(e.target.value) / 100 })}
                  className="vitro-input w-full text-xs px-2 py-1" />
              </label>
            </div>

            {/* Collapsible parameters */}
            <button
              onClick={() => setExpandedSceneId(expandedSceneId === scene.id ? null : scene.id)}
              className="text-[10px] inline-flex items-center gap-1 cursor-pointer"
              style={{ color: 'var(--t4)' }}
            >
              <ChevronDown size={10} strokeWidth={2} className={`transition-transform ${expandedSceneId === scene.id ? 'rotate-180' : ''}`} />
              {t('scenes.customize')}
            </button>

            {expandedSceneId === scene.id && (
              <>
                <div className="flex gap-2">
                  <label className="flex-1">
                    <span className="text-[10px]" style={{ color: 'var(--t4)' }}>{t('scenes.zoom')} {scene.params.zoom}</span>
                    <input type="range" min={1} max={20} step={0.5}
                      value={scene.params.zoom}
                      onChange={e => updateScene(scene.id, {
                        params: { ...scene.params, zoom: parseFloat(e.target.value) }
                      })}
                      aria-label={`Zoom for ${scene.name}`}
                      className="w-full h-1 cursor-pointer" style={{ accentColor: 'rgb(var(--gl))' }} />
                    <span className="text-[9px] flex justify-between" style={{ color: 'var(--t5, var(--t4))' }}>
                      <span>{t('scenes.zoomFar')}</span><span>{t('scenes.zoomClose')}</span>
                    </span>
                  </label>
                  <label className="flex-1">
                    <span className="text-[10px]" style={{ color: 'var(--t4)' }}>{t('scenes.pitch')} {scene.params.pitch}°</span>
                    <input type="range" min={0} max={85} step={1}
                      value={scene.params.pitch}
                      onChange={e => updateScene(scene.id, {
                        params: { ...scene.params, pitch: parseFloat(e.target.value) }
                      })}
                      aria-label={`Pitch for ${scene.name}`}
                      className="w-full h-1 cursor-pointer" style={{ accentColor: 'rgb(var(--gl))' }} />
                    <span className="text-[9px] flex justify-between" style={{ color: 'var(--t5, var(--t4))' }}>
                      <span>{t('scenes.pitchFlat')}</span><span>{t('scenes.pitchAngled')}</span>
                    </span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <label className="flex-1">
                    <span className="text-[10px]" style={{ color: 'var(--t4)' }}>{t('scenes.bearing')} {scene.params.bearingOffset}°</span>
                    <input type="range" min={-180} max={180} step={1}
                      value={scene.params.bearingOffset}
                      onChange={e => updateScene(scene.id, {
                        params: { ...scene.params, bearingOffset: parseFloat(e.target.value) }
                      })}
                      aria-label={`Bearing offset for ${scene.name}`}
                      className="w-full h-1 cursor-pointer" style={{ accentColor: 'rgb(var(--gl))' }} />
                    <span className="text-[9px] flex justify-between" style={{ color: 'var(--t5, var(--t4))' }}>
                      <span>{t('scenes.bearingLeft')}</span><span>{t('scenes.bearingRight')}</span>
                    </span>
                  </label>
                  <label className="flex-1">
                    <span className="text-[10px]" style={{ color: 'var(--t4)' }}>{t('scenes.rotation')} {scene.params.rotationSpeed}°/s</span>
                    <input type="range" min={0} max={90} step={1}
                      value={scene.params.rotationSpeed}
                      onChange={e => updateScene(scene.id, {
                        params: { ...scene.params, rotationSpeed: parseFloat(e.target.value) }
                      })}
                      aria-label={`Rotation speed for ${scene.name}`}
                      className="w-full h-1 cursor-pointer" style={{ accentColor: 'rgb(var(--gl))' }} />
                    <span className="text-[9px] flex justify-between" style={{ color: 'var(--t5, var(--t4))' }}>
                      <span>{t('scenes.rotationStill')}</span><span>{t('scenes.rotationSpin')}</span>
                    </span>
                  </label>
                </div>
              </>
            )}
          </div>
        ))}

        {scenes.length === 0 && (
          <p className="text-xs text-center py-8 whitespace-pre-line" style={{ color: 'var(--t4)' }}>
            {t('scenes.emptyState')}
          </p>
        )}
      </div>

      {/* Undo delete banner */}
      {deletedScene && (
        <div className="px-3 py-2 flex items-center justify-between" style={{ borderTop: '1px solid var(--div)' }}>
          <span className="text-xs" style={{ color: 'var(--t3)' }}>
            {t('scenes.deleted')} &ldquo;{deletedScene.scene.name}&rdquo;
          </span>
          <button onClick={undoDelete}
            className="text-xs px-2 py-0.5 font-medium cursor-pointer" style={{ color: 'rgb(var(--gl))' }}>
            {t('scenes.undo')}
          </button>
        </div>
      )}
    </div>
  )
}

