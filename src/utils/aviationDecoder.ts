/**
 * Decode METAR/TAF aviation codes to plain language
 * Supports multi-language via getAviationStrings(lang)
 */

import { getAviationStrings } from '../i18n/aviation'
import type { Lang } from '../hooks/useLanguage'

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

export function decodeMetarToPlain(
  metar: string,
  timezone?: string,
  referenceDate?: Date,
  lang: Lang = 'en'
): string {
  if (!metar || metar.includes('No METAR')) return metar

  const s = getAviationStrings(lang)
  const lines: string[] = []
  let remaining = metar.replace(/\bPROB\d{2}\s*(?:\d{4}\/\d{4})?\s*/gi, '').trim()
  const reportDate = referenceDate ?? getReportDateFromText(metar)

  if (/\bCAVOK\b/.test(remaining)) {
    lines.push('• ' + s.cavok)
    remaining = remaining.replace(/\bCAVOK\b/, '')
  }

  const windMatch = remaining.match(/\b(\d{5}(?:G\d{2})?KT|VRB\d{1,3}(?:G\d{2})?KT)\b/)
  if (windMatch) {
    if (windMatch[1].startsWith('VRB')) {
      const speedMatch = windMatch[1].match(/VRB(\d+)(?:G(\d+))?KT/)
      const speed = speedMatch?.[1] ?? windMatch[1].match(/\d+/)?.[0] ?? '?'
      const gust = speedMatch?.[2]
      lines.push('• ' + s.wind.variable(speed, gust))
    } else {
      const dir = windMatch[1].slice(0, 3)
      const dirDeg = parseInt(dir, 10)
      if (!isNaN(dirDeg)) {
        const dirName = s.wind.dirNames[Math.round(dirDeg / 22.5) % 16]
        const speedPart = windMatch[1].slice(3)
        const gustMatch = speedPart.match(/^(\d+)G(\d+)KT/)
        if (gustMatch) {
          lines.push('• ' + s.wind.withGust(dirName, dirDeg, gustMatch[1], gustMatch[2]))
        } else {
          const speedMatch = speedPart.match(/^(\d+)KT/)
          if (speedMatch) lines.push('• ' + s.wind.noGust(dirName, dirDeg, speedMatch[1]))
        }
      }
    }
    remaining = remaining.replace(windMatch[0], '')
  }

  const visMatch = remaining.match(/\b(\d{4}(?:M)?|(?:\d+)?(?:\s?\d\/\d)?SM|P\d+SM)\b/)
  if (visMatch) {
    const v = visMatch[1].replace(/\s/g, '')
    if (v.endsWith('SM')) {
      const mi = parseFloat(v.replace('SM', ''))
      if (!isNaN(mi)) lines.push('• ' + s.visibility.miles(mi, (mi * 1.609).toFixed(1)))
    } else if (v === '9999' || v === '9999M') {
      lines.push('• ' + s.visibility.above10km)
    } else if (v === '0000') {
      lines.push('• ' + s.visibility.below50m)
    } else if (/^\d{4}$/.test(v)) {
      lines.push('• ' + s.visibility.meters(parseInt(v, 10)))
    } else if (v.startsWith('P')) {
      const mi = parseFloat(v.slice(1).replace('SM', ''))
      if (!isNaN(mi)) lines.push('• ' + s.visibility.greaterMiles(mi))
    }
    remaining = remaining.replace(visMatch[0], '')
  }

  const cloudRegex = /\b(FEW|SCT|BKN|OVC|SKC)(\d{3})?(CB|TCU)?\b/g
  const clouds: string[] = []
  let cm
  while ((cm = cloudRegex.exec(remaining)) !== null) {
    const coverCode = cm[0].slice(0, 3)
    const cover = s.cloudCover[coverCode] ?? coverCode
    const heightMatch = cm[0].slice(3).match(/^(\d{3})/)
    if (!heightMatch) {
      clouds.push(cover)
    } else {
      const ft = parseInt(heightMatch[1], 10) * 100
      const m = Math.round(ft * 0.3048)
      const suffix = cm[0].includes('CB') ? s.cloudSuffix.cb : cm[0].includes('TCU') ? s.cloudSuffix.tcu : ''
      clouds.push(s.cloudLayer(cover, ft, m, suffix))
    }
  }
  if (clouds.length) lines.push('• ' + s.clouds + ': ' + clouds.join(lang === 'zh' ? '；' : '; '))

  const wxRegex = /\b([+-]?(?:VC)?(?:MI|BC|BL|SH|TS|FZ|PR|DR)?(?:DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PY)+)\b/g
  const wx: string[] = []
  let wm
  while ((wm = wxRegex.exec(remaining)) !== null) {
    const parts: string[] = []
    let i = 0
    const code = wm[1]
    if (code[i] === '-' || code[i] === '+') {
      parts.push(s.weatherCodes[code[i]] ?? '')
      i++
    }
    while (i < code.length) {
      const two = code.slice(i, i + 2)
      const one = code[i]
      if (s.weatherCodes[two]) {
        parts.push(s.weatherCodes[two])
        i += 2
      } else if (s.weatherCodes[one]) {
        parts.push(s.weatherCodes[one])
        i += 1
      } else {
        i++
      }
    }
    const decoded = parts.filter(Boolean).join('') || code
    if (decoded) wx.push(decoded)
  }
  if (wx.length) lines.push('• ' + s.weather + ': ' + wx.join(lang === 'zh' ? '，' : ', '))

  const tempMatch = remaining.match(/\b(M?\d{2})\/(M?\d{2})\b/)
  if (tempMatch) {
    const t = tempMatch[1].startsWith('M') ? -parseInt(tempMatch[1].slice(1), 10) : parseInt(tempMatch[1], 10)
    const d = tempMatch[2].startsWith('M') ? -parseInt(tempMatch[2].slice(1), 10) : parseInt(tempMatch[2], 10)
    lines.push('• ' + s.tempDewpoint(t, d))
    remaining = remaining.replace(tempMatch[0], '')
  }

  const pressureMatch = remaining.match(/\b(Q\d{4}|A\d{4})\b/)
  if (pressureMatch) {
    const p = pressureMatch[1]
    if (p.startsWith('Q')) {
      lines.push('• ' + s.pressure.hpa(parseInt(p.slice(1), 10)))
    } else {
      const inHg = parseInt(p.slice(1), 10) / 100
      lines.push('• ' + s.pressure.inHg(inHg.toFixed(2), Math.round(inHg * 33.86)))
    }
  }

  const locale = lang === 'zh' ? 'zh-CN' : 'en-US'
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
      const utcStr = s.txTnFormat.utc(
        utcDate.getUTCDate(),
        String(utcDate.getUTCHours()).padStart(2, '0'),
        String(utcDate.getUTCMinutes()).padStart(2, '0')
      )
      const localTimeFmt = new Intl.DateTimeFormat(locale, { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false })
      const localTime = localTimeFmt.format(utcDate)
      return `${utcStr}（${s.txTnFormat.local} ${localTime}）`
    }
    return s.txTnFormat.utc(
      utcDate.getUTCDate(),
      String(utcDate.getUTCHours()).padStart(2, '0'),
      raw.length === 6 ? String(utcDate.getUTCMinutes()).padStart(2, '0') : undefined
    )
  }

  const txMatch = remaining.match(/\bTX(M?\d{2})\/(\d{4,6})Z\b/)
  if (txMatch) {
    const t = txMatch[1].startsWith('M') ? -parseInt(txMatch[1].slice(1), 10) : parseInt(txMatch[1], 10)
    lines.push('• ' + s.txTime(t, formatTxTnTime(txMatch[2])))
  }
  const tnMatch = remaining.match(/\bTN(M?\d{2})\/(\d{4,6})Z\b/)
  if (tnMatch) {
    const t = tnMatch[1].startsWith('M') ? -parseInt(tnMatch[1].slice(1), 10) : parseInt(tnMatch[1], 10)
    lines.push('• ' + s.tnTime(t, formatTxTnTime(tnMatch[2])))
  }

  return lines.length ? lines.join('\n') : remaining
}

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
    if (day === tomorrowDay) filtered.push(part)
  }

  return filtered.length > 1 ? filtered.join(' ') : taf
}

