import { useEffect, useState } from 'react'
import { getPresets } from '../../api/presetApi'
import type { ApiPresetVO } from '../../types/preset'
import { useEditorStore } from '../../stores/editorStore'

interface Props {
  onRun: (presetId: number) => void
  onCancel: () => void
  isStreaming: boolean
}

const PROVIDER_COLORS: Record<string, string> = {
  openai:      'bg-green-100 text-green-700',
  anthropic:   'bg-orange-100 text-orange-700',
  deepseek:    'bg-blue-100 text-blue-700',
  qwen:        'bg-purple-100 text-purple-700',
  moonshot:    'bg-sky-100 text-sky-700',
  doubao:      'bg-red-100 text-red-700',
  hunyuan:     'bg-cyan-100 text-cyan-700',
  zhipu:       'bg-indigo-100 text-indigo-700',
  minimax:     'bg-pink-100 text-pink-700',
  stepfun:     'bg-amber-100 text-amber-700',
  siliconflow: 'bg-teal-100 text-teal-700',
  openrouter:  'bg-fuchsia-100 text-fuchsia-700',
  azure:       'bg-blue-100 text-blue-700',
  ollama:      'bg-gray-100 text-gray-600',
  lmstudio:    'bg-gray-100 text-gray-600',
}

export function ModelConfigBar({ onRun, onCancel, isStreaming }: Props) {
  const [presets, setPresets] = useState<ApiPresetVO[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const setSelectedPresetId = useEditorStore((s) => s.setSelectedPresetId)
  const userPrompt = useEditorStore((s) => s.userPrompt)

  useEffect(() => {
    getPresets()
      .then((list) => {
        const enabled = list.filter((p) => p.enabled)
        setPresets(enabled)
        if (enabled.length > 0 && selectedId === null) {
          setSelectedId(enabled[0].id)
          setSelectedPresetId(enabled[0].id)
        }
      })
      .catch(() => setPresets([]))
  }, [])

  const selected = presets.find((p) => p.id === selectedId)

  const handleChange = (id: number) => {
    setSelectedId(id)
    setSelectedPresetId(id)
  }

  const canRun = selectedId !== null && userPrompt.trim().length > 0 && !isStreaming

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 flex-wrap">
      {/* Preset selector */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-xs text-gray-500 whitespace-nowrap">模型配置</span>
        {presets.length === 0 ? (
          <span className="text-xs text-gray-400 italic">
            暂无配置，请先在「模型配置」中添加
          </span>
        ) : (
          <select
            value={selectedId ?? ''}
            onChange={(e) => handleChange(Number(e.target.value))}
            className="flex-1 min-w-0 max-w-xs border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.modelName}
              </option>
            ))}
          </select>
        )}

        {selected && (
          <span
            className={`text-xs rounded-full px-2 py-0.5 font-medium whitespace-nowrap ${
              PROVIDER_COLORS[selected.provider.toLowerCase()] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {selected.provider}
          </span>
        )}
      </div>

      {/* Run / Cancel button */}
      {isStreaming ? (
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
        >
          <span className="inline-block w-2 h-2 bg-white rounded-sm" />
          停止
        </button>
      ) : (
        <button
          disabled={!canRun}
          onClick={() => selectedId && onRun(selectedId)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
        >
          <span className="text-base leading-none">▶</span>
          运行
        </button>
      )}
    </div>
  )
}
