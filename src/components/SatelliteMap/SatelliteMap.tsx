import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchRainViewerMaps } from '../../services/rainViewer'

interface SatelliteMapProps {
  lat: number
  lon: number
  cityName?: string
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function RadarOverlay({ urlTemplate }: { urlTemplate: string }) {
  const map = useMap()

  useEffect(() => {
    if (!urlTemplate) return
    const newLayer = L.tileLayer(urlTemplate, {
      opacity: 0.7,
      maxZoom: 7,
      minZoom: 2,
    })
    newLayer.addTo(map)
    return () => {
      newLayer.remove()
    }
  }, [map, urlTemplate])

  return null
}

function SatelliteCloudOverlay({ date }: { date: string }) {
  const map = useMap()

  useEffect(() => {
    const template = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`
    const layer = L.tileLayer(template, {
      opacity: 0.85,
      maxZoom: 9,
      minZoom: 2,
    })
    layer.addTo(map)
    return () => {
      layer.remove()
    }
  }, [map, date])

  return null
}

export function SatelliteMap({ lat, lon }: SatelliteMapProps) {
  const [radarUrl, setRadarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [layerMode, setLayerMode] = useState<'radar' | 'satellite' | 'both'>('both')
  const date = getTodayDate()

  useEffect(() => {
    fetchRainViewerMaps()
      .then((data) => {
        const frames = data.radar?.past ?? []
        const latest = frames[frames.length - 1]
        if (latest && data.host) {
          const template = `${data.host}${latest.path}/512/{z}/{x}/{y}/2/1_1.png`
          setRadarUrl(template)
        }
      })
      .catch(() => setRadarUrl(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="rounded-2xl overflow-hidden border border-zinc-300/50 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-900">
      <div className="px-4 py-3 border-b border-zinc-300/50 dark:border-zinc-700/50 flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
          Radar & Satellite
        </h3>
        <div className="flex gap-1">
          {(['both', 'radar', 'satellite'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setLayerMode(m)}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                layerMode === m
                  ? 'bg-zinc-600 dark:bg-zinc-600 text-white'
                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600'
              }`}
            >
              {m === 'both' ? 'Both' : m === 'radar' ? 'Radar' : 'Cloud'}
            </button>
          ))}
        </div>
        {loading && (
          <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>
      <div className="h-[280px] md:h-[360px] relative">
        <MapContainer
          center={[lat, lon]}
          zoom={5}
          className="h-full w-full z-0"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {(layerMode === 'both' || layerMode === 'satellite') && (
            <SatelliteCloudOverlay date={date} />
          )}
          {(layerMode === 'both' || layerMode === 'radar') && radarUrl && (
            <RadarOverlay urlTemplate={radarUrl} />
          )}
        </MapContainer>
      </div>
      <div className="px-4 py-2 text-xs text-zinc-600 dark:text-zinc-500 border-t border-zinc-300/50 dark:border-zinc-700/50 space-y-0.5">
        <p>
          Radar: <a href="https://www.rainviewer.com/" target="_blank" rel="noopener noreferrer" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white underline">RainViewer</a>
          {' · '}
          Satellite: <a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener noreferrer" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white underline">NASA GIBS</a>
        </p>
      </div>
    </div>
  )
}
