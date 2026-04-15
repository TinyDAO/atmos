const DAY_LABELS = ['today', 'tomorrow', 'dayAfterTomorrow']

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)

const toNumber = (value) => {
  if (isNumber(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const pickNumber = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return null
  for (const key of keys) {
    const value = toNumber(obj[key])
    if (value !== null) return value
  }
  return null
}

const pickString = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return null
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return null
}

const detectDailyArray = (data) => {
  if (!data || typeof data !== 'object') return null

  if (Array.isArray(data.daily)) return data.daily
  if (Array.isArray(data.forecastday)) return data.forecastday
  if (Array.isArray(data.forecasts)) return data.forecasts
  if (Array.isArray(data.days)) return data.days
  if (Array.isArray(data.result?.daily)) return data.result.daily
  if (Array.isArray(data.data?.daily)) return data.data.daily
  if (Array.isArray(data.data?.forecast)) return data.data.forecast
  if (Array.isArray(data.forecast?.forecastday)) return data.forecast.forecastday
  if (Array.isArray(data.weather?.daily)) return data.weather.daily

  return null
}

const parseMojiHtmlForecast = (html) => {
  if (typeof html !== 'string' || !html.includes('tianqi.moji.com')) return null

  const dayKeyToLabel = {
    today: 'today',
    tommorrow: 'tomorrow',
    tdat: 'dayAfterTomorrow',
  }

  const blockRegExp =
    /<a[^>]+href="https?:\/\/tianqi\.moji\.com\/(today|tommorrow|tdat)\/[^"]*"[^>]*>[\s\S]*?<\/a>[\s\S]*?<li>[\s\S]*?<\/span>\s*([^<]+?)\s*<\/li>[\s\S]*?<li>\s*([\-]?\d+)\s*°\s*\/\s*([\-]?\d+)\s*°\s*<\/li>[\s\S]*?<li>[\s\S]*?<em>\s*([^<]+?)\s*<\/em>[\s\S]*?<b>\s*([^<]+?)\s*<\/b>/g

  const resultMap = new Map()
  let match = blockRegExp.exec(html)

  while (match) {
    const [, dayKey, weather, minTempRaw, maxTempRaw, windDirection, windLevel] = match
    const label = dayKeyToLabel[dayKey]

    if (label && !resultMap.has(label)) {
      const windSpeed = toNumber(String(windLevel).replace(/[^\d.-]/g, ''))
      resultMap.set(label, {
        label,
        date: null,
        minTemp: toNumber(minTempRaw),
        maxTemp: toNumber(maxTempRaw),
        windDirection: windDirection?.trim() ?? null,
        windSpeed,
        weather: weather?.trim() ?? null,
        humidity: null,
        precipitation: null,
      })
    }

    match = blockRegExp.exec(html)
  }

  const forecast = DAY_LABELS.map((label) => resultMap.get(label)).filter(Boolean)
  return forecast.length === 3 ? forecast : null
}

const normalizeDay = (day, fallbackDate) => {
  const dayNode = day?.day && typeof day.day === 'object' ? day.day : day

  return {
    date:
      pickString(dayNode, ['date', 'fxDate', 'datetime', 'valid_date']) ??
      pickString(day, ['date', 'fxDate', 'datetime', 'valid_date']) ??
      fallbackDate,
    minTemp: pickNumber(dayNode, [
      'minTemp',
      'mintemp_c',
      'min_temp',
      'tempMin',
      'min',
      'low',
      'temperature_2m_min',
      'night_temp',
    ]),
    maxTemp: pickNumber(dayNode, [
      'maxTemp',
      'maxtemp_c',
      'max_temp',
      'tempMax',
      'max',
      'high',
      'temperature_2m_max',
      'day_temp',
    ]),
    windDirection:
      pickString(dayNode, ['wind_dir', 'windDirection', 'wind_direction', 'windDir']) ??
      pickString(dayNode, ['wd', 'wind_text']) ??
      null,
    windSpeed: pickNumber(dayNode, [
      'windSpeed',
      'wind_kph',
      'maxwind_kph',
      'wind_speed',
      'windSpeedMax',
      'wind_speed_10m_max',
    ]),
    weather:
      pickString(dayNode, ['weather', 'text', 'condition', 'description']) ??
      pickString(dayNode?.condition, ['text']) ??
      null,
    humidity: pickNumber(dayNode, ['humidity', 'avghumidity']),
    precipitation: pickNumber(dayNode, [
      'precipitation',
      'precip_mm',
      'totalprecip_mm',
      'rain_sum',
      'precip',
    ]),
  }
}

export const getWeather = async (url) => {
  if (!url || typeof url !== 'string') {
    throw new Error('url is required and must be a string')
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch weather: ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('text/html')) {
    const html = await response.text()
    const htmlForecast = parseMojiHtmlForecast(html)
    if (!htmlForecast) {
      throw new Error('Unable to parse 3-day forecast from HTML weather page')
    }
    return {
      source: url,
      forecast: htmlForecast,
    }
  }

  let payload
  try {
    payload = await response.json()
  } catch (error) {
    throw new Error('Weather URL must return JSON or parsable HTML data')
  }

  const dailyArray = detectDailyArray(payload)
  if (!dailyArray || dailyArray.length < 3) {
    throw new Error('Unable to find at least 3 days of forecast data in response')
  }

  const forecast = DAY_LABELS.map((label, index) => {
    const day = dailyArray[index] ?? {}
    return {
      label,
      ...normalizeDay(day, null),
    }
  })

  return {
    source: url,
    forecast,
  }
}