function formatValidityLocal(startUtc: Date, endUtc: Date, timezone: string, lang: Lang): string {
  const locale = lang === 'zh' ? 'zh-CN' : 'en-US'
  const fmt = new Intl.DateTimeFormat(locale, { timeZone: timezone, day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
  const getDay = (date: Date) => fmt.formatToParts(date).find(p => p.type === 'day')?.value ?? ''
  const getTime = (date: Date) => {
    const parts = fmt.formatToParts(date)
    const h = parts.find(p => p.type === 'hour')?.value ?? ''
    const m = parts.find(p => p.type === 'minute')?.value ?? ''
    return `${h}:${m}`
  }
  const dayLabel = lang === 'zh' ? '日' : ' '
  return `${getDay(startUtc)}${dayLabel}${getTime(startUtc)} - ${getDay(endUtc)}${dayLabel}${getTime(endUtc)}`
}

export function decodeTafToPlain(taf: string, timezone?: string, lang: Lang = 'en'): string {
  if (!taf || taf.includes('No TAF')) return taf

  const s = getAviationStrings(lang)
  const lines: string[] = []
  const parts = taf.split(/\s+(?=FM|BECMG|TEMPO|PROB\d{2})/i)

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    if (/^FM\d{4}/.test(trimmed)) {
      const time = trimmed.slice(2, 6)
      lines.push('\n' + s.taf.from(time.slice(0, 2), time.slice(2)))
      lines.push(decodeMetarToPlain(trimmed.slice(6).trim(), timezone, undefined, lang))
    } else if (/^BECMG/.test(trimmed)) {
      lines.push('\n' + s.taf.becmg)
      lines.push(decodeMetarToPlain(trimmed.replace(/^BECMG\s+\d{4}\/\d{4}\s*/, ''), timezone, undefined, lang))
    } else if (/^TEMPO/.test(trimmed)) {
      lines.push('\n' + s.taf.tempo)
      lines.push(decodeMetarToPlain(trimmed.replace(/^TEMPO\s+\d{4}\/\d{4}\s*/, ''), timezone, undefined, lang))
    } else if (/^PROB\d{2}/.test(trimmed)) {
      const prob = trimmed.match(/PROB(\d{2})/)?.[1] ?? '30'
      lines.push('\n' + s.taf.prob(prob))
      lines.push(decodeMetarToPlain(trimmed.replace(/^PROB\d{2}\s+\d{4}\/\d{4}\s*/, ''), timezone, undefined, lang))
    } else if (/^TAF\s+/i.test(trimmed)) {
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
        const dayLabel = lang === 'zh' ? '日' : ' '
        const utcStr = `${d1}${dayLabel}${String(h1).padStart(2, '0')}:00 - ${d2}${dayLabel}${String(h2).padStart(2, '0')}:00 UTC`
        const localStr = timezone ? formatValidityLocal(startUtc, endUtc, timezone, lang) : undefined
        lines.push(s.taf.validity(utcStr, localStr))
        const refDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), d1, 0, 0, 0))
        lines.push(decodeMetarToPlain(body.trim(), timezone, refDate, lang))
      } else {
        lines.push(decodeMetarToPlain(afterHeader, timezone, undefined, lang))
      }
    } else if (!/^(METAR|TAF|KJFK|EGLC|etc)/i.test(trimmed)) {
      lines.push(decodeMetarToPlain(trimmed, timezone, undefined, lang))
    }
  }

  return lines.join('\n').trim() || taf
}
