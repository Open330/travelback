import { describe, expect, it } from 'vitest'
import { parseTopLevelMp4Boxes } from './mp4-boxes'

function writeType(bytes: Uint8Array, offset: number, type: string) {
  for (let index = 0; index < 4; index++) bytes[offset + index] = type.charCodeAt(index)
}

function normalBox(type: string, payloadLength: number): Uint8Array {
  const bytes = new Uint8Array(8 + payloadLength)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, bytes.byteLength)
  writeType(bytes, 4, type)
  return bytes
}

function concatenate(...parts: Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0))
  let offset = 0
  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.byteLength
  }
  return bytes
}

describe('parseTopLevelMp4Boxes', () => {
  it('walks complete normal boxes without skipping payload bytes', () => {
    const bytes = concatenate(normalBox('ftyp', 4), normalBox('moov', 12), normalBox('mdat', 5))

    expect(parseTopLevelMp4Boxes(bytes)).toEqual([
      { type: 'ftyp', offset: 0, size: 12, headerSize: 8 },
      { type: 'moov', offset: 12, size: 20, headerSize: 8 },
      { type: 'mdat', offset: 32, size: 13, headerSize: 8 },
    ])
  })

  it('supports extended-size and EOF-sized boxes', () => {
    const extended = new Uint8Array(20)
    const extendedView = new DataView(extended.buffer)
    extendedView.setUint32(0, 1)
    writeType(extended, 4, 'moov')
    extendedView.setBigUint64(8, 20n)

    const toEnd = new Uint8Array(11)
    writeType(toEnd, 4, 'mdat')

    expect(parseTopLevelMp4Boxes(concatenate(extended, toEnd))).toEqual([
      { type: 'moov', offset: 0, size: 20, headerSize: 16 },
      { type: 'mdat', offset: 20, size: 11, headerSize: 8 },
    ])
  })

  it('rejects truncated, undersized, and overrunning boxes', () => {
    expect(() => parseTopLevelMp4Boxes(new Uint8Array(7))).toThrow('Truncated MP4 box header')

    const undersized = normalBox('free', 0)
    new DataView(undersized.buffer).setUint32(0, 4)
    expect(() => parseTopLevelMp4Boxes(undersized)).toThrow('Invalid MP4 box size')

    const overrun = normalBox('mdat', 0)
    new DataView(overrun.buffer).setUint32(0, 20)
    expect(() => parseTopLevelMp4Boxes(overrun)).toThrow('overruns the file')
  })
})
