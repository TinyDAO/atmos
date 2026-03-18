import { prisma } from './_lib/db'
import { getHeader } from './_lib/request'

function getAllowedOrigins(): string[] {
  const env = process.env.ALLOWED_ORIGINS
  if (!env) return []
  return env.split(',').map((o) => o.trim()).filter(Boolean)
}

function corsHeaders(req: { headers: unknown }): Record<string, string> {
  const allowed = getAllowedOrigins()
  const origin = getHeader(req.headers as Headers, 'origin')
  const allowOrigin = allowed.length === 0 ? '*' : allowed.includes(origin) ? origin : allowed[0]
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

function isValidAddress(addr: unknown): addr is string {
  return typeof addr === 'string' && /^0x[a-fA-F0-9]{40}$/.test(addr)
}

export default async function handler(req: { method?: string; headers: unknown; url?: string }): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    )
  }

  try {
    const urlStr = req.url ?? ''
    const url = urlStr.startsWith('http') ? new URL(urlStr) : new URL(urlStr, 'http://localhost')
    const address = url.searchParams.get('address')

    if (!isValidAddress(address)) {
      return new Response(
        JSON.stringify({ error: 'Invalid address' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    const user = await prisma.user.findUnique({
      where: { address: address.toLowerCase() },
      select: { points: true },
    })

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found', points: 0 }),
        { status: 404, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ points: user.points }),
      { status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Points API error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch points' }),
      { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    )
  }
}
