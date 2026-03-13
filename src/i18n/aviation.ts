/**
 * Aviation weather (METAR/TAF) translations for plain-language decoding
 */

export type Lang = 'zh' | 'en'

export interface AviationStrings {
  cloudCover: Record<string, string>
  weatherCodes: Record<string, string>
  cloudSuffix: { cb: string; tcu: string }
  cloudLayer: (cover: string, ft: number, m: number, suffix: string) => string // cover from cloudCover, suffix from cloudSuffix
  wind: {
    variable: (speed: string, gust?: string) => string
    dirNames: string[]
    withGust: (dirName: string, dirDeg: number, speed: string, gust: string) => string
    noGust: (dirName: string, dirDeg: number, speed: string) => string
  }
  visibility: {
    miles: (mi: number, km: string) => string
    above10km: string
    below50m: string
    meters: (m: number) => string
    greaterMiles: (mi: number) => string
  }
  tempDewpoint: (temp: number, dew: number | null) => string
  pressure: {
    hpa: (hpa: number) => string
    inHg: (inHg: string, hpa: number) => string
  }
  cavok: string
  clouds: string
  weather: string
  txTime: (t: number, timeStr: string) => string
  tnTime: (t: number, timeStr: string) => string
  txTnFormat: {
    day: string
    local: string
    utc: (d: number, h: string, m?: string) => string
  }
  taf: {
    from: (hh: string, mm: string) => string
    becmg: string
    tempo: string
    prob: (p: string) => string
    validity: (utcStr: string, localStr?: string) => string
  }
}

const ZH: AviationStrings = {
  cloudCover: {
    SKC: '晴空',
    FEW: '少云 (1-2成)',
    SCT: '疏云 (3-4成)',
    BKN: '多云 (5-7成)',
    OVC: '阴天 (8成)',
  },
  weatherCodes: {
    '-': '轻', '+': '强', VC: '附近', MI: '浅', BC: '碎片状', BL: '吹', SH: '阵性', TS: '雷暴', FZ: '冻',
    PR: '部分', DR: '低吹', DZ: '毛毛雨', RA: '雨', SN: '雪', SG: '米雪', IC: '冰晶', PL: '冰粒',
    GR: '冰雹', GS: '小冰雹', UP: '未知降水', BR: '轻雾', FG: '雾', FU: '烟', VA: '火山灰',
    DU: '尘', SA: '沙', HZ: '霾', PY: '喷雾',
  },
  cloudSuffix: { cb: ' (积雨云)', tcu: ' (塔状积云)' },
  cloudLayer: (cover, ft, m, suffix) => `${cover}，云底高 ${ft} 英尺 (约 ${m} 米)${suffix}`,
  wind: {
    variable: (speed, gust) => gust ? `风向不定，风速 ${speed} 节，阵风 ${gust} 节` : `风向不定，风速 ${speed} 节`,
    dirNames: ['北', '东北偏北', '东北', '东北偏东', '东', '东南偏东', '东南', '东南偏南', '南', '西南偏南', '西南', '西南偏西', '西', '西北偏西', '西北', '西北偏北'],
    withGust: (dirName, dirDeg, speed, gust) => `风向 ${dirName} (${dirDeg}°)，风速 ${speed} 节，阵风 ${gust} 节`,
    noGust: (dirName, dirDeg, speed) => `风向 ${dirName} (${dirDeg}°)，风速 ${speed} 节`,
  },
  visibility: {
    miles: (mi, km) => `能见度 ${mi} 英里 (约 ${km} 公里)`,
    above10km: '能见度 10 公里以上',
    below50m: '能见度不足 50 米',
    meters: (m) => `能见度 ${m} 米`,
    greaterMiles: (mi) => `能见度大于 ${mi} 英里`,
  },
  tempDewpoint: (temp, dew) => dew !== null ? `气温 ${temp}°C，露点 ${dew}°C` : `气温 ${temp}°C`,
  pressure: {
    hpa: (hpa) => `气压 ${hpa} hPa`,
    inHg: (inHg, hpa) => `气压 ${inHg} inHg (约 ${hpa} hPa)`,
  },
  cavok: '能见度良好，无云，无重要天气 (CAVOK)',
  clouds: '云',
  weather: '天气',
  txTime: (t, timeStr) => `今日最高温 ${t}°C，出现时间 ${timeStr}`,
  tnTime: (t, timeStr) => `今日最低温 ${t}°C，出现时间 ${timeStr}`,
  txTnFormat: {
    day: '日',
    local: '当地',
    utc: (d: number, h: string, m?: string) => (m != null ? `${d}日 ${h}:${m} UTC` : `${d}日 ${h}:00 UTC`),
  },
  taf: {
    from: (hh, mm) => `【从 ${hh}:${mm} UTC 起】`,
    becmg: '【逐渐变化】',
    tempo: '【短暂】',
    prob: (p) => `【${p}% 概率】`,
    validity: (utcStr, localStr) => localStr ? `【有效时段 ${utcStr}（当地 ${localStr}）】` : `【有效时段 ${utcStr}】`,
  },
}

