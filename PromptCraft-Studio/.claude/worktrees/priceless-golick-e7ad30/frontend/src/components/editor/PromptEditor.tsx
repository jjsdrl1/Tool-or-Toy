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
    <div className="flex flex-col gap-4 h-full">
      {/* System Prompt */}
      <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white">
        <button
          onClick={() => setSystemOpen((o) => !o)}
          className="flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
        >
          <span className="flex items-center gap-2">
            <span className="text-xs bg-purple-100 text-purple-700 rounded px-1.5 py-0.5 font-semibold">
              SYS
            </span>
            System Prompt
            <span className="text-xs text-gray-400 font-normal">（可选）</span>
          </span>
          <span className="text-gray-400 text-xs">{systemOpen ? '▲' : '▼'}</span>
        </button>

        {systemOpen && (
          <>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="输入 System Prompt，可使用 {{变量名}} 插入变量…"
              rows={6}
              className="w-full resize-none px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none font-mono leading-relaxed"
            />
            <div className="flex items-center justify-end gap-3 px-4 py-1.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
              <span>{sysChars} 字符</span>
              <span>≈ {sysTokens} tokens</span>
            </div>
          </>
        )}
      </div>

      {/* User Prompt */}
      <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white flex-1">
        <div className="flex items-center px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <span className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 font-semibold">
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
          className="flex-1 w-full resize-none px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none font-mono leading-relaxed min-h-[200px]"
        />

        <div className="flex items-center justify-between px-4 py-1.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
          <span>User: {userChars} 字符 ≈ {userTokens} tokens</span>
          <span className="font-medium text-gray-500">合计 ≈ {totalTokens} tokens</span>
        </div>
      </div>
    </div>
  )
}
