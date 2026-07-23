'use client'

import { memo, useCallback, useState, useEffect, useRef } from 'react'
import { X, ChevronDown } from 'lucide-react'
import type { Scene, CameraMode, CameraParams } from '@/types'
import { DEFAULT_CAMERA_PARAMS } from '@/types'
import { generateId } from '@/lib/id'
import { generateDefaultScenes, generateSimpleFlyover, generateBirdeyeFlyover, generateDynamicScenes, MIN_SCENE_SPAN, normalizeScenes, restoreDeletedScene } from '@/lib/camera'
import { useLocale, type TranslationKey } from '@/lib/i18n'
import ModalDialog from '@/components/ModalDialog'

const SCENE_COLORS = [
  'rgba(var(--gl),.7)', '#34D399', '#FBBF24', '#A78BFA',
  '#FB7185', '#2DD4BF', '#FB923C', '#818CF8',
]

interface SceneEditorProps {
  scenes: Scene[]
  onChange: (scenes: Scene[]) => void
  onScenesCommitted?: (scenes: Scene[]) => void
  onClose: () => void
  transitionDuration: number
  onTransitionDurationChange: (v: number) => void
  onPreviewScene?: (scene: Scene | null) => void
}

const MODES: CameraMode[] = ['overview', 'flyover', 'orbit', 'ground', 'closeup', 'birdeye']
type PresetType = 'cinematic' | 'simple' | 'birdeye' | 'dynamic'
const DEFAULT_NEW_SCENE_SPAN = 0.15

export function findFirstAvailableSceneRange(
  scenes: Pick<Scene, 'startPercent' | 'endPercent'>[],
): { startPercent: number; endPercent: number } | null {
  const orderedCoverage = scenes
    .map(scene => ({
      startPercent: Math.max(0, Math.min(scene.startPercent, 1)),
      endPercent: Math.max(0, Math.min(scene.endPercent, 1)),
    }))
    .filter(scene => scene.endPercent > scene.startPercent)
    .sort((a, b) => a.startPercent - b.startPercent)

  let coveredUntil = 0
  for (const scene of orderedCoverage) {
    if (scene.startPercent - coveredUntil >= MIN_SCENE_SPAN) {
      return {
        startPercent: coveredUntil,
        endPercent: Math.min(scene.startPercent, coveredUntil + DEFAULT_NEW_SCENE_SPAN),
      }
    }
    coveredUntil = Math.max(coveredUntil, scene.endPercent)
  }

  if (1 - coveredUntil < MIN_SCENE_SPAN) return null
  return {
    startPercent: coveredUntil,
    endPercent: Math.min(1, coveredUntil + DEFAULT_NEW_SCENE_SPAN),
  }
}

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

function formatSceneAdjustment(template: string, sceneName: string, from: number, to: number) {
  const values = {
    name: sceneName,
    from: String(Math.round(from * 100)),
    to: String(Math.round(to * 100)),
  }

  return template.replace(/\{(name|from|to)\}/g, (_match, key: keyof typeof values) => values[key])
}

function formatSceneCameraModeLabel(template: string, sceneName: string, sceneNumber: number) {
  const values = {
    name: sceneName,
    index: String(sceneNumber),
  }

  return template.replace(/\{(name|index)\}/g, (_match, key: keyof typeof values) => values[key])
}

type SceneWarning =
  | { kind: 'removed'; sceneName: string }
  | { kind: 'adjusted'; boundary: 'start' | 'end'; sceneName: string; from: number; to: number }
  | { kind: 'rangesAdjusted' }
  | { kind: 'undoConflict' }

