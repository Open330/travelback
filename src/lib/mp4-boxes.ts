export interface Mp4Box {
  type: string
  offset: number
  size: number
  headerSize: number
}

function readBoxType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3],
  )
}

export function parseTopLevelMp4Boxes(bytes: Uint8Array): Mp4Box[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const boxes: Mp4Box[] = []
  let offset = 0

  while (offset < bytes.byteLength) {
    const remaining = bytes.byteLength - offset
    if (remaining < 8) {
      throw new Error(`Truncated MP4 box header at byte ${offset}`)
    }

    const size32 = view.getUint32(offset)
    const type = readBoxType(bytes, offset + 4)
    let headerSize = 8
    let size = size32

    if (size32 === 1) {
      if (remaining < 16) {
        throw new Error(`Truncated extended MP4 box header for ${type} at byte ${offset}`)
      }
      const size64 = view.getBigUint64(offset + 8)
      if (size64 > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error(`MP4 box ${type} exceeds the safe integer range`)
      }
      headerSize = 16
      size = Number(size64)
    } else if (size32 === 0) {
      size = remaining
    }

    if (size < headerSize) {
      throw new Error(`Invalid MP4 box size ${size} for ${type} at byte ${offset}`)
    }
    if (size > remaining) {
      throw new Error(`MP4 box ${type} overruns the file at byte ${offset}`)
    }

    boxes.push({ type, offset, size, headerSize })
    offset += size
  }

  return boxes
}
