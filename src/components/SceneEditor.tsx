'use client'

import { memo, useCallback, useState, useEffect, useRef } from 'react'
import { X, ChevronDown } from 'lucide-react'
import type { Scene, CameraMode } from '@/types'
import { DEFAULT_CAMERA_PARAMS } from '@/types'
import { generateId } from '@/lib/id'
import { generateDefaultScenes, generateSimpleFlyover, generateBirdeyeFlyover, generateDynamicScenes, normalizeScenes } from '@/lib/camera'
import { useLocale, type TranslationKey } from '@/lib/i18n'
import ModalDialog from '@/components/ModalDialog'

const SCENE_COLORS = [
  'rgba(var(--gl),.7)', '#34D399', '#FBBF24', '#A78BFA',
  '#FB7185', '#2DD4BF', '#FB923C', '#818CF8',
]
const MIN_SCENE_SPAN = 0.01

interface SceneEditorProps {
  scenes: Scene[]
  onChange: (scenes: Scene[]) => void
  onClose: () => void
  transitionDuration: number
  onTransitionDurationChange: (v: number) => void
  onPreviewScene?: (scene: Scene | null) => void
}

const MODES: CameraMode[] = ['overview', 'flyover', 'orbit', 'ground', 'closeup', 'birdeye']
type PresetType = 'cinematic' | 'simple' | 'birdeye' | 'dynamic'

function scenesWereAdjusted(inputScenes: Scene[], normalizedScenes: Scene[]): boolean {
  if (inputScenes.length !== normalizedScenes.length) return true
  return inputScenes.some((scene, index) => {
    const normalized = normalizedScenes[index]
    return !normalized
      || scene.id !== normalized.id
      || scene.startPercent !== normalized.startPercent
      || scene.endPercent !== normalized.endPercent
  })
}

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

