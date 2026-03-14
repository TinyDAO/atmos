/**
 * Wind analysis translations (Origin, Characteristics, Weather impact, VFR/Turbulence)
 */

import type { Lang } from '../hooks/useLanguage'

export interface WindAnalysisStrings {
  dirOrigins: Record<string, string>
  variable: string
  unknown: string
  characteristics: {
    seaBreeze: string
    coldNortherly: string
    milderSoutherly: string
    westerlyFlow: string
    lightVariable: string
    noPattern: string
  }
  weatherImpact: {
    northerly: string
    southerly: string
  }
  turbulence: {
    moderateSevere: string
    moderatePossible: string
    lightPossible: string
    gustyConditions: string
    afternoonThermal: string
    variableWindShear: string
    strongSurfaceWind: string
  }
  labels: {
    origin: string
    characteristics: string
    weatherImpact: string
    vfrTurbulence: string
  }
}

const ZH: WindAnalysisStrings = {
  dirOrigins: {
    N: '来自北方', NNE: '来自东北偏北', NE: '来自东北', ENE: '来自东北偏东',
    E: '来自东方', ESE: '来自东南偏东', SE: '来自东南', SSE: '来自东南偏南',
    S: '来自南方', SSW: '来自西南偏南', SW: '来自西南', WSW: '来自西南偏西',
    W: '来自西方', WNW: '来自西北偏西', NW: '来自西北', NNW: '来自西北偏北',
  },
  variable: '风向不定',
  unknown: '未知',
  characteristics: {
    seaBreeze: '午后海风（沿海）',
    coldNortherly: '冷性北风',
    milderSoutherly: '较暖南风',
    westerlyFlow: '中纬度常见西风',
    lightVariable: '近地面轻且不定',
    noPattern: '无明显季节特征',
  },
  weatherImpact: {
    northerly: '北风带来冷空气。',
    southerly: '南风带来暖空气。',
  },
  turbulence: {
    moderateSevere: '可能出现中到强乱流。',
    moderatePossible: '可能出现中度乱流。',
    lightPossible: '可能出现轻度乱流。',
    gustyConditions: '阵风明显，低空可能颠簸。',
    afternoonThermal: '午后热力乱流可能（晴天）。',
    variableWindShear: '风向不定，可能存在风切变。',
    strongSurfaceWind: '地面风较强，注意侧风与滑行。',
  },
  labels: {
    origin: '风向来源',
    characteristics: '特征',
    weatherImpact: '天气影响',
    vfrTurbulence: '乱流',
  },
}

const EN: WindAnalysisStrings = {
  dirOrigins: {
    N: 'from north', NNE: 'from north-northeast', NE: 'from northeast', ENE: 'from east-northeast',
    E: 'from east', ESE: 'from east-southeast', SE: 'from southeast', SSE: 'from south-southeast',
    S: 'from south', SSW: 'from south-southwest', SW: 'from southwest', WSW: 'from west-southwest',
    W: 'from west', WNW: 'from west-northwest', NW: 'from northwest', NNW: 'from north-northwest',
  },
  variable: 'Variable',
  unknown: 'Unknown',
  characteristics: {
    seaBreeze: 'Typical afternoon sea breeze possible (coastal)',
    coldNortherly: 'Cold northerly flow',
    milderSoutherly: 'Milder southerly flow',
    westerlyFlow: 'Westerly flow typical for mid-latitudes',
    lightVariable: 'Light and variable near surface',
    noPattern: 'No notable seasonal pattern',
  },
  weatherImpact: {
    northerly: 'Northerly winds bring cooler air.',
    southerly: 'Southerly winds bring warmer air.',
  },
  turbulence: {
    moderateSevere: 'Moderate to severe turbulence likely.',
    moderatePossible: 'Moderate turbulence possible.',
    lightPossible: 'Light turbulence possible.',
    gustyConditions: 'Gusty conditions — expect bumpy ride in low levels.',
    afternoonThermal: 'Afternoon thermal turbulence possible (sunny days).',
    variableWindShear: 'Variable wind — wind shear possible.',
    strongSurfaceWind: 'Strong surface wind — crosswind and taxi considerations.',
  },
  labels: {
    origin: 'Origin',
    characteristics: 'Characteristics',
    weatherImpact: 'Weather impact',
    vfrTurbulence: 'Turbulence',
  },
}

export function getWindAnalysisStrings(lang: Lang): WindAnalysisStrings {
  return lang === 'zh' ? ZH : EN
}
