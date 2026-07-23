import {
  ALL_FORMATS,
  BufferSource,
  EncodedPacketSink,
  Input,
} from 'mediabunny'
export { parseTopLevelMp4Boxes } from '../src/lib/mp4-boxes'

export interface Mp4VideoInspection {
  codec: string | null
  codedWidth: number
  codedHeight: number
  duration: number
  packetCount: number
}


export async function inspectMp4Video(bytes: Uint8Array): Promise<Mp4VideoInspection> {
  const ownedBytes = Uint8Array.from(bytes)
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BufferSource(ownedBytes),
  })

  try {
    if (!await input.canRead()) throw new Error('Mediabunny could not read the exported MP4')

    const videoTracks = await input.getVideoTracks()
    if (videoTracks.length !== 1) {
      throw new Error(`Expected one MP4 video track, found ${videoTracks.length}`)
    }

    const [track] = videoTracks
    const sink = new EncodedPacketSink(track)
    let packetCount = 0
    let packet = await sink.getFirstPacket()
    while (packet) {
      packetCount++
      packet = await sink.getNextPacket(packet)
    }

    return {
      codec: await track.getCodec(),
      codedWidth: await track.getCodedWidth(),
      codedHeight: await track.getCodedHeight(),
      duration: await input.computeDuration([track]),
      packetCount,
    }
  } finally {
    input.dispose()
  }
}
