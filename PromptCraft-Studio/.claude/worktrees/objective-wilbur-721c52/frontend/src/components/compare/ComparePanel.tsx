import { useEffect, useRef } from 'react'
import type { RunStats } from '../../types/run'

interface Props {
  label: string
  output: string
  stats: RunStats | null
  isStreaming: boolean
  error: string | null
  onCancel: () => void
  /** Optional ref forwarded to the scrollable output container, for linked scrolling */
  scrollRef?: React.RefObject<HTMLDivElement | null>
}

export function ComparePanel({
  label,
  output,
  stats,
  isStreaming,
  error,
  onCancel,
  scrollRef,
}: Props) {
  const internalRef = useRef<HTMLDivElement | null>(null)
  const containerRef = scrollRef ?? internalRef

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (isStreaming && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [output, isStreaming])

  const isEmpty = !output && !error && !isStreaming

  return (
    <div className="flex flex-col pc-card overflow-hidden min-h-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <span>{label}</span>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-indigo-500">
              <span className="inline-block w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              流式中…
            </span>
          )}
        </div>
        {isStreaming && (
          <button
            onClick={onCancel}
            className="text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            取消
          </button>
        )}
      </div>

      {/* Output area */}
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className="flex-1 overflow-y-auto px-4 py-3 min-h-[200px] max-h-[420px]"
      >
        {isEmpty ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400 py-10">
            点击「同时运行」后输出将在此处实时显示
          </div>
        ) : error ? (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-3 font-mono whitespace-pre-wrap">
            ⚠ {error}
          </div>
        ) : (
          <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap break-words leading-relaxed">
            {output}
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-indigo-500 animate-pulse ml-0.5 align-middle" />
            )}
          </pre>
        )}
      </div>

      {/* Stats footer */}
      {stats && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex-shrink-0">
          <span>
            模型: <strong className="text-gray-700">{stats.model}</strong>
          </span>
          <span>输入 {stats.inputTokens} tokens</span>
          <span>输出 {stats.outputTokens} tokens</span>
          <span>耗时 {stats.latencyMs} ms</span>
        </div>
      )}
    </div>
  )
}
