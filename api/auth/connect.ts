import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }
function createPrisma(): PrismaClient {
  const cs = process.env.DATABASE_URL
  if (!cs) throw new Error('DATABASE_URL is not configured')
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString: cs }), log: ['error'] })
}
const prisma = globalForPrisma.prisma ?? createPrisma()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

function getHeader(h: Headers | Record<string, string | string[] | undefined>, name: string): string {
  if (h && typeof (h as Headers).get === 'function') return (h as Headers).get(name) ?? ''
  const v = (h as Record<string, string | string[] | undefined>)?.[name.toLowerCase()]
  return Array.isArray(v) ? v[0] ?? '' : (v ?? '')
}
async function getBodyJson(req: { json?: () => Promise<unknown>; [Symbol.asyncIterator]?: () => AsyncIterableIterator<Buffer> }): Promise<unknown> {
  if (typeof req.json === 'function') return req.json()
  const chunks: Buffer[] = []
  if (req[Symbol.asyncIterator]) for await (const c of req as AsyncIterable<Buffer>) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c))
  const body = Buffer.concat(chunks).toString('utf-8')
  return body ? JSON.parse(body) : {}
}

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

export default async function handler(req: { method?: string; headers: unknown; json?: () => Promise<unknown>; [Symbol.asyncIterator]?: () => AsyncIterableIterator<Buffer> }): Promise<Response> {
  const origin = getHeader(req.headers as Headers, 'origin') || '*'

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
    const body = (await getBodyJson(req)) as { address?: unknown }
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
