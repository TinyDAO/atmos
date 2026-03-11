/**
 * Decode METAR/TAF aviation codes to plain language (白话)
 */

const CLOUD_COVER: Record<string, string> = {
  SKC: '晴空',
  FEW: '少云 (1-2成)',
  SCT: '疏云 (3-4成)',
  BKN: '多云 (5-7成)',
  OVC: '阴天 (8成)',
}

const WEATHER_CODES: Record<string, string> = {
  // Intensity
  '-': '轻',
  '+': '强',
  VC: '附近',
  // Descriptors
  MI: '浅',
  BC: '碎片状',
  BL: '吹',
  SH: '阵性',
  TS: '雷暴',
  FZ: '冻',
  PR: '部分',
  DR: '低吹',
  // Precipitation
  DZ: '毛毛雨',
  RA: '雨',
  SN: '雪',
  SG: '米雪',
  IC: '冰晶',
  PL: '冰粒',
  GR: '冰雹',
  GS: '小冰雹',
  UP: '未知降水',
  // Obscuration
  BR: '轻雾',
  FG: '雾',
  FU: '烟',
  VA: '火山灰',
  DU: '尘',
  SA: '沙',
  HZ: '霾',
  PY: '喷雾',
}

function decodeCloudLayer(match: string): string {
  const coverCode = match.slice(0, 3)
  const cover = CLOUD_COVER[coverCode] ?? coverCode
  const heightMatch = match.slice(3).match(/^(\d{3})/)
  if (!heightMatch) return cover
  const ft = parseInt(heightMatch[1], 10) * 100
  const m = Math.round(ft * 0.3048)
  const suffix = match.includes('CB') ? ' (积雨云)' : match.includes('TCU') ? ' (塔状积云)' : ''
  return `${cover}，云底高 ${ft} 英尺 (约 ${m} 米)${suffix}`
}

function decodeWind(match: string): string {
  if (match.startsWith('VRB')) {
    const speedMatch = match.match(/VRB(\d+)(?:G(\d+))?KT/)
    const speed = speedMatch?.[1] ?? match.match(/\d+/)?.[0] ?? '?'
    const gust = speedMatch?.[2]
    return gust
      ? `风向不定，风速 ${speed} 节，阵风 ${gust} 节`
      : `风向不定，风速 ${speed} 节`
  }
  const dir = match.slice(0, 3)
  const dirDeg = parseInt(dir, 10)
  if (isNaN(dirDeg)) return match
  const dirNames = ['北', '东北偏北', '东北', '东北偏东', '东', '东南偏东', '东南', '东南偏南', '南', '西南偏南', '西南', '西南偏西', '西', '西北偏西', '西北', '西北偏北']
  const dirName = dirNames[Math.round(dirDeg / 22.5) % 16]
  const speedPart = match.slice(3)
  const gustMatch = speedPart.match(/^(\d+)G(\d+)KT/)
  if (gustMatch) {
    return `风向 ${dirName} (${dirDeg}°)，风速 ${gustMatch[1]} 节，阵风 ${gustMatch[2]} 节`
  }
  const speedMatch = speedPart.match(/^(\d+)KT/)
  if (speedMatch) {
    return `风向 ${dirName} (${dirDeg}°)，风速 ${speedMatch[1]} 节`
  }
  return match
}

function decodeVisibility(match: string): string {
  if (match.endsWith('SM')) {
    const mi = parseFloat(match.replace('SM', ''))
    if (!isNaN(mi)) return `能见度 ${mi} 英里 (约 ${(mi * 1.609).toFixed(1)} 公里)`
  }
  if (match === '9999' || match === '9999M') {
    return '能见度 10 公里以上'
  }
  if (match === '0000') {
    return '能见度不足 50 米'
  }
  if (/^\d{4}$/.test(match)) {
    const m = parseInt(match, 10)
    return `能见度 ${m} 米`
  }
  if (match.startsWith('P')) {
    const mi = parseFloat(match.slice(1).replace('SM', ''))
    if (!isNaN(mi)) return `能见度大于 ${mi} 英里`
  }
  return match
}

function decodeWeatherPhenomenon(code: string): string {
  const parts: string[] = []
  let i = 0
  if (code[i] === '-' || code[i] === '+') {
    parts.push(WEATHER_CODES[code[i]] ?? '')
    i++
  }
  while (i < code.length) {
    const two = code.slice(i, i + 2)
    const one = code[i]
    if (WEATHER_CODES[two]) {
      parts.push(WEATHER_CODES[two])
      i += 2
    } else if (WEATHER_CODES[one]) {
      parts.push(WEATHER_CODES[one])
      i += 1
    } else {
      i++
    }
  }
  return parts.filter(Boolean).join('') || code
}

