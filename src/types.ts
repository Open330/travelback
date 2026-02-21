export interface TrackPoint {
  lng: number
  lat: number
  ele?: number
  time?: Date
}

export interface Track {
  name: string
  points: TrackPoint[]
}

export type MapStyleKey = 'voyager' | 'positron' | 'dark'

export const MAP_STYLES: Record<MapStyleKey, { label: string; url: string }> = {
  voyager: {
    label: 'Voyager',
    url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  },
  positron: {
    label: 'Light',
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  },
  dark: {
    label: 'Dark',
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
}
