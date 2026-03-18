import OpenAI from 'openai'
import { Redis } from '@upstash/redis'
import { prisma } from '../../lib/db'

const memoryCache = new Map<string, { text: string; ts: number }>()
const MEMORY_TTL_MS = 3600_000

function getAllowedOrigins(): string[] {
  const env = process.env.ALLOWED_ORIGINS
  if (!env) return []
  return env.split(',').map((o) => o.trim()).filter(Boolean)
}

function isOriginAllowed(req: Request): boolean {
  const allowed = getAllowedOrigins()
  if (allowed.length === 0) return true

  const origin = req.headers.get('origin') ?? ''
  const referer = req.headers.get('referer') ?? ''

  if (origin && allowed.includes(origin)) return true
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin
      if (allowed.includes(refOrigin)) return true
    } catch {}
  }
  return false
}

function corsHeaders(req: Request): Record<string, string> {
  const allowed = getAllowedOrigins()
  const origin = req.headers.get('origin') ?? ''
  const allowOrigin = allowed.length === 0
    ? '*'
    : allowed.includes(origin) ? origin : allowed[0]
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

const ICAO_RE = /^[A-Z]{4}$/
const METAR_MAX_LEN = 600
const TAF_MAX_LEN = 2000

function validateIcao(icao: unknown): icao is string {
  return typeof icao === 'string' && ICAO_RE.test(icao)
}

function validateMetar(metar: unknown): metar is string {
  if (typeof metar !== 'string') return false
  const trimmed = metar.trim()
  if (trimmed.length < 10 || trimmed.length > METAR_MAX_LEN) return false
  if (!/^[\x20-\x7E]+$/.test(trimmed)) return false
  if (!/\d{6}Z/.test(trimmed)) return false
  if (!/(\d{3}\d{2,3}(G\d{2,3})?(KT|MPS)|VRB\d{2,3}(KT|MPS)|00000KT)/.test(trimmed)) return false
  return true
}

function validateTaf(taf: unknown): taf is string {
  if (typeof taf !== 'string') return false
  const trimmed = taf.trim()
  if (trimmed.length === 0) return true
  if (trimmed.length > TAF_MAX_LEN) return false
  if (!/^[\x20-\x7E\n\r]+$/.test(trimmed)) return false
  if (!/\d{6}Z/.test(trimmed)) return false
  return true
}

function validateLang(lang: unknown): lang is 'en' | 'zh' {
  return lang === 'en' || lang === 'zh'
}

function isValidAddress(addr: unknown): addr is string {
  return typeof addr === 'string' && /^0x[a-fA-F0-9]{40}$/.test(addr)
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  )
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const SYSTEM_PROMPT_EN = `You are a professional aviation meteorologist. Analyze the provided METAR report (and TAF forecast if available) and give a concise, professional weather briefing. Cover:
- Today's Max temperature probability analysis
  - Max temperature probability distribution
  - Max temperature appearance time range

Should consider the influence of wind, precipitation, cloud cover, etc. on the temperature.
The output time should be in the airport's timezone.
Today is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
Be professional. Use paragraphs or tables. Do not use markdown headers.`

const SYSTEM_PROMPT_ZH = `你是一位专业的航空气象分析师。根据提供的 METAR 报文（以及 TAF 预报，如果有的话），提供简明、专业的天气分析。包括：
- 今日最高温度的可能性分析
  - 最高温度的概率分布
  - 最高温度出现的时间段

需要考虑风, 雨, 云等因素对温度的影响
输出的时间应该使用机场所在时区时间。
今天是${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
保持专业，使用中文回答。使用段落或者表格，不要使用 markdown 标题。`

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  if (!isOriginAllowed(req)) {
    return new Response(
      JSON.stringify({ error: 'Forbidden' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    const body = await req.json()
    const cors = corsHeaders(req)
    const metar = typeof body.metar === 'string' ? body.metar.trim() : ''
    const taf = typeof body.taf === 'string' ? body.taf.trim() : ''
    const icao = typeof body.icao === 'string' ? body.icao.trim().toUpperCase() : ''
    const lang = validateLang(body.lang) ? body.lang : 'en'
    const address = body?.address

    if (!isValidAddress(address)) {
      return new Response(
        JSON.stringify({ error: 'Login required', code: 'AUTH_REQUIRED' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const addr = address.toLowerCase()
    const user = await prisma.user.findUnique({ where: { address: addr } })
    if (!user || user.points < 1) {
      return new Response(
        JSON.stringify({ error: 'Insufficient points', code: 'INSUFFICIENT_POINTS', points: user?.points ?? 0 }),
        { status: 402, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { address: addr },
        data: { points: { decrement: 1 } },
      }),
      prisma.pointRecord.create({
        data: {
          userId: user.id,
          amount: -1,
          reason: 'ai_analysis',
          icao: icao || null,
        },
      }),
    ])

    if (!validateIcao(icao)) {
      return new Response(
        JSON.stringify({ error: 'Invalid ICAO code' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    if (!validateMetar(metar)) {
      return new Response(
        JSON.stringify({ error: 'Invalid METAR format' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    if (taf && !validateTaf(taf)) {
      return new Response(
        JSON.stringify({ error: 'Invalid TAF format' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const cacheKey = `ai-analysis:${await sha256(metar + taf + lang)}`

    // Check cache: Redis first, then in-memory fallback
    let redis: Redis | null = null
    let cached: string | null = null

    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      redis = new Redis({
        url: process.env.KV_REST_API_URL!,
        token: process.env.KV_REST_API_TOKEN!,
      })
      cached = await redis.get<string>(cacheKey)
    } else {
      const entry = memoryCache.get(cacheKey)
      if (entry && Date.now() - entry.ts < MEMORY_TTL_MS) {
        cached = entry.text
      } else if (entry) {
        memoryCache.delete(cacheKey)
      }
    }

    if (cached) {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: cached })}\n\n`),
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })
      return new Response(stream, {
        headers: {
          ...cors,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    const openai = new OpenAI({
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY,
    })

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: lang === 'zh' ? SYSTEM_PROMPT_ZH : SYSTEM_PROMPT_EN,
        },
        { role: 'user', content: taf
          ? `METAR for ${icao}:\n${metar}\n\nTAF for ${icao}:\n${taf}`
          : `METAR for ${icao}:\n${metar}` },
      ],
      stream: true,
      max_tokens: 100*1024,
    })

    let fullText = ''
    const encoder = new TextEncoder()

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              fullText += content
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
              )
            }
          }

          if (fullText) {
            if (redis) {
              await redis.set(cacheKey, fullText, { ex: 3600 })
            } else {
              memoryCache.set(cacheKey, { text: fullText, ts: Date.now() })
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: String(err) })}\n\n`,
            ),
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      },
    })

    return new Response(responseStream, {
      headers: {
        ...cors,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    )
  }
}