function SceneRangeEditor({
  sceneName,
  startPercent,
  endPercent,
  onChange,
  onCommit,
  ariaLabel,
}: {
  sceneName: string
  startPercent: number
  endPercent: number
  onChange: (startPercent: number, endPercent: number) => void
  onCommit?: (startPercent: number, endPercent: number) => void
  ariaLabel: string
}) {
  const { t } = useLocale()
  const containerRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{
    type: 'start' | 'end' | 'region' | null
    originX: number
    originStart: number
    originEnd: number
  }>({ type: null, originX: 0, originStart: 0, originEnd: 1 })
  const dragWidthRef = useRef(0)
  const lastDragValuesRef = useRef<{ start: number; end: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  const onCommitRef = useRef(onCommit)
  useEffect(() => { onCommitRef.current = onCommit }, [onCommit])
  const startPercentRef = useRef(startPercent)
  useEffect(() => { startPercentRef.current = startPercent }, [startPercent])
  const endPercentRef = useRef(endPercent)
  useEffect(() => { endPercentRef.current = endPercent }, [endPercent])

  const commitKeyboardRange = useCallback((start: number, end: number) => {
    if (onCommitRef.current) {
      onCommitRef.current(start, end)
      return
    }
    onChangeRef.current(start, end)
  }, [])

  const clampRange = useCallback((start: number, end: number): [number, number] => {
    let nextStart = Math.max(0, Math.min(start, 1 - MIN_SCENE_SPAN))
    let nextEnd = Math.max(MIN_SCENE_SPAN, Math.min(end, 1))
    if (nextEnd - nextStart < MIN_SCENE_SPAN) {
      nextEnd = Math.min(1, nextStart + MIN_SCENE_SPAN)
      nextStart = Math.max(0, nextEnd - MIN_SCENE_SPAN)
    }
    return [nextStart, nextEnd]
  }, [])

  const startDrag = useCallback((type: 'start' | 'end' | 'region', clientX: number) => {
    dragState.current = {
      type,
      originX: clientX,
      originStart: startPercentRef.current,
      originEnd: endPercentRef.current,
    }
    dragWidthRef.current = containerRef.current?.getBoundingClientRect().width || 1
    setDragging(true)
  }, [])

  useEffect(() => {
    if (!dragging) return

    const onPointerMove = (event: PointerEvent) => {
      if (!dragState.current.type) return
      const width = dragWidthRef.current || 1
      const dx = (event.clientX - dragState.current.originX) / width

      if (dragState.current.type === 'start') {
        const [nextStart, nextEnd] = clampRange(dragState.current.originStart + dx, dragState.current.originEnd)
        lastDragValuesRef.current = { start: nextStart, end: nextEnd }
        onChangeRef.current(nextStart, nextEnd)
        return
      }

      if (dragState.current.type === 'end') {
        const [nextStart, nextEnd] = clampRange(dragState.current.originStart, dragState.current.originEnd + dx)
        lastDragValuesRef.current = { start: nextStart, end: nextEnd }
        onChangeRef.current(nextStart, nextEnd)
        return
      }

      const span = dragState.current.originEnd - dragState.current.originStart
      let nextStart = dragState.current.originStart + dx
      let nextEnd = dragState.current.originEnd + dx
      if (nextStart < 0) {
        nextStart = 0
        nextEnd = span
      }
      if (nextEnd > 1) {
        nextEnd = 1
        nextStart = 1 - span
      }
      lastDragValuesRef.current = { start: nextStart, end: nextEnd }
      onChangeRef.current(nextStart, nextEnd)
    }

    const onPointerUp = () => {
      const lastDrag = lastDragValuesRef.current
      dragState.current.type = null
      dragWidthRef.current = 0
      lastDragValuesRef.current = null
      setDragging(false)
      // Fire onCommit with the final drag values so the parent can
      // normalize scenes only once at the end of the drag gesture,
      // rather than on every pointermove.
      if (lastDrag && onCommitRef.current) {
        onCommitRef.current(lastDrag.start, lastDrag.end)
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [clampRange, dragging])

  return (
    <div>
      <div
        ref={containerRef}
        aria-label={ariaLabel}
        className="relative h-8 rounded-xl overflow-visible border"
        style={{ background: 'rgba(var(--gl),.12)', borderColor: 'var(--div)', userSelect: 'none' }}
      >
        <div
          className="absolute inset-y-1 rounded-lg cursor-grab active:cursor-grabbing"
          style={{
            left: `${startPercent * 100}%`,
            width: `${Math.max(endPercent - startPercent, MIN_SCENE_SPAN) * 100}%`,
            background: 'rgba(var(--gl),.28)',
            border: '1px solid rgba(var(--gl),.45)',
            touchAction: 'none',
          }}
          onPointerDown={(event) => {
            event.stopPropagation()
            startDrag('region', event.clientX)
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold" style={{ color: 'var(--t2)' }}>
            {sceneName}
          </div>
        </div>

        {([
          ['start', startPercent],
          ['end', endPercent],
        ] as const).map(([type, value]) => (
          <div
            key={type}
            role="slider"
            tabIndex={0}
            aria-label={type === 'start' ? `${ariaLabel} ${t('scenes.rangeStart')}` : `${ariaLabel} ${t('scenes.rangeEnd')}`}
            aria-valuenow={Math.round(value * 100)}
            aria-valuetext={`${Math.round(value * 100)}% ${type === 'start' ? t('scenes.rangeStart') : t('scenes.rangeEnd')}`}
            aria-valuemin={type === 'start' ? 0 : Math.round(startPercent * 100)}
            aria-valuemax={type === 'end' ? 100 : Math.round(endPercent * 100)}
            className="absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 -translate-x-1/2 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
            style={{ left: `${value * 100}%`, touchAction: 'none' }}
            onPointerDown={(event) => {
              event.stopPropagation()
              startDrag(type, event.clientX)
            }}
            onKeyDown={(e) => {
              const step = 0.01
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault()
                e.stopPropagation()
                if (type === 'start') {
                  const [s] = clampRange(Math.min(startPercent + step, endPercent - MIN_SCENE_SPAN), endPercent)
                  commitKeyboardRange(s, endPercent)
                } else {
                  const [, en] = clampRange(startPercent, Math.min(endPercent + step, 1))
                  commitKeyboardRange(startPercent, en)
                }
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault()
                e.stopPropagation()
                if (type === 'start') {
                  const [s] = clampRange(Math.max(startPercent - step, 0), endPercent)
                  commitKeyboardRange(s, endPercent)
                } else {
                  const [, en] = clampRange(startPercent, Math.max(endPercent - step, startPercent + MIN_SCENE_SPAN))
                  commitKeyboardRange(startPercent, en)
                }
              } else if (e.key === 'Home') {
                e.preventDefault()
                e.stopPropagation()
                if (type === 'start') {
                  const [s] = clampRange(0, endPercent)
                  commitKeyboardRange(s, endPercent)
                } else {
                  const [, en] = clampRange(startPercent, startPercent + MIN_SCENE_SPAN)
                  commitKeyboardRange(startPercent, en)
                }
              } else if (e.key === 'End') {
                e.preventDefault()
                e.stopPropagation()
                if (type === 'start') {
                  const [s] = clampRange(endPercent - MIN_SCENE_SPAN, endPercent)
                  commitKeyboardRange(s, endPercent)
                } else {
                  const [, en] = clampRange(startPercent, 1)
                  commitKeyboardRange(startPercent, en)
                }
              }
            }}
          >
            <div className="flex h-6 w-3 items-center justify-center rounded-full border border-white/40 bg-[rgb(var(--gl))] shadow-md">
              <div className="h-3 w-px rounded bg-black/30" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[9px]" style={{ color: 'var(--t4)' }}>
        <span aria-hidden="true" />
      </div>
    </div>
  )
}

function SceneEditor({ scenes, onChange, onClose, transitionDuration, onTransitionDurationChange, onPreviewScene }: SceneEditorProps) {
  const { t } = useLocale()
  const [deletedScene, setDeletedScene] = useState<{ scene: Scene; index: number } | null>(null)
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null)
  const [pendingPresetType, setPendingPresetType] = useState<PresetType | null>(null)
  const [focusedInput, setFocusedInput] = useState<string | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [normalizationWarnings, setNormalizationWarnings] = useState<string[]>([])

  const commitScenes = useCallback((nextScenes: Scene[]) => {
    const normalized = normalizeScenes(nextScenes)
    const w: string[] = []
    // Identify scenes that will be removed by normalization (start >= end)
    // and report them as "will be removed" rather than "has start >= end",
    // since the scene won't exist in the final list.
    for (const s of nextScenes) {
      if (s.startPercent >= s.endPercent) {
        w.push(`"${s.name}" ${t('scenes.willBeRemoved')}`)
      }
    }
    // Show specific adjustment details when normalization changed something
    // beyond the already-reported removals above.
    if (scenesWereAdjusted(nextScenes, normalized)) {
      const hasRemovals = nextScenes.some(s => s.startPercent >= s.endPercent)
      if (!hasRemovals) {
        // Find specific adjustments by comparing pre- and post-normalization
        const normMap = new Map(normalized.map(s => [s.id, s]))
        for (const orig of nextScenes) {
          const norm = normMap.get(orig.id)
          if (!norm) continue
          const startDiff = Math.abs(norm.startPercent - orig.startPercent)
          const endDiff = Math.abs(norm.endPercent - orig.endPercent)
          if (startDiff > 0.001) {
            w.push(`"${orig.name}" start: ${Math.round(orig.startPercent * 100)}% → ${Math.round(norm.startPercent * 100)}%`)
          }
          if (endDiff > 0.001) {
            w.push(`"${orig.name}" end: ${Math.round(orig.endPercent * 100)}% → ${Math.round(norm.endPercent * 100)}%`)
          }
        }
        // Fallback if no specific diff found (should not happen)
        if (w.length === 0) {
          w.push(t('scenes.rangesAdjusted'))
        }
      }
    }
    setNormalizationWarnings(w)

    onChange(normalized)
  }, [onChange, t])

  // Swipe-left to dismiss
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    touchStartRef.current = null
    if (dx < -80 && Math.abs(dy) < Math.abs(dx)) onClose()
  }, [onClose])

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
    if (start >= 1) return
    const end = Math.min(start + 0.15, 1)
    const newScene: Scene = {
      id: `scene-${generateId().slice(0, 8)}`,
      name: t('scenes.newSceneName').replace('{n}', String(scenes.length + 1)),
      cameraMode: 'flyover',
      startPercent: start,
      endPercent: end,
      params: { ...DEFAULT_CAMERA_PARAMS.flyover },
    }
    commitScenes([...scenes, newScene])
  }, [commitScenes, scenes, t])

  const removeScene = useCallback((id: string) => {
    const idx = scenes.findIndex(s => s.id === id)
    if (idx >= 0) setDeletedScene({ scene: scenes[idx], index: idx })
    commitScenes(scenes.filter(s => s.id !== id))
  }, [commitScenes, scenes])

  const undoDelete = useCallback(() => {
    if (!deletedScene) return
    if (!scenes.some((scene) => scene.id === deletedScene.scene.id)) {
      const restoredScenes = [...scenes]
      restoredScenes.splice(Math.min(deletedScene.index, restoredScenes.length), 0, deletedScene.scene)
      commitScenes(restoredScenes)
    }
    setDeletedScene(null)
  }, [commitScenes, deletedScene, scenes])

  const updateScene = useCallback((id: string, patch: Partial<Scene>) => {
    let previewTarget: Scene | null = null
    commitScenes(scenes.map(s => {
      if (s.id !== id) return s
      const updated = { ...s, ...patch }
      if (patch.startPercent != null || patch.endPercent != null) {
        let nextStart = Math.max(0, Math.min(updated.startPercent, 1 - MIN_SCENE_SPAN))
        let nextEnd = Math.max(MIN_SCENE_SPAN, Math.min(updated.endPercent, 1))
        if (nextEnd - nextStart < MIN_SCENE_SPAN) {
          if (patch.startPercent != null && patch.endPercent == null) {
            nextStart = Math.max(0, nextEnd - MIN_SCENE_SPAN)
          } else {
            nextEnd = Math.min(1, nextStart + MIN_SCENE_SPAN)
            nextStart = Math.max(0, nextEnd - MIN_SCENE_SPAN)
          }
        }
        updated.startPercent = nextStart
        updated.endPercent = nextEnd
      }
      // If camera mode changed, reset params to defaults
      if (patch.cameraMode && patch.cameraMode !== s.cameraMode) {
        updated.params = { ...DEFAULT_CAMERA_PARAMS[patch.cameraMode] }
      }
      // Trigger live preview when params change
      if (patch.params) previewTarget = updated
      return updated
    }))
    if (previewTarget && onPreviewScene) onPreviewScene(previewTarget)
  }, [commitScenes, scenes, onPreviewScene])

  /** Apply a scene patch without normalizing — used during active drag so
   *  the user's gesture is not immediately counteracted by normalization. */
  const updateSceneRaw = useCallback((id: string, patch: Partial<Scene>) => {
    const next = scenes.map(s => {
      if (s.id !== id) return s
      const updated = { ...s, ...patch }
      if (patch.startPercent != null || patch.endPercent != null) {
        let nextStart = Math.max(0, Math.min(updated.startPercent, 1 - MIN_SCENE_SPAN))
        let nextEnd = Math.max(MIN_SCENE_SPAN, Math.min(updated.endPercent, 1))
        if (nextEnd - nextStart < MIN_SCENE_SPAN) {
          if (patch.startPercent != null && patch.endPercent == null) {
            nextStart = Math.max(0, nextEnd - MIN_SCENE_SPAN)
          } else {
            nextEnd = Math.min(1, nextStart + MIN_SCENE_SPAN)
            nextStart = Math.max(0, nextEnd - MIN_SCENE_SPAN)
          }
        }
        updated.startPercent = nextStart
        updated.endPercent = nextEnd
      }
      return updated
    })
    onChange(next)
  }, [scenes, onChange])

  const clearPreview = useCallback(() => {
    onPreviewScene?.(null)
  }, [onPreviewScene])

  const statusMessage = deletedScene
    ? `${t('scenes.deleted')} ${deletedScene.scene.name}`
    : normalizationWarnings.join(' ')

  const localizePresetScenes = useCallback((presetType: PresetType, nextScenes: Scene[]) => {
    const names: Record<PresetType, string[]> = {
      cinematic: [
        `${t('camera.overview')} 1`,
        t('camera.birdeye'),
        t('camera.flyover'),
        t('camera.orbit'),
        t('camera.ground'),
        `${t('camera.overview')} 2`,
      ],
      simple: [t('camera.flyover')],
      birdeye: [t('camera.birdeye')],
      dynamic: nextScenes.map((_, index) => `${t('scenes.dynamic')} ${index + 1}`),
    }

    return nextScenes.map((scene, index) => ({
      ...scene,
      name: names[presetType][index] ?? t('scenes.newSceneName').replace('{n}', String(index + 1)),
    }))
  }, [t])

  const buildPresetScenes = useCallback((presetType: PresetType) => {
    switch (presetType) {
      case 'cinematic':
        return localizePresetScenes(presetType, generateDefaultScenes())
      case 'simple':
        return localizePresetScenes(presetType, generateSimpleFlyover())
      case 'birdeye':
        return localizePresetScenes(presetType, generateBirdeyeFlyover())
      case 'dynamic':
        return localizePresetScenes(presetType, generateDynamicScenes())
    }
  }, [localizePresetScenes])

  return (
    <div data-testid="scene-editor-panel" role="region" aria-labelledby="scene-editor-title" className="absolute left-4 right-4 z-20 w-auto gs flex flex-col overflow-hidden bottom-0 max-h-[70vh] rounded-b-none sm:right-auto sm:top-16 sm:w-80 sm:max-w-[calc(100vw-2rem)] sm:bottom-auto sm:rounded-[var(--r-glass)]"
      style={{ borderRadius: 'var(--r-glass)' }}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--div)' }}>
        <h3 id="scene-editor-title" className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{t('scenes.title')}</h3>
        <div data-testid="scene-editor-status" role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {statusMessage}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={addScene}
            className="vitro-btn-primary min-h-11 px-3 py-2 text-sm cursor-pointer">
            {t('scenes.add')}
          </button>
          <button type="button" onClick={onClose}
            aria-label={t('app.closePanel')}
            className="flex h-11 w-11 items-center justify-center rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]" style={{ color: 'var(--t4)' }}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="px-3 pt-2 flex flex-wrap gap-1">
        <span className="text-[10px] leading-6" style={{ color: 'var(--t4)' }}>{t('scenes.presets')}</span>
        <button type="button" onClick={() => { if (scenes.length > 0) setPendingPresetType('cinematic'); else commitScenes(buildPresetScenes('cinematic')) }}
          className="gi min-h-11 px-3 py-2 text-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]" style={{ color: 'var(--t2)' }}>
          {t('scenes.cinematic')}
        </button>
        <button type="button" onClick={() => { if (scenes.length > 0) setPendingPresetType('simple'); else commitScenes(buildPresetScenes('simple')) }}
          className="gi min-h-11 px-3 py-2 text-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]" style={{ color: 'var(--t2)' }}>
          {t('scenes.simple')}
        </button>
        <button type="button" onClick={() => { if (scenes.length > 0) setPendingPresetType('birdeye'); else commitScenes(buildPresetScenes('birdeye')) }}
          className="gi min-h-11 px-3 py-2 text-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]" style={{ color: 'var(--t2)' }}>
          {t('scenes.birdsEye')}
        </button>
        <button type="button" onClick={() => { if (scenes.length > 0) setPendingPresetType('dynamic'); else commitScenes(buildPresetScenes('dynamic')) }}
          className="gi min-h-11 px-3 py-2 text-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]" style={{ color: 'var(--t2)' }}>
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
              onChange={e => {
                const value = parseInt(e.target.value, 10)
                if (Number.isFinite(value)) onTransitionDurationChange(value / 100)
              }}
              aria-label={t('scenes.blendAria')}
              className="flex-1 h-2 cursor-pointer"
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
          </div>
          {normalizationWarnings.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {normalizationWarnings.map((w, i) => (
                <p key={i} className="text-[10px]" style={{ color: 'var(--warn)' }}>⚠ {w}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {scenes.map((scene) => (
          <div key={scene.id}
            className="gi p-3 space-y-2" style={{ borderRadius: '10px' }}>
            <div className="flex items-center justify-between">
              <input value={scene.name}
                aria-label={`${t('scenes.title')} ${scene.name}`}
                onChange={e => updateScene(scene.id, { name: e.target.value })}
                className="text-xs font-semibold bg-transparent w-32 outline-none border-b"
                style={{ color: 'var(--t1)', borderBottomColor: focusedInput === scene.id ? 'rgb(var(--gl))' : 'var(--div)', transition: 'border-color .15s ease' }}
                onFocus={() => setFocusedInput(scene.id)}
                onBlur={() => setFocusedInput(null)} />
              <button type="button" onClick={() => removeScene(scene.id)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]" style={{ color: 'var(--t4)' }} aria-label={t('scenes.deleteScene').replace('{name}', scene.name)}>
                <X size={14} strokeWidth={2} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--t3)' }}><CameraModeIcon mode={scene.cameraMode} /></span>
              <select value={scene.cameraMode}
                onChange={e => updateScene(scene.id, { cameraMode: e.target.value as CameraMode })}
                className="vitro-select min-h-11 flex-1 px-3 py-2 text-sm">
                {MODES.map(m => (
                  <option key={m} value={m}>
                    {t(`camera.${m}` as TranslationKey)} — {t(`camera.${m}Desc` as TranslationKey)}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-[11px]" style={{ color: 'var(--t4)' }}>
              {t('scenes.startPct')} {Math.round(scene.startPercent * 100)}% · {t('scenes.endPct')} {Math.round(scene.endPercent * 100)}%
            </p>

            {/* Collapsible parameters */}
            <button
              type="button"
              onClick={() => setExpandedSceneId(expandedSceneId === scene.id ? null : scene.id)}
              className="inline-flex min-h-11 items-center gap-2 px-1 text-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]"
              style={{ color: 'var(--t4)' }}
              aria-expanded={expandedSceneId === scene.id}
            >
              <ChevronDown size={14} strokeWidth={2} className={`transition-transform ${expandedSceneId === scene.id ? 'rotate-180' : ''}`} />
              {t('scenes.customize')}
            </button>

            {expandedSceneId === scene.id && (
              <>
                <div className="flex gap-2">
                  <label className="flex-1">
                    <span className="text-[10px]" style={{ color: 'var(--t4)' }}>{t('scenes.startPct')}</span>
                    <input type="number" min={0} max={100} step={1}
                      value={Math.round(scene.startPercent * 100)}
                      onChange={e => {
                        const nextValue = Number.parseInt(e.target.value, 10)
                        if (!Number.isFinite(nextValue)) return
                        const clamped = Math.max(0, Math.min(100, nextValue))
                        updateScene(scene.id, { startPercent: clamped / 100 })
                      }}
                      className="vitro-input min-h-11 w-full px-3 py-2 text-sm" />
                  </label>
                  <label className="flex-1">
                    <span className="text-[10px]" style={{ color: 'var(--t4)' }}>{t('scenes.endPct')}</span>
                    <input type="number" min={0} max={100} step={1}
                      value={Math.round(scene.endPercent * 100)}
                      onChange={e => {
                        const nextValue = Number.parseInt(e.target.value, 10)
                        if (!Number.isFinite(nextValue)) return
                        const clamped = Math.max(0, Math.min(100, nextValue))
                        updateScene(scene.id, { endPercent: clamped / 100 })
                      }}
                      className="vitro-input min-h-11 w-full px-3 py-2 text-sm" />
                  </label>
                </div>

                <SceneRangeEditor
                  sceneName={scene.name}
                  startPercent={scene.startPercent}
                  endPercent={scene.endPercent}
                  ariaLabel={`${scene.name} ${t('scenes.startPct')} / ${t('scenes.endPct')}`}
                  onChange={(startPercent, endPercent) => updateSceneRaw(scene.id, { startPercent, endPercent })}
                  onCommit={(startPercent, endPercent) => updateScene(scene.id, { startPercent, endPercent })}
                />

                <div className="flex gap-2">
                  <label className="flex-1">
                    <span className="text-[10px]" style={{ color: 'var(--t4)' }}>{t('scenes.zoom')} {scene.params.zoom}</span>
                    <input type="range" min={1} max={20} step={0.5}
                      value={scene.params.zoom}
                      onChange={e => {
                        const value = parseFloat(e.target.value)
                        if (Number.isFinite(value)) updateScene(scene.id, { params: { ...scene.params, zoom: value } })
                      }}
                      onPointerUp={clearPreview}
                      onKeyUp={clearPreview}
                      onBlur={clearPreview}
                      aria-label={t('scenes.zoomAria').replace('{name}', scene.name)}
                      aria-valuetext={`${t('scenes.zoom')} ${scene.params.zoom}`}
                      className="w-full h-1 cursor-pointer" style={{ accentColor: 'rgb(var(--gl))' }} />
                    <span className="text-[9px] flex justify-between" style={{ color: 'var(--t5, var(--t4))' }}>
                      <span>{t('scenes.zoomFar')}</span><span>{t('scenes.zoomClose')}</span>
                    </span>
                  </label>
                  <label className="flex-1">
                    <span className="text-[10px]" style={{ color: 'var(--t4)' }}>{t('scenes.pitch')} {scene.params.pitch}°</span>
                    <input type="range" min={0} max={85} step={1}
                      value={scene.params.pitch}
                      onChange={e => {
                        const value = parseFloat(e.target.value)
                        if (Number.isFinite(value)) updateScene(scene.id, { params: { ...scene.params, pitch: value } })
                      }}
                      onPointerUp={clearPreview}
                      onKeyUp={clearPreview}
                      onBlur={clearPreview}
                      aria-label={t('scenes.pitchAria').replace('{name}', scene.name)}
                      aria-valuetext={`${t('scenes.pitch')} ${scene.params.pitch}°`}
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
                      onChange={e => {
                        const value = parseFloat(e.target.value)
                        if (Number.isFinite(value)) updateScene(scene.id, { params: { ...scene.params, bearingOffset: value } })
                      }}
                      onPointerUp={clearPreview}
                      onKeyUp={clearPreview}
                      onBlur={clearPreview}
                      aria-label={t('scenes.bearingAria').replace('{name}', scene.name)}
                      aria-valuetext={`${t('scenes.bearing')} ${scene.params.bearingOffset}°`}
                      className="w-full h-1 cursor-pointer" style={{ accentColor: 'rgb(var(--gl))' }} />
                    <span className="text-[9px] flex justify-between" style={{ color: 'var(--t5, var(--t4))' }}>
                      <span>{t('scenes.bearingLeft')}</span><span>{t('scenes.bearingRight')}</span>
                    </span>
                  </label>
                  <label className="flex-1">
                    <span className="text-[10px]" style={{ color: 'var(--t4)' }}>{t('scenes.rotation')} {scene.params.rotationSpeed}°/s</span>
                    <input type="range" min={0} max={90} step={1}
                      value={scene.params.rotationSpeed}
                      onChange={e => {
                        const value = parseFloat(e.target.value)
                        if (Number.isFinite(value)) updateScene(scene.id, { params: { ...scene.params, rotationSpeed: value } })
                      }}
                      onPointerUp={clearPreview}
                      onKeyUp={clearPreview}
                      onBlur={clearPreview}
                      aria-label={t('scenes.rotationAria').replace('{name}', scene.name)}
                      aria-valuetext={`${t('scenes.rotation')} ${scene.params.rotationSpeed}°/s`}
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
          <button type="button" onClick={undoDelete}
            className="text-xs px-2 py-0.5 font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]" style={{ color: 'rgb(var(--gl))' }}>
            {t('scenes.undo')}
          </button>
        </div>
      )}

      {pendingPresetType && (
        <ModalDialog
          open
          onClose={() => setPendingPresetType(null)}
          labelledBy="scene-confirm-title"
          overlayClassName="z-40 flex items-center justify-center bg-black/35 p-4 backdrop-blur-md"
          panelClassName="go w-full max-w-sm p-5 shadow-xl"
        >
          <p id="scene-confirm-title" className="mb-4 text-sm font-medium" style={{ color: 'var(--t1)' }}>{t('scenes.replaceConfirm')}</p>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setPendingPresetType(null)}
              className="gi px-4 py-2 text-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]" style={{ color: 'var(--t2)' }}>
              {t('app.cancel')}
            </button>
            <button type="button" onClick={() => {
              switch (pendingPresetType) {
                case 'cinematic': commitScenes(buildPresetScenes('cinematic')); break
                case 'simple': commitScenes(buildPresetScenes('simple')); break
                case 'birdeye': commitScenes(buildPresetScenes('birdeye')); break
                case 'dynamic': commitScenes(buildPresetScenes('dynamic')); break
              }
              setPendingPresetType(null)
            }}
              className="vitro-btn-primary px-4 py-2 text-sm cursor-pointer">
              {t('app.replace')}
            </button>
          </div>
        </ModalDialog>
      )}
    </div>
  )
}

export default memo(SceneEditor)
