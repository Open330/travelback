'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Track } from '@/types'

interface TimelineSelectorProps {
  track: Track
  onRangeChange: (startIdx: number, endIdx: number) => void
  className?: string
}

const BUCKET_COUNT = 100
const HANDLE_RADIUS = 10

function formatDate(date: Date | undefined): string {
  if (!date) return ''
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TimelineSelector({
  track,
  onRangeChange,
  className = '',
}: TimelineSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  // startRatio and endRatio are [0,1] fractions of the full timeline
  const [startRatio, setStartRatio] = useState(0)
  const [endRatio, setEndRatio] = useState(1)

  // drag state stored in refs to avoid re-renders during drag
  const dragState = useRef<{
    dragging: 'start' | 'end' | 'region' | null
    originX: number
    originStart: number
    originEnd: number
  }>({ dragging: null, originX: 0, originStart: 0, originEnd: 1 })

  const points = track.points

  // Compute bucket densities
  const buckets = useMemo(() => {
    const arr = new Array<number>(BUCKET_COUNT).fill(0)
    if (points.length === 0) return arr
    for (let i = 0; i < points.length; i++) {
      const b = Math.min(
        BUCKET_COUNT - 1,
        Math.floor((i / points.length) * BUCKET_COUNT)
      )
      arr[b]++
    }
    return arr
  }, [points])

  const maxBucket = useMemo(() => Math.max(...buckets, 1), [buckets])

  // Convert ratio -> point index
  const ratioToIdx = useCallback(
    (ratio: number) => {
      const clamped = Math.max(0, Math.min(1, ratio))
      return Math.round(clamped * (points.length - 1))
    },
    [points.length]
  )

  // Notify parent whenever ratios change
  useEffect(() => {
    if (points.length === 0) return
    onRangeChange(ratioToIdx(startRatio), ratioToIdx(endRatio))
  }, [startRatio, endRatio, ratioToIdx, onRangeChange, points.length])

  // Get container width in pixels
  const getWidth = () => containerRef.current?.getBoundingClientRect().width ?? 1

  const clampRatios = (s: number, e: number): [number, number] => {
    const minGap = 1 / (points.length || 1)
    s = Math.max(0, Math.min(s, 1 - minGap))
    e = Math.max(minGap, Math.min(e, 1))
    if (s >= e - minGap) {
      e = Math.min(1, s + minGap)
    }
    return [s, e]
  }

  const applyDrag = useCallback(
    (clientX: number) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        const ds = dragState.current
        if (!ds.dragging) return
        const width = getWidth()
        const dx = (clientX - ds.originX) / width

        if (ds.dragging === 'start') {
          const newStart = Math.max(0, Math.min(ds.originStart + dx, ds.originEnd - 0.01))
          const [s, e] = clampRatios(newStart, ds.originEnd)
          setStartRatio(s)
          setEndRatio(e)
        } else if (ds.dragging === 'end') {
          const newEnd = Math.max(ds.originStart + 0.01, Math.min(1, ds.originEnd + dx))
          const [s, e] = clampRatios(ds.originStart, newEnd)
          setStartRatio(s)
          setEndRatio(e)
        } else if (ds.dragging === 'region') {
          const span = ds.originEnd - ds.originStart
          let newStart = ds.originStart + dx
          let newEnd = ds.originEnd + dx
          if (newStart < 0) { newStart = 0; newEnd = span }
          if (newEnd > 1) { newEnd = 1; newStart = 1 - span }
          setStartRatio(newStart)
          setEndRatio(newEnd)
        }
        rafRef.current = null
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const startDrag = (
    type: 'start' | 'end' | 'region',
    clientX: number
  ) => {
    dragState.current = {
      dragging: type,
      originX: clientX,
      originStart: startRatio,
      originEnd: endRatio,
    }
  }

  const endDrag = () => {
    dragState.current.dragging = null
  }

  // Global mouse/touch listeners for drag
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => applyDrag(e.clientX)
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) applyDrag(e.touches[0].clientX)
    }
    const onUp = () => endDrag()

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [applyDrag])

  if (points.length === 0) return null

  // Dates for display
  const startIdx = ratioToIdx(startRatio)
  const endIdx = ratioToIdx(endRatio)
  const startDate = points[startIdx]?.time
  const endDate = points[endIdx]?.time

  // Has any time data?
  const hasTime = points.some((p) => p.time)

  return (
    <div className={`select-none ${className}`}>
      <div
        ref={containerRef}
        className="gc nh relative h-16 cursor-crosshair overflow-visible"
        style={{ userSelect: 'none', borderRadius: '10px' }}
      >
        {/* Histogram bars */}
        <div className="absolute inset-x-0 bottom-0 top-0 flex items-end px-3 gap-px pointer-events-none">
          {buckets.map((count, i) => {
            const heightPct = (count / maxBucket) * 100
            const bucketRatio = i / BUCKET_COUNT
            const inRange = bucketRatio >= startRatio && bucketRatio < endRatio
            return (
              <div
                key={i}
                className="flex-1 rounded-sm transition-colors duration-75"
                style={{
                  height: `${Math.max(heightPct, 4)}%`,
                  backgroundColor: inRange
                    ? 'rgba(var(--gl),.85)'
                    : 'rgba(128,128,128,.25)',
                }}
              />
            )
          })}
        </div>

        {/* Selected region overlay - draggable */}
        <div
          className="absolute top-0 bottom-0 cursor-grab active:cursor-grabbing"
          style={{
            left: `${startRatio * 100}%`,
            width: `${(endRatio - startRatio) * 100}%`,
            backgroundColor: 'rgba(var(--gl),.08)',
            borderLeft: '2px solid rgba(var(--gl),.4)',
            borderRight: '2px solid rgba(var(--gl),.4)',
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
            startDrag('region', e.clientX)
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            if (e.touches.length > 0) startDrag('region', e.touches[0].clientX)
          }}
        />

        {/* Start handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 cursor-ew-resize z-10 flex items-center justify-center"
          style={{
            left: `calc(${startRatio * 100}% - ${HANDLE_RADIUS}px)`,
            width: HANDLE_RADIUS * 2,
            height: HANDLE_RADIUS * 2 + 8,
            touchAction: 'none',
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
            startDrag('start', e.clientX)
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            if (e.touches.length > 0) startDrag('start', e.touches[0].clientX)
          }}
        >
          <div
            className="w-4 h-8 rounded-full shadow-lg flex items-center justify-center"
            style={{ background: 'rgb(var(--gl))', border: '2px solid rgba(255,255,255,.5)' }}
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-px h-2 rounded" style={{ background: 'rgba(0,0,0,.4)' }} />
              <div className="w-px h-2 rounded" style={{ background: 'rgba(0,0,0,.4)' }} />
            </div>
          </div>
        </div>

        {/* End handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 cursor-ew-resize z-10 flex items-center justify-center"
          style={{
            left: `calc(${endRatio * 100}% - ${HANDLE_RADIUS}px)`,
            width: HANDLE_RADIUS * 2,
            height: HANDLE_RADIUS * 2 + 8,
            touchAction: 'none',
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
            startDrag('end', e.clientX)
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            if (e.touches.length > 0) startDrag('end', e.touches[0].clientX)
          }}
        >
          <div
            className="w-4 h-8 rounded-full shadow-lg flex items-center justify-center"
            style={{ background: 'rgb(var(--gl))', border: '2px solid rgba(255,255,255,.5)' }}
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-px h-2 rounded" style={{ background: 'rgba(0,0,0,.4)' }} />
              <div className="w-px h-2 rounded" style={{ background: 'rgba(0,0,0,.4)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Date labels */}
      {hasTime && (
        <div className="relative h-5 mt-1 text-xs pointer-events-none" style={{ color: 'var(--t4)' }}>
          <span
            className="absolute"
            style={{
              left: `${startRatio * 100}%`,
              transform: startRatio > 0.6 ? 'translateX(-100%)' : 'translateX(-4px)',
              whiteSpace: 'nowrap',
            }}
          >
            {formatDate(startDate)}
          </span>
          {endRatio - startRatio > 0.08 && (
            <span
              className="absolute"
              style={{
                left: `${endRatio * 100}%`,
                transform: endRatio > 0.6 ? 'translateX(-100%)' : 'translateX(-4px)',
                whiteSpace: 'nowrap',
              }}
            >
              {formatDate(endDate)}
            </span>
          )}
        </div>
      )}

      {/* Point count summary */}
      <div className="text-xs mt-0.5 text-center" style={{ color: 'var(--t4)' }}>
        {endIdx - startIdx + 1} / {points.length} points
      </div>
    </div>
  )
}
