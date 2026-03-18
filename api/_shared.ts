/**
 * Shared utilities for API routes. _ prefix prevents Vercel from treating as endpoint.
 */
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured. Add it in Vercel Project Settings → Environment Variables.')
  }
  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrisma()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export function getHeader(
  headers: Headers | Record<string, string | string[] | undefined>,
  name: string
): string {
  if (headers && typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name) ?? ''
  }
  const key = name.toLowerCase()
  const v = (headers as Record<string, string | string[] | undefined>)?.[key]
  return Array.isArray(v) ? v[0] ?? '' : (v ?? '')
}

export async function getBodyJson(req: {
  json?: () => Promise<unknown>
  [Symbol.asyncIterator]?: () => AsyncIterableIterator<Uint8Array | Buffer>
}): Promise<unknown> {
  if (typeof req.json === 'function') {
    return req.json()
  }
  const chunks: Buffer[] = []
  if (req[Symbol.asyncIterator]) {
    for await (const chunk of req as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
  }
  const body = Buffer.concat(chunks).toString('utf-8')
  return body ? JSON.parse(body) : {}
}
