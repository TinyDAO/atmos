import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { streamAiAnalysis } from '../../utils/streamAiAnalysis'
import { useTranslation } from '../../hooks/useTranslation'

interface AiAnalysisPanelProps {
  metar: string
  icao: string
  lang: 'en' | 'zh'
  onClose: () => void
}

function parseThinkBlocks(raw: string): { thinking: string; body: string; thinkingComplete: boolean } {
  const openTag = '<think>'
  const closeTag = '</think>'

  const openIdx = raw.indexOf(openTag)
  if (openIdx === -1) return { thinking: '', body: raw, thinkingComplete: true }

  const afterOpen = openIdx + openTag.length
  const closeIdx = raw.indexOf(closeTag, afterOpen)

  if (closeIdx === -1) {
    return {
      thinking: raw.slice(afterOpen).trim(),
      body: '',
      thinkingComplete: false,
    }
  }

  return {
    thinking: raw.slice(afterOpen, closeIdx).trim(),
    body: (raw.slice(0, openIdx) + raw.slice(closeIdx + closeTag.length)).trim(),
    thinkingComplete: true,
  }
}

export function AiAnalysisPanel({ metar, icao, lang, onClose }: AiAnalysisPanelProps) {
  const { t } = useTranslation()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [thinkOpen, setThinkOpen] = useState(false)
  const abortRef = useRef(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const fetchAnalysis = useCallback(async () => {
    setContent('')
    setLoading(true)
    setError(null)
    setThinkOpen(false)
    abortRef.current = false

    try {
      for await (const chunk of streamAiAnalysis(metar, icao, lang)) {
        if (abortRef.current) break
        setContent((prev) => prev + chunk)
      }
    } catch (err) {
      if (!abortRef.current) {
        setError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      setLoading(false)
    }
  }, [metar, icao, lang])

  useEffect(() => {
    fetchAnalysis()
    return () => {
      abortRef.current = true
    }
  }, [fetchAnalysis])

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [content])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const { thinking, body, thinkingComplete } = useMemo(() => parseThinkBlocks(content), [content])

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative w-full max-w-2xl h-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-2xl border-l border-zinc-200/50 dark:border-zinc-800/50 flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{t('aiPanel.title')}</h2>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{icao} · METAR</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!loading && (
                <button
                  type="button"
                  onClick={fetchAnalysis}
                  title={t('aiPanel.regenerate')}
                  className="p-2 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                title={t('common.close')}
                className="p-2 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* METAR source */}
          <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800/60 shrink-0">
            <pre className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 whitespace-pre-wrap break-words leading-relaxed">
              {metar}
            </pre>
          </div>

          {/* Content */}
          <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-5">
            {error ? (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-4">
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                <button
                  type="button"
                  onClick={fetchAnalysis}
                  className="mt-2 text-xs font-medium text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                >
                  {t('aiPanel.retry')}
                </button>
              </div>
            ) : content ? (
              <div>
                {/* Think block */}
                {thinking && (
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={() => setThinkOpen(!thinkOpen)}
                      className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    >
                      <svg
                        className={`w-3 h-3 transition-transform ${thinkOpen ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="font-medium">
                        {t('aiPanel.thinking')}
                        {!thinkingComplete && '...'}
                      </span>
                    </button>
                    {thinkOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 ml-1 pl-3 border-l-2 border-zinc-200 dark:border-zinc-700 overflow-hidden"
                      >
                        <p className="text-xs leading-relaxed text-zinc-400 dark:text-zinc-500 whitespace-pre-wrap">
                          {thinking}
                          {!thinkingComplete && loading && (
                            <span className="inline-block w-1.5 h-3 ml-0.5 bg-zinc-300 dark:bg-zinc-600 animate-pulse rounded-sm align-text-bottom" />
                          )}
                        </p>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Main body */}
                {body && (
                  <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-table:text-xs prose-th:px-3 prose-th:py-1.5 prose-td:px-3 prose-td:py-1.5 prose-table:border prose-table:border-zinc-200 prose-table:dark:border-zinc-700 prose-th:bg-zinc-50 prose-th:dark:bg-zinc-800/60 prose-thead:border-b prose-thead:border-zinc-200 prose-thead:dark:border-zinc-700 prose-tr:border-b prose-tr:border-zinc-100 prose-tr:dark:border-zinc-800 prose-p:leading-relaxed prose-li:leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
                  </div>
                )}

                {/* Still in thinking phase, no body yet */}
                {!body && !thinkingComplete && loading && (
                  <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 mt-2">
                    <div className="w-3.5 h-3.5 border-2 border-indigo-300 dark:border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">{t('aiPanel.generatingResponse')}</span>
                  </div>
                )}

                {/* Cursor for streaming body */}
                {body && loading && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 bg-indigo-400 dark:bg-indigo-500 animate-pulse rounded-sm align-text-bottom" />
                )}
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400 dark:text-zinc-500">
                <div className="w-8 h-8 border-2 border-indigo-300 dark:border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">{t('aiPanel.analyzingMetar')}</span>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800/60 shrink-0">
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {t('aiPanel.disclaimer')}
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  )
}
