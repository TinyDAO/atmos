import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import html2canvas from 'html2canvas-pro'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { streamAiAnalysis, AiAnalysisAuthError } from '../../utils/streamAiAnalysis'
import { dispatchRefetchPoints } from '../../hooks/usePoints'
import { useTranslation } from '../../hooks/useTranslation'
import { SITE_NAME, SITE_URL } from '../../config/site'
import { ShareLogo } from '../ShareLogo'

interface AiAnalysisPanelProps {
  metar: string
  taf?: string | null
  icao: string
  lang: 'en' | 'zh'
  /** For wind/synoptic context in AI prompt */
  hemisphere?: 'north' | 'south' | null
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

export function AiAnalysisPanel({ metar, taf, icao, lang, hemisphere, onClose }: AiAnalysisPanelProps) {
  const { t } = useTranslation()
  const { address } = useAccount()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [thinkOpen, setThinkOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareLoading, setShareLoading] = useState<'download' | 'copy' | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<'copied' | 'downloaded' | null>(null)
  const abortRef = useRef(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const shareCardRef = useRef<HTMLDivElement>(null)

  const fetchAnalysis = useCallback(async () => {
    setContent('')
    setLoading(true)
    setError(null)
    setThinkOpen(false)
    abortRef.current = false

    try {
      const gen = streamAiAnalysis(metar, icao, lang, taf, address ?? null, hemisphere ?? null)
      let fromCache = false
      while (true) {
        const { value, done } = await gen.next()
        if (done) {
          fromCache = value === true
          break
        }
        if (abortRef.current) break
        setContent((prev) => prev + value)
      }
      dispatchRefetchPoints()
      if (!abortRef.current && !fromCache) {
        toast.success(t('aiPanel.pointDeducted'))
      }
    } catch (err) {
      if (!abortRef.current) {
        if (err instanceof AiAnalysisAuthError) {
          setError(
            err.code === 'AUTH_REQUIRED'
              ? t('aiPanel.loginRequired')
              : t('aiPanel.insufficientPoints').replace('{{points}}', String(err.points ?? 0)),
          )
        } else {
          setError(err instanceof Error ? err.message : String(err))
        }
      }
    } finally {
      setLoading(false)
    }
  }, [metar, taf, icao, lang, address, hemisphere, t])

  const handleShareDownload = useCallback(async () => {
    if (!shareCardRef.current) return
    setShareLoading('download')
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2, useCORS: false, backgroundColor: '#ffffff', logging: false,
      })
      const link = document.createElement('a')
      link.download = `ai-analysis-${icao}-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      console.error('Failed to capture image:', e)
    } finally {
      setShareLoading(null)
    }
  }, [icao])

  const handleShareCopy = useCallback(async () => {
    if (!shareCardRef.current) return
    setCopyFeedback(null)
    setShareLoading('copy')
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2, useCORS: false, backgroundColor: '#ffffff', logging: false,
      })
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) return
      if (navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          setCopyFeedback('copied')
          setTimeout(() => setCopyFeedback(null), 2000)
          return
        } catch { /* fallback to download */ }
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `ai-analysis-${icao}-${Date.now()}.png`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
      setCopyFeedback('downloaded')
      setTimeout(() => setCopyFeedback(null), 2000)
    } catch (e) {
      console.error('Failed to copy image:', e)
    } finally {
      setShareLoading(null)
    }
  }, [icao])

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
              {!loading && body && (
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  title={t('aiPanel.share')}
                  className="p-2 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                  </svg>
                </button>
              )}
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

          {/* METAR & TAF source */}
          <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800/60 shrink-0 space-y-2 max-h-32 overflow-y-auto">
            <div>
              <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 mb-0.5">METAR</p>
              <pre className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 whitespace-pre-wrap break-words leading-relaxed">{metar}</pre>
            </div>
            {taf && (
              <div>
                <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 mb-0.5">TAF</p>
                <pre className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 whitespace-pre-wrap break-words leading-relaxed">{taf}</pre>
              </div>
            )}
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

          {/* Share modal overlay */}
          <AnimatePresence>
            {shareOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                onClick={() => setShareOpen(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl shadow-xl w-[min(520px,100%-2rem)] max-h-[85%] overflow-hidden flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between shrink-0">
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      {t('aiPanel.shareTitle')}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShareOpen(false)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
                    <div
                      ref={shareCardRef}
                      className="w-full bg-white p-4 text-zinc-800"
                    >
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-200">
                        <div className="flex items-center gap-1.5">
                          <ShareLogo className="w-6 h-6 shrink-0" />
                          <span className="text-base font-semibold text-zinc-900">{SITE_NAME}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500">{SITE_URL.replace(/^https?:\/\//, '')}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                          </svg>
                        </div>
                        <span className="text-sm font-semibold text-zinc-900">{t('aiPanel.title')} · {icao}</span>
                      </div>
                      <div className="mb-3 py-1.5 px-2 bg-zinc-50 rounded border border-zinc-100">
                        <p className="text-[10px] text-zinc-500 mb-0.5 font-medium">METAR</p>
                        <p className="text-[11px] font-mono text-zinc-700 leading-tight break-all">{metar}</p>
                      </div>
                      <div className="prose prose-sm prose-zinc max-w-none text-[12px] leading-relaxed prose-p:my-1.5 prose-table:text-[11px] prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-table:border prose-table:border-zinc-200 prose-th:bg-zinc-50 prose-thead:border-b prose-thead:border-zinc-200 prose-tr:border-b prose-tr:border-zinc-100">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
                      </div>
                      <div className="mt-3 pt-2 border-t border-zinc-100">
                        <p className="text-[9px] text-zinc-400">{t('aiPanel.disclaimer')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 pt-2 flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleShareDownload}
                      disabled={!!shareLoading}
                      className="flex-1 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {shareLoading === 'download' ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                          {t('share.downloading')}
                        </>
                      ) : (
                        t('share.downloadImage')
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleShareCopy}
                      disabled={!!shareLoading}
                      className="flex-1 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {shareLoading === 'copy' ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                          {t('share.copying')}
                        </>
                      ) : copyFeedback === 'copied' ? (
                        t('share.copied')
                      ) : copyFeedback === 'downloaded' ? (
                        t('share.downloaded')
                      ) : (
                        t('share.copyImage')
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  )
}