function decodeTempDewpoint(match: string): string {
  const [temp, dew] = match.split('/')
  const t = parseInt(temp, 10)
  const d = dew ? parseInt(dew, 10) : null
  let s = `气温 ${t}°C`
  if (d !== null && !isNaN(d)) s += `，露点 ${d}°C`
  return s
}

function decodePressure(match: string): string {
  if (match.startsWith('Q')) {
    const hpa = parseInt(match.slice(1), 10)
    return `气压 ${hpa} hPa`
  }
  if (match.startsWith('A')) {
    const inHg = parseInt(match.slice(1), 10) / 100
    return `气压 ${inHg.toFixed(2)} inHg (约 ${Math.round(inHg * 33.86)} hPa)`
  }
  return match
}

/** Get report/validity date from METAR/TAF for TX/TN 4-digit time context */
function getReportDateFromText(text: string): Date {
  const tsMatch = text.match(/\b(\d{2})(\d{2})(\d{2})Z\b/)
  const validityMatch = text.match(/\b(\d{2})(\d{2})\/(\d{2})(\d{2})\b/)
  const now = new Date()
  if (validityMatch) {
    const day = parseInt(validityMatch[1], 10)
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 0, 0, 0))
  }
  if (tsMatch) {
    const day = parseInt(tsMatch[1], 10)
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 0, 0, 0))
  }
  return now
}

