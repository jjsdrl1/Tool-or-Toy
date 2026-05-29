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
  anthropic:   'bg-accent-100 text-accent-700',
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
    <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-brand-50/50 via-white to-white border-b-2 border-brand-100 flex-wrap flex-shrink-0">
      {/* Preset selector */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-xs text-ink-subtle whitespace-nowrap uppercase tracking-wider font-medium">
          模型
        </span>
        {presets.length === 0 ? (
          <span className="text-xs text-ink-subtle italic">
            暂无配置，请先在「模型配置」中添加
          </span>
        ) : (
          <select
            value={selectedId ?? ''}
            onChange={(e) => handleChange(Number(e.target.value))}
            className="flex-1 min-w-0 max-w-xs pc-input py-1.5"
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
            className={`text-xs rounded-full px-2.5 py-0.5 font-medium whitespace-nowrap ${
              PROVIDER_COLORS[selected.provider.toLowerCase()] ?? 'bg-gray-100 text-ink-muted'
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
          className="inline-flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg shadow-card transition-all"
        >
          <span className="inline-block w-2 h-2 bg-white rounded-sm" />
          停止
        </button>
      ) : (
        <button
          disabled={!canRun}
          onClick={() => selectedId && onRun(selectedId)}
          className="pc-btn-accent py-1.5"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M6.3 3.7a1 1 0 0 1 1.04-.09l9 5a1 1 0 0 1 0 1.78l-9 5A1 1 0 0 1 6 14.5v-10a1 1 0 0 1 .3-.8Z" />
          </svg>
          运行
        </button>
      )}
    </div>
  )
}
