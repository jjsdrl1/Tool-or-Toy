import { useEffect, useRef, useState } from 'react'
import type { RunStats } from '../../types/run'
import { useToast } from '../common/Toast'

interface Props {
  output: string
  stats: RunStats | null
  isStreaming: boolean
  error: string | null
  runRecordId: number | null
  onClear: () => void
}

export function RunOutputPanel({
  output, stats, isStreaming, error, runRecordId, onClear,
}: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState(false) // expanded = tall view
  const { toast } = useToast()

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [output, isStreaming])

  const isEmpty = !output && !error && !isStreaming

  const handleCopy = async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      toast.success('已复制输出')
    } catch {
      toast.error('复制失败')
    }
  }

  return (
    <div className="pc-card overflow-hidden flex flex-col flex-shrink-0">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-brand-50/60 to-white border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm font-medium text-ink-soft">
          <span className="text-[10px] font-semibold tracking-wider bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5">
            OUT
          </span>
          模型输出
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-brand-700">
              <span className="inline-block w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
              生成中…
            </span>
          )}
          {stats && !isStreaming && (
            <span className="pc-pill-success ml-1">完成</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isEmpty && output && (
            <button
              onClick={handleCopy}
              className="text-xs text-ink-subtle hover:text-brand-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              title="复制输出"
            >
              复制
            </button>
          )}
          {!isEmpty && (
            <button
              onClick={onClear}
              className="text-xs text-ink-subtle hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
            >
              清除
            </button>
          )}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-ink-subtle hover:text-brand-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            title={expanded ? '默认高度' : '放大查看'}
          >
            {expanded ? '收缩' : '放大'}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-xs text-ink-subtle hover:text-brand-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            title={collapsed ? '展开' : '折叠'}
          >
            {collapsed ? '展开' : '折叠'}
          </button>
        </div>
      </div>

      {/* ── Output area ──────────────────────────────────────────── */}
      {!collapsed && (
        <div
          className={[
            'overflow-y-auto px-4 py-3 transition-[max-height] duration-300',
            expanded ? 'min-h-[280px] max-h-[640px]' : 'min-h-[160px] max-h-[360px]',
          ].join(' ')}
        >
          {isEmpty ? (
            <div className="h-full flex items-center justify-center text-sm text-ink-subtle py-8">
              点击「运行」后输出将在此处实时显示
            </div>
          ) : error ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-3 font-mono whitespace-pre-wrap">
              ⚠ {error}
            </div>
          ) : (
            <>
              <pre className="text-sm text-ink font-mono whitespace-pre-wrap break-words leading-relaxed">
                {output}
                {isStreaming && (
                  <span className="inline-block w-0.5 h-4 bg-brand-500 animate-pulse ml-0.5 align-middle" />
                )}
              </pre>
              <div ref={bottomRef} />
            </>
          )}
        </div>
      )}

      {/* ── Stats footer ─────────────────────────────────────────── */}
      {stats && !collapsed && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 border-t border-gray-100 bg-gradient-to-r from-brand-50/60 to-white text-xs text-ink-muted">
          <span>模型: <strong className="text-ink-soft">{stats.model}</strong></span>
          <span>输入 {stats.inputTokens} tokens</span>
          <span>输出 {stats.outputTokens} tokens</span>
          <span>耗时 {stats.latencyMs} ms</span>
          {runRecordId && (
            <span className="ml-auto text-ink-subtle">记录 #{runRecordId}</span>
          )}
        </div>
      )}
    </div>
  )
}
