import { prisma } from '../lib/db'

function getAllowedOrigins(): string[] {
  const env = process.env.ALLOWED_ORIGINS
  if (!env) return []
  return env.split(',').map((o) => o.trim()).filter(Boolean)
}

function corsHeaders(req: Request): Record<string, string> {
  const allowed = getAllowedOrigins()
  const origin = req.headers.get('origin') ?? ''
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

export default async function handler(req: Request): Promise<Response> {
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
    const url = new URL(req.url)
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
