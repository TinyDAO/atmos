export async function* streamAiAnalysis(
  metar: string,
  icao: string,
  lang: 'en' | 'zh',
): AsyncGenerator<string, void, unknown> {
  const res = await fetch('/api/ai-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metar, icao, lang }),
  })

  if (!res.ok) {
    const text = await res.text()
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
