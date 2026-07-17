// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Track } from '@/types'
import { ParseError } from '@/lib/parser'

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

  it.each(['picker', 'drop'] as const)('announces an accepted %s intent before parsing starts', async (source) => {
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

    const file = new File(['track'], 'trip.gpx', { type: 'application/gpx+xml' })
    if (source === 'picker') {
      const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')
      Object.defineProperty(fileInput, 'files', { configurable: true, value: [file] })
      await act(() => fileInput?.dispatchEvent(new Event('change', { bubbles: true })))
    } else {
      const dropZone = container.querySelector<HTMLElement>('[role="group"]')
      const drop = new Event('drop', { bubbles: true, cancelable: true })
      Object.defineProperty(drop, 'dataTransfer', { value: { files: [file] } })
      await act(() => dropZone?.dispatchEvent(drop))
    }

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

  it.each(['picker', 'drop'] as const)('announces a rejected %s intent without invoking the parser', async (source) => {
    const onImportStart = vi.fn()
    const onTrackLoaded = vi.fn()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(() => root?.render(createElement(FileUpload, {
      hasTrack: false,
      onTrackLoaded,
      onImportStart,
    })))

    const file = new File(['not a route'], 'notes.txt', { type: 'text/plain' })
    if (source === 'picker') {
      const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')
      Object.defineProperty(fileInput, 'files', { configurable: true, value: [file] })
      await act(() => fileInput?.dispatchEvent(new Event('change', { bubbles: true })))
    } else {
      const dropZone = container.querySelector<HTMLElement>('[role="group"]')
      const drop = new Event('drop', { bubbles: true, cancelable: true })
      Object.defineProperty(drop, 'dataTransfer', { value: { files: [file] } })
      await act(() => dropZone?.dispatchEvent(drop))
    }

    expect(onImportStart).toHaveBeenCalledOnce()
    expect(parseTrackFile).not.toHaveBeenCalled()
    expect(onTrackLoaded).not.toHaveBeenCalled()
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('lets a newer drop abort and replace an in-flight parse', async () => {
    let resolveFirst!: (track: Track) => void
    let resolveSecond!: (track: Track) => void
    const signals: AbortSignal[] = []
    const onImportStart = vi.fn()
    const onTrackLoaded = vi.fn()
    parseTrackFile.mockImplementation((file: File, options: { signal: AbortSignal }) => {
      signals.push(options.signal)
      return new Promise<Track>((resolve) => {
        if (file.name === 'first.gpx') resolveFirst = resolve
        else resolveSecond = resolve
      })
    })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(() => root?.render(createElement(FileUpload, {
      hasTrack: false,
      onTrackLoaded,
      onImportStart,
    })))

    const dropZone = container.querySelector<HTMLElement>('[role="group"]')
    const dropFile = async (file: File) => {
      const drop = new Event('drop', { bubbles: true, cancelable: true })
      Object.defineProperty(drop, 'dataTransfer', { value: { files: [file] } })
      await act(async () => {
        dropZone?.dispatchEvent(drop)
        await Promise.resolve()
      })
    }

    await dropFile(new File(['first'], 'first.gpx', { type: 'application/gpx+xml' }))
    await dropFile(new File(['second'], 'second.gpx', { type: 'application/gpx+xml' }))

    expect(onImportStart).toHaveBeenCalledTimes(2)
    expect(parseTrackFile).toHaveBeenCalledTimes(2)
    expect(signals).toHaveLength(2)
    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)

    await act(async () => {
      resolveFirst({
        name: 'Stale first import',
        points: [{ lat: 37, lng: 127 }, { lat: 38, lng: 128 }],
      })
      await Promise.resolve()
    })
    expect(onTrackLoaded).not.toHaveBeenCalled()
    expect(container.querySelector('.animate-spin')).not.toBeNull()

    const secondTrack: Track = {
      name: 'Current second import',
      points: [{ lat: 39, lng: 129 }, { lat: 40, lng: 130 }],
    }
    await act(async () => {
      resolveSecond(secondTrack)
      await Promise.resolve()
    })
    expect(onTrackLoaded).toHaveBeenCalledOnce()
    expect(onTrackLoaded).toHaveBeenCalledWith(secondTrack)
    expect(container.querySelector('.animate-spin')).toBeNull()
  })

  it('warns only for accepted files near their format-specific limit', async () => {
    const importedTrack: Track = {
      name: 'Imported track',
      points: [{ lat: 37, lng: 127 }, { lat: 38, lng: 128 }],
    }
    parseTrackFile.mockResolvedValue(importedTrack)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(() => root?.render(createElement(FileUpload, {
      hasTrack: false,
      onTrackLoaded: vi.fn(),
    })))

    const dropZone = container.querySelector<HTMLElement>('[role="group"]')
    const dropFile = async (file: File) => {
      const drop = new Event('drop', { bubbles: true, cancelable: true })
      Object.defineProperty(drop, 'dataTransfer', { value: { files: [file] } })
      await act(async () => {
        dropZone?.dispatchEvent(drop)
        await Promise.resolve()
      })
    }

    const nearXmlLimit = new File(['x'], 'near-limit.gpx', { type: 'application/gpx+xml' })
    Object.defineProperty(nearXmlLimit, 'size', { value: 3 * 1024 * 1024 })
    await dropFile(nearXmlLimit)
    expect(warn).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('3 MB'))

    const rejectedXml = new File(['x'], 'too-large.gpx', { type: 'application/gpx+xml' })
    Object.defineProperty(rejectedXml, 'size', { value: 4 * 1024 * 1024 + 1 })
    await dropFile(rejectedXml)
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  it('clears its rejected-file alert when Sample becomes the current intent', async () => {
    parseTrackFile.mockRejectedValue(new ParseError('Unsupported test file', 'UNSUPPORTED_FORMAT'))
    const onLoadSample = vi.fn()
    const onTrackLoaded = vi.fn()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    const render = async (hasTrack: boolean) => {
      await act(() => root?.render(createElement(FileUpload, {
        hasTrack,
        onTrackLoaded,
        onLoadSample,
      })))
    }
    await render(false)

    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')
    const rejectedFile = new File(['not a route'], 'notes.txt', { type: 'text/plain' })
    Object.defineProperty(fileInput, 'files', { configurable: true, value: [rejectedFile] })
    await act(async () => {
      fileInput?.dispatchEvent(new Event('change', { bubbles: true }))
      await Promise.resolve()
    })
    await vi.waitFor(() => expect(container?.querySelector('[role="alert"]')).not.toBeNull())

    const sampleButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Try with a sample trip'))
    await act(() => sampleButton?.click())
    expect(onLoadSample).toHaveBeenCalledOnce()

    await render(true)
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('aborts a held child parse and exits loading before starting Sample', async () => {
    let resolveParse!: (track: Track) => void
    const parseSignalRef: { current: AbortSignal | null } = { current: null }
    const onLoadSample = vi.fn()
    const onTrackLoaded = vi.fn()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(() => root?.render(createElement(FileUpload, {
      hasTrack: false,
      onTrackLoaded,
      onLoadSample,
    })))
    const sampleButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Try with a sample trip'))
    if (!sampleButton) throw new Error('Missing Sample button')

    parseTrackFile.mockImplementation((_file, options: { signal: AbortSignal }) => {
      parseSignalRef.current = options.signal
      sampleButton.click()
      return new Promise<Track>((resolve) => {
        resolveParse = resolve
      })
    })
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')
    const heldFile = new File(['pending'], 'trip.gpx', { type: 'application/gpx+xml' })
    Object.defineProperty(fileInput, 'files', { configurable: true, value: [heldFile] })
    await act(async () => {
      fileInput?.dispatchEvent(new Event('change', { bubbles: true }))
      await Promise.resolve()
    })

    expect(parseSignalRef.current?.aborted).toBe(true)
    expect(onLoadSample).toHaveBeenCalledOnce()
    expect(container.querySelector('.animate-spin')).toBeNull()
    expect(container.contains(sampleButton)).toBe(true)
    expect(container.querySelector('[role="alert"]')).toBeNull()

    await act(async () => {
      resolveParse({
        name: 'Stale import',
        points: [{ lat: 37, lng: 127 }, { lat: 38, lng: 128 }],
      })
      await Promise.resolve()
    })
    expect(onTrackLoaded).not.toHaveBeenCalled()
  })
})
