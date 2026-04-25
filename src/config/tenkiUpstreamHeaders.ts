/**
 * tenki.jp 上游请求头（与浏览器地址栏打开尽量一致）。
 * 供 Vite 开发中间件、Vercel api/tenki-html、客户端 fetch 共用。
 */

export const TENKI_CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/** 用于 Node fetch(upstream) — 勿混入浏览器对 localhost 的 Sec-Fetch / Cookie 等 */
export const TENKI_UPSTREAM_HEADERS: Record<string, string> = {
  'User-Agent': TENKI_CHROME_UA,
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'ja,zh-CN;q=0.9,en-US;q=0.8,en;q=0.7,ja;q=0.6',
  Referer: 'https://tenki.jp/',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Sec-CH-UA':
    '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'Sec-CH-UA-Mobile': '?0',
  'Sec-CH-UA-Platform': '"macOS"',
}
