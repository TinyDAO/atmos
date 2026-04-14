import { Fragment, memo, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import type { City } from '../../config/cities'

interface CityWorldMapProps {
  cities: City[]
  selectedCity: City | null
  onSelect: (city: City) => void
}

export const CityWorldMap = memo(function CityWorldMap({ cities, selectedCity, onSelect }: CityWorldMapProps) {
  const points = useMemo(
    () =>
      cities.map((city) => ({
        city,
        position: [city.latitude, city.longitude] as [number, number],
      })),
    [cities]
  )

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/50 dark:border-white/10
        bg-white/35 dark:bg-slate-900/35 backdrop-blur-xl
        shadow-[0_20px_45px_rgba(15,23,42,0.12)] dark:shadow-[0_20px_45px_rgba(0,0,0,0.4)]"
    >
      <div
        className="pointer-events-none absolute inset-0 z-[350]
          bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.42),transparent_45%),radial-gradient(circle_at_85%_85%,rgba(56,189,248,0.2),transparent_40%)]"
        aria-hidden
      />
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={1.5}
        maxZoom={8}
        scrollWheelZoom
        className="city-map-canvas h-[340px] md:h-[420px] w-full bg-[#d9e9ff]/70 dark:bg-[#0b1324]/80"
        worldCopyJump
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        />
        {points.map(({ city, position }) => {
          const active = selectedCity?.id === city.id
          return (
            <Fragment key={`${city.id}-wrapper`}>
              {active && (
                <CircleMarker
                  key={`${city.id}-pulse`}
                  center={position}
                  radius={14}
                  pathOptions={{
                    className: 'city-marker-pulse',
                    color: '#fb923c',
                    weight: 1.5,
                    fillColor: '#fb923c',
                    fillOpacity: 0.12,
                  }}
                />
              )}
              <CircleMarker
                key={city.id}
                center={position}
                radius={active ? 9 : 6}
                pathOptions={{
                  className: active ? 'city-marker city-marker-active' : 'city-marker',
                  color: active ? '#ffffff' : '#e2e8f0',
                  weight: active ? 2.5 : 1.5,
                  fillColor: active ? '#fb923c' : '#22d3ee',
                  fillOpacity: active ? 0.95 : 0.8,
                }}
                eventHandlers={{ click: () => onSelect(city) }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={1} className="city-map-tooltip">
                  <div className="text-[12px] font-medium">
                    {city.name} · {city.country}
                  </div>
                </Tooltip>
              </CircleMarker>
            </Fragment>
          )
        })}
      </MapContainer>
    </div>
  )
})