function formatSceneWarning(warning: SceneWarning, t: (key: TranslationKey) => string) {
  switch (warning.kind) {
    case 'removed':
      return `"${warning.sceneName}" ${t('scenes.willBeRemoved')}`
    case 'adjusted':
      return formatSceneAdjustment(
        t(warning.boundary === 'start' ? 'scenes.startAdjusted' : 'scenes.endAdjusted'),
        warning.sceneName,
        warning.from,
        warning.to,
      )
    case 'rangesAdjusted':
      return t('scenes.rangesAdjusted')
    case 'undoConflict':
      return t('scenes.undoConflict')
  }
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

export function SceneRangeEditor({
  sceneName,
  startPercent,
  endPercent,
  onCommit,
  ariaLabel,
}: {
  sceneName: string
  startPercent: number
  endPercent: number
  onCommit: (startPercent: number, endPercent: number) => void
  ariaLabel: string
}) {
  const { t } = useLocale()
  const containerRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{
    type: 'start' | 'end' | 'region' | null
    pointerId: number | null
    captureTarget: HTMLElement | null
    originX: number
    originStart: number
    originEnd: number
  }>({ type: null, pointerId: null, captureTarget: null, originX: 0, originStart: 0, originEnd: 1 })
  const dragWidthRef = useRef(0)
  const lastDragValuesRef = useRef<{ start: number; end: number } | null>(null)
  const draftRangeRef = useRef({ start: startPercent, end: endPercent })
  const draftFrameRef = useRef<number | null>(null)
  const [draftRange, setDraftRange] = useState({ start: startPercent, end: endPercent })
  const [dragging, setDragging] = useState(false)
  const onCommitRef = useRef(onCommit)
  useEffect(() => { onCommitRef.current = onCommit }, [onCommit])

  const cancelDraftFrame = useCallback(() => {
    if (draftFrameRef.current == null) return
    cancelAnimationFrame(draftFrameRef.current)
    draftFrameRef.current = null
  }, [])

  const publishDraftOnNextFrame = useCallback((start: number, end: number) => {
    const next = { start, end }
    draftRangeRef.current = next
    lastDragValuesRef.current = next
    if (draftFrameRef.current != null) return
    draftFrameRef.current = requestAnimationFrame(() => {
      draftFrameRef.current = null
      setDraftRange(draftRangeRef.current)
    })
  }, [])

  useEffect(() => () => cancelDraftFrame(), [cancelDraftFrame])

  const commitKeyboardRange = useCallback((start: number, end: number) => {
    cancelDraftFrame()
    const next = { start, end }
    draftRangeRef.current = next
    setDraftRange(next)
    onCommitRef.current(start, end)
  }, [cancelDraftFrame])

  const clampRange = useCallback((start: number, end: number): [number, number] => {
    let nextStart = Math.max(0, Math.min(start, 1 - MIN_SCENE_SPAN))
    let nextEnd = Math.max(MIN_SCENE_SPAN, Math.min(end, 1))
    if (nextEnd - nextStart < MIN_SCENE_SPAN) {
      nextEnd = Math.min(1, nextStart + MIN_SCENE_SPAN)
      nextStart = Math.max(0, nextEnd - MIN_SCENE_SPAN)
    }
    return [nextStart, nextEnd]
  }, [])

  const startDrag = useCallback((type: 'start' | 'end' | 'region', event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Capture can fail if the pointer already ended between dispatch and handler.
    }
    dragState.current = {
      type,
      pointerId: event.pointerId,
      captureTarget: event.currentTarget,
      originX: event.clientX,
      originStart: startPercent,
      originEnd: endPercent,
    }
    lastDragValuesRef.current = null
    dragWidthRef.current = containerRef.current?.getBoundingClientRect().width || 1
    setDragging(true)
  }, [endPercent, startPercent])

  const settleDrag = useCallback((
    outcome: 'commit' | 'cancel',
    pointerId?: number,
    updateDraggingState = true,
  ) => {
    const current = dragState.current
    if (!current.type) return
    if (pointerId != null && current.pointerId !== pointerId) return

    const lastDrag = lastDragValuesRef.current
    const captureTarget = current.captureTarget
    const capturedPointerId = current.pointerId
    dragState.current = {
      type: null,
      pointerId: null,
      captureTarget: null,
      originX: 0,
      originStart: current.originStart,
      originEnd: current.originEnd,
    }
    dragWidthRef.current = 0
    lastDragValuesRef.current = null
    if (updateDraggingState) setDragging(false)

    if (outcome === 'cancel') {
      cancelDraftFrame()
      const origin = { start: current.originStart, end: current.originEnd }
      draftRangeRef.current = origin
      if (updateDraggingState) setDraftRange(origin)
    } else if (lastDrag) {
      cancelDraftFrame()
      draftRangeRef.current = lastDrag
      if (updateDraggingState) setDraftRange(lastDrag)
      onCommitRef.current(lastDrag.start, lastDrag.end)
    }

    if (captureTarget && capturedPointerId != null) {
      try {
        if (!captureTarget.hasPointerCapture || captureTarget.hasPointerCapture(capturedPointerId)) {
          captureTarget.releasePointerCapture(capturedPointerId)
        }
      } catch {
        // Capture may already have been released by the browser.
      }
    }
  }, [cancelDraftFrame])

  useEffect(() => {
    if (!dragging) return

    const onPointerMove = (event: PointerEvent) => {
      if (!dragState.current.type || dragState.current.pointerId !== event.pointerId) return
      const width = dragWidthRef.current || 1
      const dx = (event.clientX - dragState.current.originX) / width

      if (dragState.current.type === 'start') {
        const [nextStart, nextEnd] = clampRange(dragState.current.originStart + dx, dragState.current.originEnd)
        publishDraftOnNextFrame(nextStart, nextEnd)
        return
      }

      if (dragState.current.type === 'end') {
        const [nextStart, nextEnd] = clampRange(dragState.current.originStart, dragState.current.originEnd + dx)
        publishDraftOnNextFrame(nextStart, nextEnd)
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
      publishDraftOnNextFrame(nextStart, nextEnd)
    }

    const onPointerUp = (event: PointerEvent) => settleDrag('commit', event.pointerId)
    const onPointerCancel = (event: PointerEvent) => settleDrag('cancel', event.pointerId)
    const onLostPointerCapture = (event: PointerEvent) => settleDrag('cancel', event.pointerId)
    const onWindowBlur = () => settleDrag('cancel')
    const captureTarget = dragState.current.captureTarget

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    window.addEventListener('blur', onWindowBlur)
    captureTarget?.addEventListener('lostpointercapture', onLostPointerCapture)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      window.removeEventListener('blur', onWindowBlur)
      captureTarget?.removeEventListener('lostpointercapture', onLostPointerCapture)
      if (dragState.current.type) settleDrag('cancel', undefined, false)
    }
  }, [clampRange, dragging, publishDraftOnNextFrame, settleDrag])

  const renderedRange = dragging
    ? draftRange
    : { start: startPercent, end: endPercent }

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
            left: `${renderedRange.start * 100}%`,
            width: `${Math.max(renderedRange.end - renderedRange.start, MIN_SCENE_SPAN) * 100}%`,
            background: 'rgba(var(--gl),.28)',
            border: '1px solid rgba(var(--gl),.45)',
            touchAction: 'none',
          }}
          onPointerDown={(event) => {
            event.stopPropagation()
            startDrag('region', event)
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold" style={{ color: 'var(--t2)' }}>
            {sceneName}
          </div>
        </div>

        {([
          ['start', renderedRange.start],
          ['end', renderedRange.end],
        ] as const).map(([type, value]) => (
          <div
            key={type}
            role="slider"
            tabIndex={0}
            aria-label={type === 'start' ? `${ariaLabel} ${t('scenes.rangeStart')}` : `${ariaLabel} ${t('scenes.rangeEnd')}`}
            aria-valuenow={Math.round(value * 100)}
            aria-valuetext={`${Math.round(value * 100)}% ${type === 'start' ? t('scenes.rangeStart') : t('scenes.rangeEnd')}`}
            aria-valuemin={type === 'start' ? 0 : Math.round(renderedRange.start * 100)}
            aria-valuemax={type === 'end' ? 100 : Math.round(renderedRange.end * 100)}
            className="absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 -translate-x-1/2 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-indicator)]"
            style={{ left: `${value * 100}%`, touchAction: 'none' }}
            onPointerDown={(event) => {
              event.stopPropagation()
              startDrag(type, event)
            }}
            onKeyDown={(e) => {
              const step = 0.01
              const currentStart = renderedRange.start
              const currentEnd = renderedRange.end
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault()
                e.stopPropagation()
                if (type === 'start') {
                  const [s] = clampRange(Math.min(currentStart + step, currentEnd - MIN_SCENE_SPAN), currentEnd)
                  commitKeyboardRange(s, currentEnd)
                } else {
                  const [, en] = clampRange(currentStart, Math.min(currentEnd + step, 1))
                  commitKeyboardRange(currentStart, en)
                }
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault()
                e.stopPropagation()
                if (type === 'start') {
                  const [s] = clampRange(Math.max(currentStart - step, 0), currentEnd)
                  commitKeyboardRange(s, currentEnd)
                } else {
                  const [, en] = clampRange(currentStart, Math.max(currentEnd - step, currentStart + MIN_SCENE_SPAN))
                  commitKeyboardRange(currentStart, en)
                }
              } else if (e.key === 'Home') {
                e.preventDefault()
                e.stopPropagation()
                if (type === 'start') {
                  const [s] = clampRange(0, currentEnd)
                  commitKeyboardRange(s, currentEnd)
                } else {
                  const [, en] = clampRange(currentStart, currentStart + MIN_SCENE_SPAN)
                  commitKeyboardRange(currentStart, en)
                }
              } else if (e.key === 'End') {
                e.preventDefault()
                e.stopPropagation()
                if (type === 'start') {
                  const [s] = clampRange(currentEnd - MIN_SCENE_SPAN, currentEnd)
                  commitKeyboardRange(s, currentEnd)
                } else {
                  const [, en] = clampRange(currentStart, 1)
                  commitKeyboardRange(currentStart, en)
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

type CameraParameter = keyof CameraParams

function CameraParameterSlider({
  scene,
  parameter,
  min,
  max,
  step,
  ariaLabel,
  ariaValueText,
  onPreview,
  onPreviewEnd,
  onCommit,
}: {
  scene: Scene
  parameter: CameraParameter
  min: number
  max: number
  step: number
  ariaLabel: string
  ariaValueText: (value: number) => string
  onPreview: (scene: Scene) => void
  onPreviewEnd: (restoreCommittedCamera: boolean) => void
  onCommit: (value: number) => void
}) {
  const committedValue = scene.params[parameter]
  const [draftValue, setDraftValue] = useState(committedValue)
  const [pointerActive, setPointerActive] = useState(false)
  const pointerStateRef = useRef<{
    active: boolean
    pointerId: number | null
    captureTarget: HTMLInputElement | null
    originValue: number
    latestValue: number
  }>({
    active: false,
    pointerId: null,
    captureTarget: null,
    originValue: committedValue,
    latestValue: committedValue,
  })
  const onPreviewRef = useRef(onPreview)
  const onPreviewEndRef = useRef(onPreviewEnd)
  const onCommitRef = useRef(onCommit)
  useEffect(() => { onPreviewRef.current = onPreview }, [onPreview])
  useEffect(() => { onPreviewEndRef.current = onPreviewEnd }, [onPreviewEnd])
  useEffect(() => { onCommitRef.current = onCommit }, [onCommit])

  const previewValue = useCallback((value: number) => {
    onPreviewRef.current({
      ...scene,
      params: {
        ...scene.params,
        [parameter]: value,
      },
    })
  }, [parameter, scene])

  const settlePointer = useCallback((
    outcome: 'commit' | 'cancel',
    pointerId?: number,
    updatePointerState = true,
  ) => {
    const current = pointerStateRef.current
    if (!current.active) return
    if (pointerId != null && current.pointerId !== pointerId) return

    pointerStateRef.current = {
      active: false,
      pointerId: null,
      captureTarget: null,
      originValue: current.originValue,
      latestValue: current.latestValue,
    }
    if (updatePointerState) setPointerActive(false)

    if (outcome === 'commit') {
      const changed = current.latestValue !== current.originValue
      onPreviewEndRef.current(!changed)
      if (changed) {
        if (updatePointerState) setDraftValue(current.latestValue)
        onCommitRef.current(current.latestValue)
      }
    } else {
      if (updatePointerState) setDraftValue(current.originValue)
      onPreviewEndRef.current(true)
    }

    if (current.captureTarget && current.pointerId != null) {
      try {
        if (!current.captureTarget.hasPointerCapture || current.captureTarget.hasPointerCapture(current.pointerId)) {
          current.captureTarget.releasePointerCapture(current.pointerId)
        }
      } catch {
        // Capture may already have been released by the browser.
      }
    }
  }, [])

  useEffect(() => {
    if (!pointerActive) return

    const onPointerUp = (event: PointerEvent) => settlePointer('commit', event.pointerId)
    const onPointerCancel = (event: PointerEvent) => settlePointer('cancel', event.pointerId)
    const onWindowBlur = () => settlePointer('cancel')
    const captureTarget = pointerStateRef.current.captureTarget
    const onLostPointerCapture = (event: PointerEvent) => settlePointer('cancel', event.pointerId)

    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    window.addEventListener('blur', onWindowBlur)
    captureTarget?.addEventListener('lostpointercapture', onLostPointerCapture)
    return () => {
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      window.removeEventListener('blur', onWindowBlur)
      captureTarget?.removeEventListener('lostpointercapture', onLostPointerCapture)
      if (pointerStateRef.current.active) settlePointer('cancel', undefined, false)
    }
  }, [pointerActive, settlePointer])

  const renderedValue = pointerActive ? draftValue : committedValue

  return (
    <>
      <span className="text-[10px]" style={{ color: 'var(--t4)' }}>{ariaValueText(renderedValue)}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={renderedValue}
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse' && event.button !== 0) return
          try {
            event.currentTarget.setPointerCapture(event.pointerId)
          } catch {
            // Capture can fail if the pointer already ended between dispatch and handler.
          }
          pointerStateRef.current = {
            active: true,
            pointerId: event.pointerId,
            captureTarget: event.currentTarget,
            originValue: committedValue,
            latestValue: committedValue,
          }
          setDraftValue(committedValue)
          setPointerActive(true)
        }}
        onChange={(event) => {
          const value = Number.parseFloat(event.target.value)
          if (!Number.isFinite(value)) return
          setDraftValue(value)
          if (pointerStateRef.current.active) {
            pointerStateRef.current.latestValue = value
            previewValue(value)
            return
          }
          onCommitRef.current(value)
          previewValue(value)
        }}
        onKeyUp={() => {
          if (!pointerStateRef.current.active) onPreviewEndRef.current(true)
        }}
        onBlur={() => {
          if (pointerStateRef.current.active) {
            settlePointer('cancel')
            return
          }
          onPreviewEndRef.current(true)
        }}
        aria-label={ariaLabel}
        aria-valuetext={ariaValueText(renderedValue)}
        className="w-full h-1 cursor-pointer"
        style={{ accentColor: 'rgb(var(--gl))' }}
      />
    </>
  )
}

function SceneEditor({ scenes, onChange, onScenesCommitted, onClose, transitionDuration, onTransitionDurationChange, onPreviewScene }: SceneEditorProps) {
  const { t } = useLocale()
  const [deletedScene, setDeletedScene] = useState<{ scene: Scene; index: number } | null>(null)
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null)
  const [pendingPresetType, setPendingPresetType] = useState<PresetType | null>(null)
  const [focusedInput, setFocusedInput] = useState<string | null>(null)
  const previewFrameRef = useRef<number | null>(null)
  const pendingPreviewRef = useRef<Scene | null>(null)
  const previewAppliedRef = useRef(false)
  const onPreviewSceneRef = useRef(onPreviewScene)
  useEffect(() => { onPreviewSceneRef.current = onPreviewScene }, [onPreviewScene])

  const [normalizationWarnings, setNormalizationWarnings] = useState<SceneWarning[]>([])
  const availableSceneRange = findFirstAvailableSceneRange(scenes)

  const schedulePreview = useCallback((scene: Scene) => {
    if (!onPreviewSceneRef.current) return
    pendingPreviewRef.current = scene
    if (previewFrameRef.current != null) return
    previewFrameRef.current = requestAnimationFrame(() => {
      previewFrameRef.current = null
      const pendingPreview = pendingPreviewRef.current
      pendingPreviewRef.current = null
      if (pendingPreview) {
        previewAppliedRef.current = true
        onPreviewSceneRef.current?.(pendingPreview)
      }
    })
  }, [])

  const endPreview = useCallback((restoreCommittedCamera: boolean) => {
    if (previewFrameRef.current != null) {
      cancelAnimationFrame(previewFrameRef.current)
      previewFrameRef.current = null
    }
    pendingPreviewRef.current = null
    if (restoreCommittedCamera && previewAppliedRef.current) {
      previewAppliedRef.current = false
      onPreviewSceneRef.current?.(null)
    } else if (!restoreCommittedCamera) {
      previewAppliedRef.current = false
    }
  }, [])

  useEffect(() => () => endPreview(true), [endPreview])

  const commitScenes = useCallback((nextScenes: Scene[]) => {
    const normalized = normalizeScenes(nextScenes)
    const w: SceneWarning[] = []
    // Identify scenes that will be removed by normalization (start >= end)
    // and report them as "will be removed" rather than "has start >= end",
    // since the scene won't exist in the final list.
    for (const s of nextScenes) {
      if (s.startPercent >= s.endPercent) {
        w.push({ kind: 'removed', sceneName: s.name })
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
            w.push({
              kind: 'adjusted',
              boundary: 'start',
              sceneName: orig.name,
              from: orig.startPercent,
              to: norm.startPercent,
            })
          }
          if (endDiff > 0.001) {
            w.push({
              kind: 'adjusted',
              boundary: 'end',
              sceneName: orig.name,
              from: orig.endPercent,
              to: norm.endPercent,
            })
          }
        }
        // Fallback if no specific diff found (should not happen)
        if (w.length === 0) {
          w.push({ kind: 'rangesAdjusted' })
        }
      }
    }
    setNormalizationWarnings(w)

    onChange(normalized)
    onScenesCommitted?.(normalized)
  }, [onChange, onScenesCommitted])

  // Swipe-left to dismiss
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target instanceof Element ? e.target : null
    if (!target?.closest('[data-scene-editor-swipe-handle="true"]')) {
      touchStartRef.current = null
      return
    }
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    touchStartRef.current = null
    if (dx < -80 && Math.abs(dy) < Math.abs(dx) * 0.3) onClose()
  }, [onClose])
  const handleTouchCancel = useCallback(() => {
    touchStartRef.current = null
  }, [])

  const addScene = useCallback(() => {
    if (!availableSceneRange) return
    const newScene: Scene = {
      id: `scene-${generateId().slice(0, 8)}`,
      name: t('scenes.newSceneName').replace('{n}', String(scenes.length + 1)),
      cameraMode: 'flyover',
      startPercent: availableSceneRange.startPercent,
      endPercent: availableSceneRange.endPercent,
      params: { ...DEFAULT_CAMERA_PARAMS.flyover },
    }
    commitScenes([...scenes, newScene])
  }, [availableSceneRange, commitScenes, scenes, t])

  const removeScene = useCallback((id: string) => {
    const idx = scenes.findIndex(s => s.id === id)
    if (idx >= 0) setDeletedScene({ scene: scenes[idx], index: idx })
    commitScenes(scenes.filter(s => s.id !== id))
  }, [commitScenes, scenes])

  const undoDelete = useCallback(() => {
    if (!deletedScene) return
    const result = restoreDeletedScene(scenes, deletedScene.scene, deletedScene.index)
    if (result.restored) {
      setNormalizationWarnings([])
      onChange(result.scenes)
      onScenesCommitted?.(result.scenes)
    } else if (result.reason === 'conflict') {
      setNormalizationWarnings([{ kind: 'undoConflict' }])
    }
    setDeletedScene(null)
  }, [deletedScene, onChange, onScenesCommitted, scenes])

  const updateScene = useCallback((id: string, patch: Partial<Scene>) => {
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
      return updated
    }))
  }, [commitScenes, scenes])

  const renderedNormalizationWarnings = normalizationWarnings.map(warning => formatSceneWarning(warning, t))
  const statusMessage = deletedScene
    ? `${t('scenes.deleted')} ${deletedScene.scene.name}`
    : renderedNormalizationWarnings.join(' ')

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
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchCancel}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--div)' }}>
        <div
          data-testid="scene-editor-swipe-handle"
          data-scene-editor-swipe-handle="true"
          className="flex min-h-11 flex-1 touch-pan-y items-center gap-2"
        >
          <span aria-hidden="true" className="h-1 w-6 rounded-full sm:hidden" style={{ background: 'var(--t4)' }} />
          <h3 id="scene-editor-title" className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{t('scenes.title')}</h3>
        </div>
        <div data-testid="scene-editor-status" role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {statusMessage}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={addScene} disabled={!availableSceneRange}
            className="vitro-btn-primary min-h-11 px-3 py-2 text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">
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
              {renderedNormalizationWarnings.map((w, i) => (
                <p key={i} className="text-[10px]" style={{ color: 'var(--warn-fg)' }}>⚠ {w}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {scenes.map((scene, sceneIndex) => (
          <div key={scene.id}
            className="gi nh p-3 space-y-2" style={{ borderRadius: '10px' }}>
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
                aria-label={formatSceneCameraModeLabel(t('scenes.cameraModeAria'), scene.name, sceneIndex + 1)}
                className="vitro-select min-h-11 min-w-0 w-full flex-1 px-3 py-2 text-sm">
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
                  onCommit={(startPercent, endPercent) => updateScene(scene.id, { startPercent, endPercent })}
                />

                <div className="flex gap-2">
                  <label className="flex-1">
                    <CameraParameterSlider
                      scene={scene}
                      parameter="zoom"
                      min={1}
                      max={20}
                      step={0.5}
                      onPreview={schedulePreview}
                      onPreviewEnd={endPreview}
                      onCommit={value => updateScene(scene.id, { params: { ...scene.params, zoom: value } })}
                      ariaLabel={t('scenes.zoomAria').replace('{name}', scene.name)}
                      ariaValueText={value => `${t('scenes.zoom')} ${value}`}
                    />
                    <span className="text-[9px] flex justify-between" style={{ color: 'var(--t5, var(--t4))' }}>
                      <span>{t('scenes.zoomFar')}</span><span>{t('scenes.zoomClose')}</span>
                    </span>
                  </label>
                  <label className="flex-1">
                    <CameraParameterSlider
                      scene={scene}
                      parameter="pitch"
                      min={0}
                      max={85}
                      step={1}
                      onPreview={schedulePreview}
                      onPreviewEnd={endPreview}
                      onCommit={value => updateScene(scene.id, { params: { ...scene.params, pitch: value } })}
                      ariaLabel={t('scenes.pitchAria').replace('{name}', scene.name)}
                      ariaValueText={value => `${t('scenes.pitch')} ${value}°`}
                    />
                    <span className="text-[9px] flex justify-between" style={{ color: 'var(--t5, var(--t4))' }}>
                      <span>{t('scenes.pitchFlat')}</span><span>{t('scenes.pitchAngled')}</span>
                    </span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <label className="flex-1">
                    <CameraParameterSlider
                      scene={scene}
                      parameter="bearingOffset"
                      min={-180}
                      max={180}
                      step={1}
                      onPreview={schedulePreview}
                      onPreviewEnd={endPreview}
                      onCommit={value => updateScene(scene.id, { params: { ...scene.params, bearingOffset: value } })}
                      ariaLabel={t('scenes.bearingAria').replace('{name}', scene.name)}
                      ariaValueText={value => `${t('scenes.bearing')} ${value}°`}
                    />
                    <span className="text-[9px] flex justify-between" style={{ color: 'var(--t5, var(--t4))' }}>
                      <span>{t('scenes.bearingLeft')}</span><span>{t('scenes.bearingRight')}</span>
                    </span>
                  </label>
                  <label className="flex-1">
                    <CameraParameterSlider
                      scene={scene}
                      parameter="rotationSpeed"
                      min={0}
                      max={90}
                      step={1}
                      onPreview={schedulePreview}
                      onPreviewEnd={endPreview}
                      onCommit={value => updateScene(scene.id, { params: { ...scene.params, rotationSpeed: value } })}
                      ariaLabel={t('scenes.rotationAria').replace('{name}', scene.name)}
                      ariaValueText={value => `${t('scenes.rotation')} ${value}°/s`}
                    />
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
            className="text-xs px-2 py-0.5 font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]" style={{ color: 'var(--accent-text)' }}>
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
