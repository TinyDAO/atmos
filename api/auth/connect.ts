import 'dotenv/config'
import { verifyMessage } from 'viem'
import { neon } from '@neondatabase/serverless'

const cs = process.env.DATABASE_URL
if (!cs) throw new Error('DATABASE_URL is not configured')
const conn = cs.includes('connect_timeout=') ? cs : cs + (cs.includes('?') ? '&' : '?') + 'connect_timeout=30'
const sql = neon(conn)

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

const MESSAGE_PREFIX = 'Connect to Weather App\nTimestamp: '
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000 // 5 min

function parseMessageTimestamp(message: string): number | null {
  if (!message.startsWith(MESSAGE_PREFIX)) return null
  const tsStr = message.slice(MESSAGE_PREFIX.length)
  const ts = Date.parse(tsStr)
  return isNaN(ts) ? null : ts
}

function isMessageFresh(ts: number): boolean {
  const now = Date.now()
  return Math.abs(now - ts) <= TIMESTAMP_TOLERANCE_MS
}

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get('origin') || '*'

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } },
      )
    }

    try {
      const body = (await request.json()) as { address?: unknown; signature?: unknown; message?: unknown }
      const address = body?.address
      const signature = body?.signature
      const message = body?.message

      if (!isValidAddress(address)) {
        return new Response(
          JSON.stringify({ error: 'Invalid wallet address' }),
          { status: 400, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } },
        )
      }

      if (typeof signature !== 'string' || typeof message !== 'string' || !signature.startsWith('0x') || message.length < 10) {
        return new Response(
          JSON.stringify({ error: 'Signature required', code: 'SIGNATURE_REQUIRED' }),
          { status: 401, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } },
        )
      }

      const ts = parseMessageTimestamp(message)
      if (ts === null || !isMessageFresh(ts)) {
        return new Response(
          JSON.stringify({ error: 'Message expired, please sign again', code: 'MESSAGE_EXPIRED' }),
          { status: 401, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } },
        )
      }

      const valid = await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      })
      if (!valid) {
        return new Response(
          JSON.stringify({ error: 'Invalid signature', code: 'INVALID_SIGNATURE' }),
          { status: 401, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } },
        )
      }

      const addr = address.toLowerCase()
      const [user] = await sql`
        INSERT INTO users (id, address, points, "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${addr}, 500, now(), now())
        ON CONFLICT (address) DO UPDATE SET "updatedAt" = now()
        RETURNING id, address, points
      `

      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Failed to connect' }),
          { status: 500, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } },
        )
      }

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
  },
}
