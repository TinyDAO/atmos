/** Get header value from Request (Web API) or IncomingMessage (Node.js) */
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

/** Parse request body as JSON. Works with Web API Request or Node.js IncomingMessage. */
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
