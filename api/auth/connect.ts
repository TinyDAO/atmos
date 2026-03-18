import { prisma } from '../../lib/db'

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

function isValidAddress(addr: unknown): addr is string {
  return typeof addr === 'string' && /^0x[a-fA-F0-9]{40}$/.test(addr)
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin') ?? '*'

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } },
    )
  }

  try {
    const body = await req.json()
    const address = body?.address

    if (!isValidAddress(address)) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address' }),
        { status: 400, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } },
      )
    }

    const user = await prisma.user.upsert({
      where: { address: address.toLowerCase() },
      create: { address: address.toLowerCase(), points: 500 },
      update: {},
    })

    return new Response(
      JSON.stringify({ userId: user.id, address: user.address, points: user.points }),
      { status: 200, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Auth connect error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to connect' }),
      { status: 500, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } },
    )
  }
}
