// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadVideo } from './videoEncoder'

type WritableMock = Pick<FileSystemWritableFileStream, 'write' | 'close' | 'abort'>

function installPicker(createWritable: () => Promise<WritableMock>) {
  Object.defineProperty(window, 'showSaveFilePicker', {
    configurable: true,
    value: vi.fn().mockResolvedValue({ createWritable }),
  })
}

function createWritableMock(): WritableMock {
  return {
    write: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    abort: vi.fn().mockResolvedValue(undefined),
  }
}

afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(window, 'showSaveFilePicker')
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

describe('downloadVideo picker failures', () => {
  it('retains the completed video when writable creation fails', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const createFailure = new DOMException('permission revoked', 'NotAllowedError')
    installPicker(vi.fn().mockRejectedValue(createFailure))

    const result = await downloadVideo('blob:ready-video', 'Journey.mp4', new Blob(['video']))

    expect(result).toMatchObject({
      saved: false,
      method: 'picker',
      saveError: { code: 'EXPORT_SAVE_FAILED' },
    })
    expect(result.saveError?.cause).toBe(createFailure)
    expect(click).not.toHaveBeenCalled()
  })

  it.each(['write', 'close'] as const)('aborts the writable after a %s failure without starting a fallback download', async (stage) => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const writable = createWritableMock()
    const failure = new Error(`${stage} failed`)
    vi.mocked(writable[stage]).mockRejectedValue(failure)
    installPicker(vi.fn().mockResolvedValue(writable))

    const result = await downloadVideo('blob:ready-video', 'Journey.mp4', new Blob(['video']))

    expect(result).toMatchObject({
      saved: false,
      method: 'picker',
      saveError: { code: 'EXPORT_SAVE_FAILED' },
    })
    expect(result.saveError?.cause).toBe(failure)
    expect(writable.abort).toHaveBeenCalledOnce()
    expect(click).not.toHaveBeenCalled()
  })

  it('leaves a cancelled picker ready for an explicit download retry', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')),
    })

    await expect(
      downloadVideo('blob:ready-video', 'Journey.mp4', new Blob(['video'])),
    ).resolves.toEqual({ saved: false, method: 'picker' })
    expect(click).not.toHaveBeenCalled()
  })

  it('uses the anchor fallback only when picker acquisition fails before a file exists', async () => {
    vi.useFakeTimers()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new DOMException('activation expired', 'NotAllowedError')),
    })

    await expect(
      downloadVideo('blob:ready-video', 'Journey.mp4', new Blob(['video'])),
    ).resolves.toEqual({ saved: false, method: 'fallback' })
    expect(click).toHaveBeenCalledOnce()

    await vi.runAllTimersAsync()
    vi.useRealTimers()
  })
})
