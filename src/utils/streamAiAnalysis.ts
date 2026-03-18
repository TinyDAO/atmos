export class AiAnalysisAuthError extends Error {
  code: 'AUTH_REQUIRED' | 'INSUFFICIENT_POINTS'
  points?: number

  constructor(message: string, code: 'AUTH_REQUIRED' | 'INSUFFICIENT_POINTS', points?: number) {
    super(message)
    this.name = 'AiAnalysisAuthError'
    this.code = code
    this.points = points
  }
}

export async function* streamAiAnalysis(
  metar: string,
  icao: string,
  lang: 'en' | 'zh',
  taf?: string | null,
  address?: string | null,
): AsyncGenerator<string, void, unknown> {
  const res = await fetch('/api/ai-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metar, icao, lang, ...(taf ? { taf } : {}), ...(address ? { address } : {}) }),
  })

  if (!res.ok) {
    const text = await res.text()
    try {
      const data = JSON.parse(text)
      if (data.code === 'AUTH_REQUIRED') {
        throw new AiAnalysisAuthError(data.error ?? 'Login required', 'AUTH_REQUIRED')
      }
      if (data.code === 'INSUFFICIENT_POINTS') {
        throw new AiAnalysisAuthError(data.error ?? 'Insufficient points', 'INSUFFICIENT_POINTS', data.points)
      }
    } catch (e) {
      if (e instanceof AiAnalysisAuthError) throw e
    }
    throw new Error(`AI analysis request failed (${res.status}): ${text}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue

      const payload = trimmed.slice(6)
      if (payload === '[DONE]') return

      try {
        const parsed = JSON.parse(payload)
        if (parsed.error) throw new Error(parsed.error)
        if (parsed.content) yield parsed.content
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }
}
