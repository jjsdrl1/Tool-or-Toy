import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { listVersions } from '../api/versionApi'
import { getPresets } from '../api/presetApi'
import { exportCode } from '../api/exportApi'
import CodePreview from '../components/export/CodePreview'
import { VersionVO } from '../types/version'
import { ApiPresetVO } from '../types/preset'
import { ExportResult } from '../types/export'

type Language = 'python' | 'typescript'

export default function CodeExportPage() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)

  const [versions, setVersions] = useState<VersionVO[]>([])
  const [presets, setPresets] = useState<ApiPresetVO[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<number | ''>('')
  const [selectedPresetId, setSelectedPresetId] = useState<number | ''>('')
  const [language, setLanguage] = useState<Language>('python')
  const [result, setResult] = useState<ExportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    listVersions(projectId).then(vs => {
      setVersions(vs)
      // default to stable version
      const stable = vs.find(v => v.status === 'stable')
      if (stable) setSelectedVersionId(stable.id)
      else if (vs.length > 0) setSelectedVersionId(vs[0].id)
    })
    getPresets().then(ps => {
      const enabled = ps.filter(p => p.enabled)
      setPresets(enabled)
      if (enabled.length > 0) setSelectedPresetId(enabled[0].id)
    })
  }, [projectId])

  const selectedPreset = presets.find(p => p.id === selectedPresetId)
  const isAnthropic = selectedPreset?.provider?.toLowerCase() === 'anthropic'

  // Compute the install hint based on language + provider
  const installCmd = language === 'python'
    ? (isAnthropic ? 'pip install anthropic' : 'pip install openai')
    : (isAnthropic ? 'npm install @anthropic-ai/sdk' : 'npm install openai')

  const envVarName = selectedPreset
    ? (selectedPreset.provider?.toLowerCase() === 'custom'
        ? 'API_KEY'
        : selectedPreset.provider?.toUpperCase() + '_API_KEY')
    : 'API_KEY'

  const generate = useCallback(async () => {
    if (!selectedVersionId || !selectedPresetId) return
    setLoading(true)
    setError(null)
    try {
      const res = await exportCode({
        versionId: selectedVersionId as number,
        presetId: selectedPresetId as number,
        language,
      })
      setResult(res)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [selectedVersionId, selectedPresetId, language])

  // Debounce: auto-generate 500ms after config change
  useEffect(() => {
    if (!selectedVersionId || !selectedPresetId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => generate(), 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [selectedVersionId, selectedPresetId, language, generate])

  const ext = language === 'python' ? '.py' : '.ts'
  const filename = result ? `${result.functionName}${ext}` : `export${ext}`
  const code = result?.code ?? ''

  return (
    <div className="max-w-7xl mx-auto p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-800">代码导出</h1>

      <div className="flex gap-6 items-start">
        {/* Left config panel */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-4">
            {/* Version select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">版本</label>
              <select
                value={selectedVersionId}
                onChange={e => setSelectedVersionId(e.target.value ? Number(e.target.value) : '')}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm"
              >
                <option value="">选择版本</option>
                {versions.map(v => (
                  <option key={v.id} value={v.id}>
                    v{v.versionNo}
                    {v.status === 'stable' ? ' ★ stable' : ''}
                    {v.note ? ` — ${v.note.slice(0, 20)}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Preset select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">API Preset</label>
              <select
                value={selectedPresetId}
                onChange={e => setSelectedPresetId(e.target.value ? Number(e.target.value) : '')}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm"
              >
                <option value="">选择 Preset</option>
                {presets.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.provider} / {p.modelName})
                  </option>
                ))}
              </select>
              {selectedPreset && (
                <p className="text-xs text-gray-400">
                  SDK: {isAnthropic ? 'anthropic' : 'openai-compatible'}
                </p>
              )}
            </div>

            {/* Language tabs */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">语言</label>
              <div className="flex border border-gray-200 rounded overflow-hidden">
                {(['python', 'typescript'] as Language[]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
                      language === lang
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {lang === 'python' ? 'Python' : 'TypeScript'}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={generate}
              disabled={!selectedVersionId || !selectedPresetId || loading}
              className="w-full py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? '生成中...' : '生成代码'}
            </button>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded p-2">{error}</p>
            )}
          </div>

          {/* Install instructions */}
          {selectedPresetId && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col gap-2 text-xs text-gray-600">
              <p className="font-medium text-gray-700">使用说明</p>
              <p>
                运行前设置环境变量：
              </p>
              <code className="block bg-white border border-gray-200 rounded px-2 py-1 text-gray-800 text-xs break-all">
                export {envVarName}=your_key
              </code>
              <p className="font-medium text-gray-700 mt-1">安装依赖</p>
              <code className="block bg-white border border-gray-200 rounded px-2 py-1 text-gray-800 text-xs">
                {installCmd}
              </code>
            </div>
          )}
        </div>

        {/* Right code preview */}
        <div className="flex-1 min-w-0">
          <CodePreview
            code={code}
            language={language}
            filename={filename}
          />
        </div>
      </div>
    </div>
  )
}
