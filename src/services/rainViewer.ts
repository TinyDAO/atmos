export interface RainViewerFrame {
  time: number
  path: string
}

export interface RainViewerResponse {
  version: string
  generated: number
  host: string
  radar: {
    past: RainViewerFrame[]
    nowcast: RainViewerFrame[]
  }
  satellite?: {
    infrared: RainViewerFrame[]
  }
}

export async function fetchRainViewerMaps(): Promise<RainViewerResponse> {
  const res = await fetch('https://api.rainviewer.com/public/weather-maps.json')
  if (!res.ok) throw new Error('Failed to fetch RainViewer maps')
  return res.json()
}

export function getRadarTileUrl(
  host: string,
  path: string,
  z: number,
  x: number,
  y: number,
  color = 2,
  smooth = 1,
  snow = 1
): string {
  return `${host}${path}/512/${z}/${x}/${y}/${color}/${smooth}_${snow}.png`
}