export function decodeMetarToPlain(metar: string, timezone?: string, referenceDate?: Date): string {
  if (!metar || metar.includes('No METAR')) return metar

  const lines: string[] = []
  // Strip PROB30/PROB40 etc. — already explained as 【30% 概率】 in TAF, don't show raw code
  let remaining = metar.replace(/\bPROB\d{2}\s*(?:\d{4}\/\d{4})?\s*/gi, '').trim()
  const reportDate = referenceDate ?? getReportDateFromText(metar)

  // CAVOK: Ceiling And Visibility OK (能见度≥10km，无云，无重要天气)
  if (/\bCAVOK\b/.test(remaining)) {
    lines.push('• 能见度良好，无云，无重要天气 (CAVOK)')
    remaining = remaining.replace(/\bCAVOK\b/, '')
  }

  // Wind: 22015KT, 22015G25KT, VRB05KT, VRB5G15KT
  const windMatch = remaining.match(/\b(\d{5}(?:G\d{2})?KT|VRB\d{1,3}(?:G\d{2})?KT)\b/)
  if (windMatch) {
    lines.push('• ' + decodeWind(windMatch[1]))
    remaining = remaining.replace(windMatch[0], '')
  }

  // Visibility: 10SM, 9999, P6SM
  const visMatch = remaining.match(/\b(\d{4}(?:M)?|(?:\d+)?(?:\s?\d\/\d)?SM|P\d+SM)\b/)
  if (visMatch) {
    lines.push('• ' + decodeVisibility(visMatch[1].replace(/\s/g, '')))
    remaining = remaining.replace(visMatch[0], '')
  }

  // Clouds: FEW020, SCT035, BKN060CB, OVC080
  const cloudRegex = /\b(FEW|SCT|BKN|OVC|SKC)(\d{3})?(CB|TCU)?\b/g
  const clouds: string[] = []
  let cm
  while ((cm = cloudRegex.exec(remaining)) !== null) {
    clouds.push(decodeCloudLayer(cm[0]))
  }
  if (clouds.length) {
    lines.push('• 云: ' + clouds.join('；'))
  }

  // Weather phenomena: -RA, TSRA, BR, FG
  const wxRegex = /\b([+-]?(?:VC)?(?:MI|BC|BL|SH|TS|FZ|PR|DR)?(?:DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PY)+)\b/g
  const wx: string[] = []
  let wm
  while ((wm = wxRegex.exec(remaining)) !== null) {
    wx.push(decodeWeatherPhenomenon(wm[1]))
  }
  if (wx.length) {
    lines.push('• 天气: ' + wx.join('，'))
  }

  // Temp/Dewpoint: 18/16, M05/M07
  const tempMatch = remaining.match(/\b(M?\d{2})\/(M?\d{2})\b/)
  if (tempMatch) {
    const t = tempMatch[1].startsWith('M') ? -parseInt(tempMatch[1].slice(1), 10) : parseInt(tempMatch[1], 10)
    const d = tempMatch[2].startsWith('M') ? -parseInt(tempMatch[2].slice(1), 10) : parseInt(tempMatch[2], 10)
    lines.push('• ' + decodeTempDewpoint(`${t}/${d}`))
    remaining = remaining.replace(tempMatch[0], '')
  }

  // Pressure: Q1013, A2992
  const pressureMatch = remaining.match(/\b(Q\d{4}|A\d{4})\b/)
  if (pressureMatch) {
    lines.push('• ' + decodePressure(pressureMatch[1]))
  }

  // Remarks: TX18/0615Z (max temp), TN12/0420Z (min temp)
  // Time format: 4 digits DDHH (day, hour UTC), or 6 digits DDHHMM (day, hour, minute UTC)
  // e.g. TX18/0615Z = max 18°C at 15:00 UTC on day 06 (afternoon)
  // e.g. TN10/0706Z = min 10°C at 06:00 UTC on day 07 (early morning)
  function formatTxTnTime(raw: string): string {
    let utcDate: Date
    if (raw.length === 4) {
      const d = parseInt(raw.slice(0, 2), 10)
      const h = parseInt(raw.slice(2, 4), 10)
      utcDate = new Date(Date.UTC(reportDate.getUTCFullYear(), reportDate.getUTCMonth(), d, h, 0, 0))
    } else if (raw.length === 6) {
      const d = parseInt(raw.slice(0, 2), 10)
      const h = parseInt(raw.slice(2, 4), 10)
      const m = parseInt(raw.slice(4), 10)
      utcDate = new Date(Date.UTC(reportDate.getUTCFullYear(), reportDate.getUTCMonth(), d, h, m, 0))
    } else {
      return raw + 'Z'
    }
    if (timezone) {
      const utcStr = `${utcDate.getUTCDate()}日 ${String(utcDate.getUTCHours()).padStart(2, '0')}:${String(utcDate.getUTCMinutes()).padStart(2, '0')} UTC`
      const localTimeFmt = new Intl.DateTimeFormat('zh-CN', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false })
      const localTime = localTimeFmt.format(utcDate)
      return `${utcStr}（当地  ${localTime}）`
    }
    const h = utcDate.getUTCHours()
    const m = utcDate.getUTCMinutes()
    const d = utcDate.getUTCDate()
    return raw.length === 4
      ? `${d}日 ${String(h).padStart(2, '0')}:00 UTC`
      : `${d}日 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} UTC`
  }
  const txMatch = remaining.match(/\bTX(M?\d{2})\/(\d{4,6})Z\b/)
  if (txMatch) {
    const t = txMatch[1].startsWith('M') ? -parseInt(txMatch[1].slice(1), 10) : parseInt(txMatch[1], 10)
    const timeStr = formatTxTnTime(txMatch[2])
    lines.push(`• 今日最高温 ${t}°C，出现时间 ${timeStr}`)
  }
  const tnMatch = remaining.match(/\bTN(M?\d{2})\/(\d{4,6})Z\b/)
  if (tnMatch) {
    const t = tnMatch[1].startsWith('M') ? -parseInt(tnMatch[1].slice(1), 10) : parseInt(tnMatch[1], 10)
    const timeStr = formatTxTnTime(tnMatch[2])
    lines.push(`• 今日最低温 ${t}°C，出现时间 ${timeStr}`)
  }

  return lines.length ? lines.join('\n') : remaining
}

/**
 * Extract day (DD) from TAF time group. FM011700 -> 01, BECMG 0120/0122 -> 01
 */
function getTafGroupDay(part: string): string | null {
  const fmMatch = part.match(/^FM(\d{2})\d{2}/i)
  if (fmMatch) return fmMatch[1]
  const becmgMatch = part.match(/^BECMG\s+(\d{2})\d{2}/i)
  if (becmgMatch) return becmgMatch[1]
  const tempoMatch = part.match(/^TEMPO\s+(\d{2})\d{2}/i)
  if (tempoMatch) return tempoMatch[1]
  const probMatch = part.match(/^PROB\d{2}\s+(\d{2})\d{2}/i)
  if (probMatch) return probMatch[1]
  return null
}

/**
 * Filter TAF to show only forecast groups for tomorrow (UTC)
 */
