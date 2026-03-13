import { useState, useEffect } from 'react'

export type Lang = 'zh' | 'en'

const STORAGE_KEY = 'weather-lang'

export function useLanguage() {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en'
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (stored === 'zh' || stored === 'en') return stored
    return 'en'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang)
  }, [lang])

  const setLang = (l: Lang) => setLangState(l)

  return { lang, setLang }
}
