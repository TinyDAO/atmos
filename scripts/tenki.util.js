/**
 * tenki.jp 2週間天気（10days.html）ページから先頭4日分の日別予報を取得する。
 * @see https://tenki.jp/
 */

const DAY_LABELS = ['today', 'tomorrow', 'in2Days', 'in3Days']

/** 与 src/config/tenkiUpstreamHeaders.ts 保持同步（避免 Node 直连被 403） */
const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'ja,zh-CN;q=0.9,en-US;q=0.8,en;q=0.7,ja;q=0.6',
  Referer: 'https://tenki.jp/',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Sec-CH-UA': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'Sec-CH-UA-Mobile': '?0',
  'Sec-CH-UA-Platform': '"macOS"',
}

const toNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const decodeBasicEntities = (s) =>
  typeof s === 'string'
    ? s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    : ''

const stripTags = (s) => (typeof s === 'string' ? s.replace(/<[^>]+>/g, '') : '')

const pad2 = (n) => String(n).padStart(2, '0')

/** @returns {{ m: number, d: number } | null} */
const parseMonthDayJa = (daysInnerHtml) => {
  const t = stripTags(daysInnerHtml).trim()
  const m = t.match(/(\d{1,2})月(\d{1,2})日/)
  if (!m) return null
  return { m: Number(m[1]), d: Number(m[2]) }
}

const parseCelsiusFromCell = (html) => {
  const t = decodeBasicEntities(html).replace(/[℃°]/g, '').trim()
  const m = t.match(/-?\d+(?:\.\d+)?/)
  return m ? toNumber(m[0]) : null
}

const parseMmFromCell = (html) => {
  const t = decodeBasicEntities(html).replace(/\s/g, '').replace(/㎜/g, 'mm')
  const m = t.match(/(-?\d+(?:\.\d+)?)\s*mm/i)
  return m ? toNumber(m[1]) : null
}

const extractAnnounceYmd = (html) => {
  const m = html.match(/forecast_announce_datetime"\s*:\s*"(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[3]}`
}

/**
 * @param {string} ymd `YYYY-MM-DD`
 * @param {number} deltaDays
 */
const addCalendarDays = (ymd, deltaDays) => {
  const [y, mo, d] = ymd.split('-').map(Number)
  const u = Date.UTC(y, mo - 1, d + deltaDays)
  const t = new Date(u)
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`
}

const toForecastRow = (label, dateStr, maxC, minC, weather, precipitation) => ({
  label,
  date: dateStr,
  minTemp: minC,
  maxTemp: maxC,
  windDirection: null,
  windSpeed: null,
  weather,
  humidity: null,
  precipitation,
})

const DAY_HEADER_RE =
  /<dd class="forecast10days-actab">\s*<div class="days">([\s\S]*?)<\/div>\s*<div class="forecast">[\s\S]*?<span class="forecast-telop">([^<]*)<\/span>[\s\S]*?<div class="temp"><span class="high-temp">([^<]*)<\/span><span class="low-temp">([^<]*)<\/span><\/div>\s*<div class="prob-precip">([^<]*)<\/div>\s*<div class="precip">([^<]*)<\/div>/g

/**
 * @param {string} html
 * @returns {Array<{ daysHtml: string, weather: string, highHtml: string, lowHtml: string, probText: string, precipHtml: string }>}
 */
const parseTenki10DayHeaders = (html) => {
  const rows = []
  let m
  const re = new RegExp(DAY_HEADER_RE.source, 'g')
  while ((m = re.exec(html)) !== null) {
    rows.push({
      daysHtml: m[1],
      weather: decodeBasicEntities(m[2]).trim(),
      highHtml: m[3],
      lowHtml: m[4],
      probText: stripTags(m[5]).trim(),
      precipHtml: m[6],
    })
  }
  return rows
}

const assertTenkiForecastUrl = (url) => {
  let u
  try {
    u = new URL(url)
  } catch {
    throw new Error('tenki: invalid URL')
  }
  if (!/\.tenki\.jp$/i.test(u.hostname) && u.hostname !== 'tenki.jp') {
    throw new Error('tenki: URL must be on tenki.jp')
  }
  if (!u.pathname.includes('/forecast/')) {
    throw new Error('tenki: URL path must include /forecast/')
  }
}

/**
 * tenki.jp の 10days（2週間）天気ページから、先頭4日分を取得する。
 * 戻り値の形は `ecmwf.util.js` の日別オブジェクトに合わせる。
 *
 * @param {string} url 例: `https://tenki.jp/forecast/3/16/4410/13111/10days.html`
 * @param {RequestInit & { signal?: AbortSignal }} [init]
 * @returns {Promise<{ source: string, forecast: ReturnType<typeof toForecastRow>[] }>}
 */
export async function getTenkiDaily(url, init = {}) {
  assertTenkiForecastUrl(url)

  const res = await fetch(url, {
    ...init,
    headers: { ...DEFAULT_HEADERS, ...init.headers },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`tenki fetch failed: ${res.status} ${res.statusText} ${text.slice(0, 200)}`)
  }

  const html = await res.text()
  const rows = parseTenki10DayHeaders(html)
  if (rows.length < 4) {
    throw new Error(
      'tenki: expected at least 4 daily rows (forecast10days-actab); check that the URL is a 10days / 2-week forecast page',
    )
  }

  const announceYmd = extractAnnounceYmd(html)
  const md0 = parseMonthDayJa(rows[0].daysHtml)
  if (!md0) {
    throw new Error('tenki: could not parse date from first forecast row')
  }

  let row0Ymd
  if (announceYmd) {
    const [ay, am, ad] = announceYmd.split('-').map(Number)
    if (am === md0.m && ad === md0.d) {
      row0Ymd = announceYmd
    } else {
      row0Ymd = `${ay}-${pad2(md0.m)}-${pad2(md0.d)}`
    }
  } else {
    const y = new Date().getUTCFullYear()
    row0Ymd = `${y}-${pad2(md0.m)}-${pad2(md0.d)}`
  }

  const picked = rows.slice(0, 4)
  const forecast = picked.map((row, i) => {
    const dateStr = addCalendarDays(row0Ymd, i)
    const maxC = parseCelsiusFromCell(row.highHtml)
    const minC = parseCelsiusFromCell(row.lowHtml)
    const precipMm = parseMmFromCell(row.precipHtml)
    const label = DAY_LABELS[i] ?? `day${i}`
    return toForecastRow(label, dateStr, maxC, minC, row.weather || null, precipMm)
  })

  return { source: url, forecast }
}

export { DAY_LABELS, parseTenki10DayHeaders, DEFAULT_HEADERS }
