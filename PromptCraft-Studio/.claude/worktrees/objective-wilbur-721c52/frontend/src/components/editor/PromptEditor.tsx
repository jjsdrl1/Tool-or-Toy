import { useState } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { estimateTokens } from '../../utils/tokenEstimator'

export function PromptEditor() {
  const systemPrompt = useEditorStore((s) => s.systemPrompt)
  const userPrompt = useEditorStore((s) => s.userPrompt)
  const setSystemPrompt = useEditorStore((s) => s.setSystemPrompt)
  const setUserPrompt = useEditorStore((s) => s.setUserPrompt)

  const [systemOpen, setSystemOpen] = useState(true)

  const sysChars = systemPrompt.length
  const sysTokens = estimateTokens(systemPrompt)
  const userChars = userPrompt.length
  const userTokens = estimateTokens(userPrompt)
  const totalTokens = sysTokens + userTokens

  return (
    <div className="flex flex-col gap-4">
      {/* ─── System Prompt (collapsible) ─────────────────────────── */}
      <div className="pc-card overflow-hidden flex-shrink-0">
        <button
          onClick={() => setSystemOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-brand-50/60 to-white hover:bg-gray-50 text-sm font-medium text-ink-soft transition-colors"
        >
          <span className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-wider bg-brand-100 text-brand-700 rounded px-1.5 py-0.5">
              SYS
            </span>
            System Prompt
            <span className="text-xs text-ink-subtle font-normal">（可选）</span>
          </span>
          <span className="text-ink-subtle text-xs">{systemOpen ? '收起' : '展开'}</span>
        </button>

        {systemOpen && (
          <>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="输入 System Prompt，可使用 {{变量名}} 插入变量…"
              rows={6}
              className="w-full resize-none px-4 py-3 text-sm text-ink placeholder-ink-subtle focus:outline-none font-mono leading-relaxed bg-white"
            />
            <div className="flex items-center justify-end gap-3 px-4 py-1.5 border-t border-gray-100 bg-gradient-to-r from-brand-50/60 to-white text-xs text-ink-subtle">
              <span>{sysChars} 字符</span>
              <span>≈ {sysTokens} tokens</span>
            </div>
          </>
        )}
      </div>

      {/* ─── User Prompt (main edit area) ─── */}
      <div className="pc-card overflow-hidden flex flex-col">
        <div className="flex items-center px-4 py-2.5 bg-gradient-to-r from-brand-50/60 to-white border-b border-gray-100 flex-shrink-0">
          <span className="flex items-center gap-2 text-sm font-medium text-ink-soft">
            <span className="text-[10px] font-semibold tracking-wider bg-accent-100 text-accent-700 rounded px-1.5 py-0.5">
              USR
            </span>
            User Prompt
            <span className="text-red-500 ml-0.5">*</span>
          </span>
        </div>

        <textarea
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          placeholder="输入 User Prompt，可使用 {{变量名}} 插入变量…"
          rows={10}
          className="w-full resize-y min-h-[200px] px-4 py-3 text-sm text-ink placeholder-ink-subtle focus:outline-none font-mono leading-relaxed bg-white"
        />

        <div className="flex items-center justify-between px-4 py-1.5 border-t border-gray-100 bg-gradient-to-r from-brand-50/60 to-white text-xs text-ink-subtle flex-shrink-0">
          <span>User: {userChars} 字符 ≈ {userTokens} tokens</span>
          <span className="font-medium text-ink-muted">合计 ≈ {totalTokens} tokens</span>
        </div>
      </div>
    </div>
  )
}
