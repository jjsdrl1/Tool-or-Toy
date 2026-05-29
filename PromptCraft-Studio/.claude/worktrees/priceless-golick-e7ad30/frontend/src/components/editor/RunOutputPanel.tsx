import { useEffect, useRef } from 'react'
import type { RunStats } from '../../types/run'

interface Props {
  output: string
  stats: RunStats | null
  isStreaming: boolean
  error: string | null
  runRecordId: number | null
  onClear: () => void
}

export function RunOutputPanel({ output, stats, isStreaming, error, runRecordId, onClear }: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [output, isStreaming])

  const isEmpty = !output && !error && !isStreaming

  return (
    <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <span className="text-xs bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5 font-semibold">
            OUT
          </span>
          模型输出
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-indigo-500">
              <span className="inline-block w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              生成中…
            </span>
          )}
        </div>
        {!isEmpty && (
          <button
            onClick={onClear}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            清除
          </button>
        )}
      </div>

      {/* Output area */}
      <div className="min-h-[160px] max-h-[400px] overflow-y-auto px-4 py-3">
        {isEmpty ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400 py-8">
            点击「运行」后输出将在此处实时显示
          </div>
        ) : error ? (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-3 font-mono whitespace-pre-wrap">
            ⚠ {error}
          </div>
        ) : (
          <>
            <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap break-words leading-relaxed">
              {output}
              {isStreaming && (
                <span className="inline-block w-0.5 h-4 bg-indigo-500 animate-pulse ml-0.5 align-middle" />
              )}
            </pre>
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Stats footer */}
      {stats && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
          <span>模型: <strong className="text-gray-700">{stats.model}</strong></span>
          <span>输入 {stats.inputTokens} tokens</span>
          <span>输出 {stats.outputTokens} tokens</span>
          <span>耗时 {stats.latencyMs} ms</span>
          {runRecordId && (
            <span className="ml-auto text-gray-400">记录 #{runRecordId}</span>
          )}
        </div>
      )}
    </div>
  )
}
