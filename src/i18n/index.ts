import en from './locales/en'
import zh from './locales/zh'
import type { TranslationShape } from './locales/en'
import type { Lang } from '../hooks/useLanguage'

export type Translations = typeof en

type FlattenKeys<T, Prefix extends string = ''> = T extends Record<string, unknown>
  ? {
      [K in keyof T & string]: T[K] extends Record<string, unknown>
        ? FlattenKeys<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`
    }[keyof T & string]
  : never

export type TranslationKey = FlattenKeys<Translations>

const locales: Record<Lang, TranslationShape> = { en, zh }

function resolve(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return path
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : path
}

export function translate(lang: Lang, key: TranslationKey): string {
  const result = resolve(locales[lang] as unknown as Record<string, unknown>, key)
  if (result === key && lang !== 'en') {
    return resolve(locales.en as unknown as Record<string, unknown>, key)
  }
  return result
}