const EN: AviationStrings = {
  cloudCover: {
    SKC: 'Clear',
    FEW: 'Few (1-2 oktas)',
    SCT: 'Scattered (3-4 oktas)',
    BKN: 'Broken (5-7 oktas)',
    OVC: 'Overcast (8 oktas)',
  },
  weatherCodes: {
    '-': 'Light', '+': 'Heavy', VC: 'Vicinity', MI: 'Shallow', BC: 'Patches', BL: 'Blowing', SH: 'Showers', TS: 'Thunderstorm', FZ: 'Freezing',
    PR: 'Partial', DR: 'Low drifting', DZ: 'Drizzle', RA: 'Rain', SN: 'Snow', SG: 'Snow grains', IC: 'Ice crystals', PL: 'Ice pellets',
    GR: 'Hail', GS: 'Small hail', UP: 'Unknown precip', BR: 'Mist', FG: 'Fog', FU: 'Smoke', VA: 'Volcanic ash',
    DU: 'Dust', SA: 'Sand', HZ: 'Haze', PY: 'Spray',
  },
  cloudSuffix: { cb: ' (Cumulonimbus)', tcu: ' (Towering cumulus)' },
  cloudLayer: (cover, ft, m, suffix) => `${cover}, base ${ft} ft (≈${m} m)${suffix}`,
  wind: {
    variable: (speed, gust) => gust ? `Wind variable ${speed} kt, gusts ${gust} kt` : `Wind variable ${speed} kt`,
    dirNames: ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'],
    withGust: (dirName, dirDeg, speed, gust) => `Wind ${dirName} (${dirDeg}°), ${speed} kt, gusts ${gust} kt`,
    noGust: (dirName, dirDeg, speed) => `Wind ${dirName} (${dirDeg}°), ${speed} kt`,
  },
  visibility: {
    miles: (mi, km) => `Visibility ${mi} statute miles (≈${km} km)`,
    above10km: 'Visibility 10 km or more',
    below50m: 'Visibility less than 50 m',
    meters: (m) => `Visibility ${m} m`,
    greaterMiles: (mi) => `Visibility greater than ${mi} miles`,
  },
  tempDewpoint: (temp, dew) => dew !== null ? `Temp ${temp}°C, dewpoint ${dew}°C` : `Temp ${temp}°C`,
  pressure: {
    hpa: (hpa) => `Pressure ${hpa} hPa`,
    inHg: (inHg, hpa) => `Pressure ${inHg} inHg (≈${hpa} hPa)`,
  },
  cavok: 'Ceiling and visibility OK (CAVOK)',
  clouds: 'Clouds',
  weather: 'Weather',
  txTime: (t, timeStr) => `Today max ${t}°C at ${timeStr}`,
  tnTime: (t, timeStr) => `Today min ${t}°C at ${timeStr}`,
  txTnFormat: {
    day: '',
    local: 'Local',
    utc: (d: number, h: string, m?: string) => (m != null ? `Day ${d} ${h}:${m} UTC` : `Day ${d} ${h}:00 UTC`),
  },
  taf: {
    from: (hh, mm) => `[From ${hh}:${mm} UTC]`,
    becmg: '[Becoming]',
    tempo: '[Temporary]',
    prob: (p) => `[${p}% probability]`,
    validity: (utcStr, localStr) => localStr ? `[Valid ${utcStr} (Local ${localStr})]` : `[Valid ${utcStr}]`,
  },
}

export function getAviationStrings(lang: Lang): AviationStrings {
  return lang === 'zh' ? ZH : EN
}