export function filterTafForTomorrow(taf: string): string {
  if (!taf || taf.includes('No TAF')) return taf

  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const tomorrowDay = tomorrow.getUTCDate().toString().padStart(2, '0')

  const parts = taf.split(/\s+(?=FM|BECMG|TEMPO|PROB\d{2})/i)
  const header = parts[0]?.trim() ?? ''
  const filtered: string[] = [header]

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim()
    if (!part) continue
    const day = getTafGroupDay(part)
    if (day === tomorrowDay) {
      filtered.push(part)
    }
  }

  return filtered.length > 1 ? filtered.join(' ') : taf
}

function formatValidityLocal(startUtc: Date, endUtc: Date, timezone: string): string {
  const fmt = new Intl.DateTimeFormat('zh-CN', { timeZone: timezone, day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
  const getDay = (date: Date) => fmt.formatToParts(date).find(p => p.type === 'day')?.value ?? ''
  const getTime = (date: Date) => {
    const parts = fmt.formatToParts(date)
    const h = parts.find(p => p.type === 'hour')?.value ?? ''
    const m = parts.find(p => p.type === 'minute')?.value ?? ''
    return `${h}:${m}`
  }
  return `${getDay(startUtc)}日${getTime(startUtc)} - ${getDay(endUtc)}日${getTime(endUtc)}`
}

export function decodeTafToPlain(taf: string, timezone?: string): string {
  if (!taf || taf.includes('No TAF')) return taf

  const lines: string[] = []
  const parts = taf.split(/\s+(?=FM|BECMG|TEMPO|PROB\d{2})/i)

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    if (/^FM\d{4}/.test(trimmed)) {
      const time = trimmed.slice(2, 6)
      lines.push(`\n【从 ${time.slice(0, 2)}:${time.slice(2)} UTC 起】`)
      const rest = trimmed.slice(6).trim()
      lines.push(decodeMetarToPlain(rest, timezone))
    } else if (/^BECMG/.test(trimmed)) {
      lines.push('\n【逐渐变化】')
      lines.push(decodeMetarToPlain(trimmed.replace(/^BECMG\s+\d{4}\/\d{4}\s*/, ''), timezone))
    } else if (/^TEMPO/.test(trimmed)) {
      lines.push('\n【短暂】')
      lines.push(decodeMetarToPlain(trimmed.replace(/^TEMPO\s+\d{4}\/\d{4}\s*/, ''), timezone))
    } else if (/^PROB\d{2}/.test(trimmed)) {
      const prob = trimmed.match(/PROB(\d{2})/)?.[1] ?? '30'
      lines.push(`\n【${prob}% 概率】`)
      lines.push(decodeMetarToPlain(trimmed.replace(/^PROB\d{2}\s+\d{4}\/\d{4}\s*/, ''), timezone))
    } else if (/^TAF\s+/i.test(trimmed)) {
      // TAF header + main body (no FM/BECMG/TEMPO/PROB groups)
      // e.g. TAF LFPG 060500Z 0606/0712 12005KT CAVOK TX18/0615Z TN10/0706Z
      const afterHeader = trimmed.replace(/^TAF\s+\S+\s+\d{6}Z\s*/i, '')
      const validityMatch = afterHeader.match(/^(\d{4}\/\d{4})\s+(.*)/s)
      if (validityMatch) {
        const [, validity, body] = validityMatch
        const d1 = parseInt(validity.slice(0, 2), 10)
        const h1 = parseInt(validity.slice(2, 4), 10)
        const d2 = parseInt(validity.slice(5, 7), 10)
        const h2 = parseInt(validity.slice(7, 9), 10)
        const now = new Date()
        const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), d1, h1, 0, 0))
        const endUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), d2, h2, 0, 0))
        const utcStr = `${d1}日${String(h1).padStart(2, '0')}:00 - ${d2}日${String(h2).padStart(2, '0')}:00 UTC`
        const validityStr = timezone
          ? `${utcStr}（当地 ${formatValidityLocal(startUtc, endUtc, timezone)}）`
          : utcStr
        lines.push(`【有效时段 ${validityStr}】`)
        const refDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), d1, 0, 0, 0))
        lines.push(decodeMetarToPlain(body.trim(), timezone, refDate))
      } else {
        lines.push(decodeMetarToPlain(afterHeader, timezone))
      }
    } else if (!/^(METAR|TAF|KJFK|EGLL|etc)/i.test(trimmed)) {
      lines.push(decodeMetarToPlain(trimmed, timezone))
    }
  }

  return lines.join('\n').trim() || taf
}
