import { describe, it, expect } from 'vitest'
import { normalizeScenes, lerpCamera } from './camera'
import type { Scene } from '@/types'

const makeScene = (id: string, start: number, end: number, mode: Scene['cameraMode'] = 'flyover'): Scene => ({
  id,
  name: id,
  cameraMode: mode,
  startPercent: start,
  endPercent: end,
  params: { zoom: 14, pitch: 45, bearingOffset: 0, rotationSpeed: 0 },
})

describe('normalizeScenes', () => {
  it('returns empty array for empty input', () => {
    expect(normalizeScenes([])).toEqual([])
  })

  it('sorts scenes by startPercent', () => {
    const scenes = [makeScene('b', 0.5, 1), makeScene('a', 0, 0.5)]
    const result = normalizeScenes(scenes)
    expect(result[0].id).toBe('a')
    expect(result[1].id).toBe('b')
  })

  it('clamps percents to [0, 1]', () => {
    const scenes = [makeScene('1', -0.5, 1.5)]
    const result = normalizeScenes(scenes)
    expect(result[0].startPercent).toBe(0)
    expect(result[0].endPercent).toBe(1)
  })

  it('prevents scenes from overlapping (sequential clamping)', () => {
    const scenes = [
      makeScene('1', 0, 0.6),
      makeScene('2', 0.4, 0.8),
    ]
    const result = normalizeScenes(scenes)
    expect(result[0].startPercent).toBe(0)
    expect(result[0].endPercent).toBe(0.6)
    // Second scene start clamped to end of first
    expect(result[1].startPercent).toBe(0.6)
    expect(result[1].endPercent).toBe(0.8)
  })

  it('filters out zero-length scenes', () => {
    const scenes = [makeScene('1', 0.3, 0.3)]
    const result = normalizeScenes(scenes)
    expect(result.length).toBe(0)
  })

  it('filters out scenes that collapse after clamping', () => {
    const scenes = [
      makeScene('1', 0, 0.5),
      makeScene('2', 0.3, 0.4), // Collapses: start clamped to 0.5, end is 0.4 -> start > end
    ]
    const result = normalizeScenes(scenes)
    expect(result.length).toBe(1)
    expect(result[0].id).toBe('1')
  })

  it('handles NaN/Infinity startPercent', () => {
    const scenes = [makeScene('1', NaN, 1)]
    const result = normalizeScenes(scenes)
    // NaN is clamped to fallback (0 for startPercent)
    expect(result[0].startPercent).toBe(0)
  })
})

describe('lerpCamera', () => {
  it('returns start camera at t=0', () => {
    const a = { center: [0, 0] as [number, number], zoom: 10, pitch: 30, bearing: 90 }
    const b = { center: [1, 1] as [number, number], zoom: 15, pitch: 60, bearing: 270 }
    const result = lerpCamera(a, b, 0)
    expect(result.center[0]).toBeCloseTo(0, 5)
    expect(result.center[1]).toBeCloseTo(0, 5)
    expect(result.zoom).toBeCloseTo(10, 5)
    expect(result.pitch).toBeCloseTo(30, 5)
    expect(result.bearing).toBeCloseTo(90, 5)
  })

  it('returns end camera at t=1', () => {
    const a = { center: [0, 0] as [number, number], zoom: 10, pitch: 30, bearing: 90 }
    const b = { center: [1, 1] as [number, number], zoom: 15, pitch: 60, bearing: 270 }
    const result = lerpCamera(a, b, 1)
    expect(result.center[0]).toBeCloseTo(1, 5)
    expect(result.center[1]).toBeCloseTo(1, 5)
    expect(result.zoom).toBeCloseTo(15, 5)
    expect(result.pitch).toBeCloseTo(60, 5)
    expect(result.bearing).toBeCloseTo(-90, 5)
  })

  it('uses smoothstep easing (not linear)', () => {
    const a = { center: [0, 0] as [number, number], zoom: 0, pitch: 0, bearing: 0 }
    const b = { center: [1, 0] as [number, number], zoom: 1, pitch: 0, bearing: 0 }
    const midLinear = 0.5
    const smoothMid = midLinear * midLinear * (3 - 2 * midLinear)
    const result = lerpCamera(a, b, 0.5)
    expect(result.center[0]).toBeCloseTo(smoothMid, 10)
    // smoothstep(0.5) = 0.5, so this particular midpoint is the same
    expect(smoothMid).toBeCloseTo(0.5, 10)
    // But at t=0.25, smoothstep = 0.1875 != 0.25
    const result25 = lerpCamera(a, b, 0.25)
    expect(result25.center[0]).not.toBeCloseTo(0.25, 2)
    expect(result25.center[0]).toBeCloseTo(0.15625, 5)
  })

  it('interpolates bearing via shortest path', () => {
    const a = { center: [0, 0] as [number, number], zoom: 10, pitch: 0, bearing: 10 }
    const b = { center: [0, 0] as [number, number], zoom: 10, pitch: 0, bearing: 350 }
    const result = lerpCamera(a, b, 0.5)
    // Should go 10 -> 350 via shortest path (through 0/360), midpoint ~0
    expect(result.bearing).toBeCloseTo(0, 0)
  })
})
