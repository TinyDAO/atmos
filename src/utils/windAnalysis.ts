/**
 * Wind analysis: direction origin, seasonal characteristics, weather impact, VFR turbulence
 */

import type { Lang } from '../hooks/useLanguage'
import { getWindAnalysisStrings } from '../i18n/windAnalysis'

const DIR_NAMES = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'] as const

export interface WindAnalysisInput {
  dirDeg: number | null
  variable: boolean
  speedKt: number | null
  gustKt: number | null
  timezone: string
  latitude: number
  /** Optional: local hour 0-23 for thermal turbulence */
  localHour?: number
  /** Language for translated output */
  lang?: Lang
}

export interface WindAnalysis {
  directionName: string
  origin: string
  characteristics: string[]
  weatherImpact: string
  turbulenceWarnings: string[]
  labels: { origin: string; characteristics: string; weatherImpact: string; vfrTurbulence: string }
}

function degToDir(deg: number): string {
  const i = Math.round(deg / 22.5) % 16
  return DIR_NAMES[i]
}

function getSeason(month: number, lat: number): 'winter' | 'spring' | 'summer' | 'autumn' {
  const hemisphere = lat >= 0 ? 'n' : 's'
  if (hemisphere === 'n') {
    if (month >= 12 || month <= 2) return 'winter'
    if (month >= 3 && month <= 5) return 'spring'
    if (month >= 6 && month <= 8) return 'summer'
    return 'autumn'
  }
  if (month >= 6 && month <= 8) return 'winter'
  if (month >= 9 && month <= 11) return 'spring'
  if (month >= 12 || month <= 2) return 'summer'
  return 'autumn'
}

function getLocalHour(timezone: string): number {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, hour: 'numeric', hour12: false })
  return parseInt(fmt.format(now), 10)
}

export function analyzeWind(input: WindAnalysisInput): WindAnalysis | null {
  const { dirDeg, variable, speedKt, gustKt, timezone, latitude, localHour, lang = 'en' } = input
  const s = getWindAnalysisStrings(lang)
  const speed = speedKt ?? 0
  const gust = gustKt ?? speed

  if (variable && speed === 0) return null
  const dir = variable ? null : dirDeg
  const dirKey = dir != null ? degToDir(dir) : null
  const directionName = variable ? s.variable : (dirKey ?? s.unknown)
  const origin = variable ? s.variable : (dirKey ? (s.dirOrigins[dirKey] ?? '') : '')

  const now = new Date()
  const month = now.getMonth()
  const hour = localHour ?? getLocalHour(timezone)
  const season = getSeason(month, latitude)

  const characteristics: string[] = []
  let weatherImpact = ''

  if (!variable && dir != null) {
    if (season === 'summer' && (dir >= 45 && dir <= 135) && Math.abs(latitude) < 50) {
      characteristics.push(s.characteristics.seaBreeze)
    }
    if (season === 'winter' && (dir >= 315 || dir <= 45) && latitude > 20) {
      characteristics.push(s.characteristics.coldNortherly)
    }
    if (season === 'winter' && (dir >= 135 && dir <= 225) && latitude > 20) {
      characteristics.push(s.characteristics.milderSoutherly)
    }
    if (season === 'summer' && (dir >= 225 && dir <= 315) && latitude > 20) {
      characteristics.push(s.characteristics.westerlyFlow)
    }
    if (dir >= 337.5 || dir <= 22.5) {
      weatherImpact = s.weatherImpact.northerly
    } else if (dir >= 157.5 && dir <= 202.5) {
      weatherImpact = s.weatherImpact.southerly
    }
  } else if (variable) {
    characteristics.push(s.characteristics.lightVariable)
  }

  const turbulenceWarnings: string[] = []

  if (speed >= 25) {
    turbulenceWarnings.push(s.turbulence.moderateSevere)
  } else if (speed >= 15 || gust >= speed + 10) {
    turbulenceWarnings.push(s.turbulence.moderatePossible)
  } else if (speed >= 10 || (gust > speed && gust >= 15)) {
    turbulenceWarnings.push(s.turbulence.lightPossible)
  }

  if (gust > speed + 10 && speed >= 15) {
    turbulenceWarnings.push(s.turbulence.gustyConditions)
  }

  if (hour >= 10 && hour <= 16 && speed >= 8) {
    turbulenceWarnings.push(s.turbulence.afternoonThermal)
  }

  if (variable && speed >= 10) {
    turbulenceWarnings.push(s.turbulence.variableWindShear)
  }

  if (speed >= 20) {
    turbulenceWarnings.push(s.turbulence.strongSurfaceWind)
  }

  return {
    directionName,
    origin,
    characteristics: characteristics.length ? characteristics : [s.characteristics.noPattern],
    weatherImpact,
    turbulenceWarnings,
    labels: s.labels,
  }
}
