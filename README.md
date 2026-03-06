# Weather Forecast

A modern weather forecast site built with Vite + React + TypeScript. Features multi-source weather data, radar/satellite maps, and aviation weather.

## Features

- **6 preset cities**: Sao Paulo, NYC, Seoul, Atlanta, Toronto, London
- **Daily high temperature** from Open-Meteo (with optional multi-source: WeatherAPI, OpenWeatherMap)
- **Wind, precipitation, cloud cover, cloud base** (wind from Open-Meteo, cloud base from METAR)
- **Radar & satellite cloud map** – RainViewer radar + NASA GIBS satellite imagery
- **Aviation weather** (METAR/TAF) from Aviation Weather Center
- **Light/dark theme** toggle
- Modern, minimal design (no Ant Design)

## Tech Stack

- Vite 7 + React 19 + TypeScript
- Tailwind CSS v4
- Framer Motion
- Leaflet + react-leaflet

## Development

```bash
npm install
npm run dev
```

The dev server proxies aviation weather API requests to avoid CORS. For production, aviation weather may require a backend proxy if CORS blocks direct requests.

## Build

```bash
npm run build
npm run preview
```

## Data Sources

- [Open-Meteo](https://open-meteo.com/) – Weather forecast, wind, precipitation, cloud (no API key)
- [RainViewer](https://www.rainviewer.com/) – Radar (no API key)
- [NASA GIBS](https://earthdata.nasa.gov/gibs) – Satellite cloud imagery (no API key)
- [Aviation Weather Center](https://aviationweather.gov/) – METAR/TAF, cloud base
- [WeatherAPI.com](https://www.weatherapi.com/) – Optional multi-source (free tier, needs key)
- [OpenWeatherMap](https://openweathermap.org/) – Optional multi-source (free tier, needs key)
