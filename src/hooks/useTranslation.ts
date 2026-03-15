import { useCallback } from 'react'
import { useLanguage } from './useLanguage'
import { translate, type TranslationKey } from '../i18n'

export function useTranslation() {
  const { lang } = useLanguage()
  const t = useCallback(
    (key: TranslationKey) => translate(lang, key),
    [lang],
  )
  return { t, lang }
}
