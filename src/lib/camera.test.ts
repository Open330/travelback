import { describe, it, expect } from 'vitest'
import { normalizeScenes, lerpCamera, computeCameraForProgress, generateDefaultScenes, generateSimpleFlyover, generateBirdeyeFlyover, generateDynamicScenes, restoreDeletedScene } from './camera'
import type { Scene, Track } from '@/types'

const makeScene = (id: string, start: number, end: number, mode: Scene['cameraMode'] = 'flyover'): Scene => ({
  id,
  name: id,
  cameraMode: mode,
  startPercent: start,
  endPercent: end,
  params: { zoom: 14, pitch: 45, bearingOffset: 0, rotationSpeed: 0 },
})

// Simple straight-line track along latitude 0 from lng 0 to lng 1
const testTrack: Track = {
  name: 'test',
  points: Array.from({ length: 101 }, (_, i) => ({
    lat: 0,
    lng: i / 100,
    time: new Date(i * 1000),
  })),
}
const testCumulDist = Array.from({ length: 101 }, (_, i) => i * 111320 / 100)

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

describe('restoreDeletedScene', () => {
  it('clips only the restored scene around a later range edit', () => {
    const first = makeScene('first', 0, 0.15)
    const deleted = { ...makeScene('deleted', 0.15, 0.3), name: 'Deleted', cameraMode: 'orbit' as const, params: { zoom: 9, pitch: 60, bearingOffset: 20, rotationSpeed: 12 } }
    const editedLater = { ...makeScene('later', 0.25, 0.45), name: 'Edited later' }

    const result = restoreDeletedScene([first, editedLater], deleted, 1)

    expect(result.restored).toBe(true)
    if (!result.restored) return
    expect(result.scenes[0]).toBe(first)
    expect(result.scenes[2]).toBe(editedLater)
    expect(result.scenes[1]).toEqual({
      ...deleted,
      startPercent: 0.15,
      endPercent: 0.25,
    })
  })

  it('clips the restored start when the previous scene grew', () => {
    const grownPrevious = makeScene('first', 0, 0.2)
    const deleted = makeScene('deleted', 0.15, 0.3)
    const later = makeScene('later', 0.4, 0.6)

    const result = restoreDeletedScene([grownPrevious, later], deleted, 1)

    expect(result).toMatchObject({
      restored: true,
      scenes: [grownPrevious, { id: 'deleted', startPercent: 0.2, endPercent: 0.3 }, later],
    })
  })

  it('rejects restoration when less than the minimum original span is free', () => {
    const scenes = [makeScene('first', 0, 0.245), makeScene('later', 0.25, 0.6)]
    const result = restoreDeletedScene(scenes, makeScene('deleted', 0.15, 0.3), 1)

    expect(result).toEqual({ restored: false, reason: 'conflict', scenes })
  })

  it('does not insert a duplicate scene id', () => {
    const existing = makeScene('same', 0, 0.2)
    const scenes = [existing]

    expect(restoreDeletedScene(scenes, makeScene('same', 0.2, 0.4), 1)).toEqual({
      restored: false,
      reason: 'duplicate',
      scenes,
    })
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

describe('computeCameraForProgress', () => {
  it('returns default follow camera when no scenes', () => {
    const result = computeCameraForProgress(testTrack, testCumulDist, [], 0.5, 0)
    expect(result.center).toBeDefined()
    expect(result.zoom).toBeGreaterThan(0)
    expect(Number.isFinite(result.bearing)).toBe(true)
  })

  it('returns a camera within a single scene', () => {
    const scenes = [makeScene('1', 0, 1)]
    const result = computeCameraForProgress(testTrack, testCumulDist, scenes, 0.5, 0)
    expect(result.center).toBeDefined()
    expect(result.zoom).toBeGreaterThan(0)
  })

  it('interpolates between scenes at a gap', () => {
    const scenes = [
      makeScene('a', 0, 0.4),
      makeScene('b', 0.6, 1),
    ]
    const normalized = normalizeScenes(scenes)
    // Progress 0.5 is in the gap between scene a (ends 0.4) and scene b (starts 0.6)
    const result = computeCameraForProgress(testTrack, testCumulDist, normalized, 0.5, 0, 0.03, true)
    expect(result.center).toBeDefined()
    expect(result.zoom).toBeGreaterThan(0)
  })

  it('interpolates from overview camera before first scene', () => {
    const scenes = [makeScene('1', 0.4, 1)]
    const normalized = normalizeScenes(scenes)
    // Progress 0.2 is before the first scene starts at 0.4
    const result = computeCameraForProgress(testTrack, testCumulDist, normalized, 0.2, 0, 0.03, true)
    expect(result.center).toBeDefined()
    expect(result.zoom).toBeGreaterThan(0)
  })

  it('uses default follow camera after last scene', () => {
    const scenes = [makeScene('1', 0, 0.4)]
    const normalized = normalizeScenes(scenes)
    // Progress 0.7 is after the scene ends at 0.4
    const result = computeCameraForProgress(testTrack, testCumulDist, normalized, 0.7, 0, 0.03, true)
    expect(result.center).toBeDefined()
    expect(result.zoom).toBeGreaterThan(0)
  })

  it('blends at scene boundaries with transition', () => {
    const scenes = [
      makeScene('a', 0, 0.5),
      makeScene('b', 0.5, 1),
    ]
    const normalized = normalizeScenes(scenes)
    // At the boundary between scenes, the transition blending should kick in
    const result = computeCameraForProgress(testTrack, testCumulDist, normalized, 0.5, 0, 0.03, true)
    expect(result.center).toBeDefined()
    expect(result.zoom).toBeGreaterThan(0)
  })

  it('handles zero-duration scene gracefully (filtered by normalization)', () => {
    const scenes = [makeScene('1', 0.3, 0.3)]
    // After normalization, this scene is filtered out, so the result should
    // be the same as having no scenes (default follow camera)
    const result = computeCameraForProgress(testTrack, testCumulDist, scenes, 0.5, 0)
    expect(result.center).toBeDefined()
    expect(result.zoom).toBeGreaterThan(0)
  })

  it('handles progress at 0 and 1 boundaries', () => {
    const scenes = [makeScene('1', 0, 1)]
    const atStart = computeCameraForProgress(testTrack, testCumulDist, scenes, 0, 0)
    const atEnd = computeCameraForProgress(testTrack, testCumulDist, scenes, 1, 0)
    expect(atStart.center).toBeDefined()
    expect(atEnd.center).toBeDefined()
    expect(atStart.zoom).toBeGreaterThan(0)
    expect(atEnd.zoom).toBeGreaterThan(0)
  })

  it('applies birdeye look-ahead bearing', () => {
    const scenes = [makeScene('be', 0, 1, 'birdeye')]
    scenes[0].params = { zoom: 11, pitch: 65, bearingOffset: 0, rotationSpeed: 5 }
    const atMid = computeCameraForProgress(testTrack, testCumulDist, scenes, 0.5, 10, 0.03, true)
    // birdeye uses look-ahead + drift, so bearing should be non-zero with elapsed time
    expect(Number.isFinite(atMid.bearing)).toBe(true)
    expect(atMid.pitch).toBe(65)
    expect(atMid.zoom).toBe(11)
  })

  it('applies orbit rotation based on elapsed time', () => {
    const scenes = [makeScene('orbit', 0, 1, 'orbit')]
    scenes[0].params = { zoom: 14, pitch: 60, bearingOffset: 0, rotationSpeed: 36 }
    const atT0 = computeCameraForProgress(testTrack, testCumulDist, scenes, 0.5, 0, 0.03, true)
    const atT5 = computeCameraForProgress(testTrack, testCumulDist, scenes, 0.5, 5, 0.03, true)
    // Orbit bearing changes with elapsed time (36 deg/s)
    expect(atT5.bearing).not.toBeCloseTo(atT0.bearing, 0)
  })

  it('returns correct camera for overview mode', () => {
    const scenes = [makeScene('ov', 0, 1, 'overview')]
    scenes[0].params = { zoom: 10, pitch: 45, bearingOffset: 0, rotationSpeed: 10 }
    const result = computeCameraForProgress(testTrack, testCumulDist, scenes, 0.5, 5, 0.03, true)
    // Overview centers on the track bounding box, not the current position
    expect(result.pitch).toBe(45)
    expect(Number.isFinite(result.bearing)).toBe(true)
  })
})

describe('scene preset generators', () => {
  const validateScenes = (scenes: Scene[]) => {
    expect(scenes.length).toBeGreaterThan(0)
    // First scene starts at 0
    expect(scenes[0].startPercent).toBe(0)
    // Last scene ends at 1
    expect(scenes[scenes.length - 1].endPercent).toBe(1)
    // All IDs are unique
    const ids = scenes.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    // Monotonically increasing, non-overlapping ranges
    for (let i = 0; i < scenes.length; i++) {
      expect(scenes[i].startPercent).toBeLessThan(scenes[i].endPercent)
      if (i > 0) {
        expect(scenes[i].startPercent).toBeGreaterThanOrEqual(scenes[i - 1].endPercent)
      }
    }
    // All scenes have valid camera modes
    const validModes = ['overview', 'flyover', 'orbit', 'ground', 'closeup', 'birdeye']
    for (const scene of scenes) {
      expect(validModes).toContain(scene.cameraMode)
      expect(Number.isFinite(scene.params.zoom)).toBe(true)
      expect(Number.isFinite(scene.params.pitch)).toBe(true)
    }
  }

  it('generateDefaultScenes produces valid cinematic sequence', () => {
    const scenes = generateDefaultScenes()
    validateScenes(scenes)
    expect(scenes.length).toBe(6)
  })

  it('generateSimpleFlyover produces a single full-track flyover', () => {
    const scenes = generateSimpleFlyover()
    validateScenes(scenes)
    expect(scenes.length).toBe(1)
    expect(scenes[0].cameraMode).toBe('flyover')
  })

  it('generateBirdeyeFlyover produces a single full-track birdeye', () => {
    const scenes = generateBirdeyeFlyover()
    validateScenes(scenes)
    expect(scenes.length).toBe(1)
    expect(scenes[0].cameraMode).toBe('birdeye')
  })

  it('generateDynamicScenes produces a multi-scene dynamic sequence', () => {
    const scenes = generateDynamicScenes()
    validateScenes(scenes)
    expect(scenes.length).toBeGreaterThan(1)
  })
})
