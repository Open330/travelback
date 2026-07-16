// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Track } from '@/types'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const parseTrackFile = vi.hoisted(() => vi.fn())

vi.mock('@/lib/parser', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/parser')>(),
  parseTrackFile,
}))

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const imageProps = { ...props }
    delete imageProps.priority
    return createElement('img', imageProps)
  },
}))

import FileUpload from './FileUpload'

let root: Root | null = null
let container: HTMLDivElement | null = null

afterEach(async () => {
  if (root) await act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  parseTrackFile.mockReset()
})

describe('FileUpload request lifecycle', () => {
  it('aborts and ignores an import that resolves after starting a journey', async () => {
    let resolveParse!: (track: Track) => void
    parseTrackFile.mockReturnValue(new Promise<Track>((resolve) => {
      resolveParse = resolve
    }))
    const onTrackLoaded = vi.fn()
    const onCreateJourney = vi.fn()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(() => root?.render(createElement(FileUpload, {
      hasTrack: false,
      onTrackLoaded,
      onCreateJourney,
    })))

    const dropZone = container.querySelector<HTMLElement>('[role="group"]')
    const file = new File(['pending'], 'trip.gpx', { type: 'application/gpx+xml' })
    const drop = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [file] } })
    await act(() => dropZone?.dispatchEvent(drop))

    const options = parseTrackFile.mock.calls[0][1] as { signal: AbortSignal }
    const journeyButton = [...container.querySelectorAll('button')]
      .find(button => button.textContent?.includes('Draw a route on the map'))
    await act(() => journeyButton?.click())

    expect(options.signal.aborted).toBe(true)
    expect(onCreateJourney).toHaveBeenCalledOnce()

    await act(async () => {
      resolveParse({
        name: 'Old import',
        points: [{ lat: 37, lng: 127 }, { lat: 38, lng: 128 }],
      })
      await Promise.resolve()
    })
    expect(onTrackLoaded).not.toHaveBeenCalled()
  })

  it('announces an import before parsing starts', async () => {
    let resolveParse!: (track: Track) => void
    const onImportStart = vi.fn()
    const onTrackLoaded = vi.fn()
    parseTrackFile.mockReturnValue(new Promise<Track>((resolve) => {
      resolveParse = resolve
    }))
    const importedTrack: Track = {
      name: 'Imported track',
      points: [{ lat: 37, lng: 127 }, { lat: 38, lng: 128 }],
    }
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(() => root?.render(createElement(FileUpload, {
      hasTrack: false,
      onTrackLoaded,
      onImportStart,
    })))

    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')
    const file = new File(['track'], 'trip.gpx', { type: 'application/gpx+xml' })
    Object.defineProperty(fileInput, 'files', { configurable: true, value: [file] })
    await act(() => fileInput?.dispatchEvent(new Event('change', { bubbles: true })))

    expect(onImportStart).toHaveBeenCalledOnce()
    expect(parseTrackFile).toHaveBeenCalledOnce()
    expect(onImportStart.mock.invocationCallOrder[0]).toBeLessThan(parseTrackFile.mock.invocationCallOrder[0])

    await act(async () => {
      resolveParse(importedTrack)
      await Promise.resolve()
    })
    expect(onTrackLoaded).toHaveBeenCalledOnce()
    expect(onTrackLoaded).toHaveBeenCalledWith(importedTrack)
  })
})
