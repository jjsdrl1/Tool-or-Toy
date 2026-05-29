import { useEffect, useState } from 'react'
import * as api from '../api/presetApi'
import type { ApiPresetVO, ApiPresetDTO } from '../types/preset'
import { useToast } from '../components/common/Toast'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { Breadcrumbs } from '../components/common/Breadcrumbs'

// ─── Provider config ──────────────────────────────────────────────────────────

const PROVIDER_OPTIONS = [
  { value: 'openai',      label: 'OpenAI',                url: 'https://api.openai.com/v1',                          model: 'gpt-4o-mini' },
  { value: 'anthropic',   label: 'Anthropic',             url: 'https://api.anthropic.com',                          model: 'claude-sonnet-4-20250514' },
  { value: 'deepseek',    label: 'DeepSeek',              url: 'https://api.deepseek.com/v1',                        model: 'deepseek-chat' },
  { value: 'qwen',        label: 'Qwen (阿里)',            url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',  model: 'qwen-plus' },
  { value: 'moonshot',    label: 'Moonshot / Kimi',       url: 'https://api.moonshot.cn/v1',                         model: 'moonshot-v1-8k' },
  { value: 'doubao',      label: '火山方舟 / 豆包',         url: 'https://ark.cn-beijing.volces.com/api/v3',           model: 'doubao-seed-1-6-250615' },
  { value: 'hunyuan',     label: '腾讯混元 / Hunyuan',      url: 'https://api.hunyuan.cloud.tencent.com/v1',           model: 'hunyuan-turbos-latest' },
  { value: 'zhipu',       label: '智谱 GLM / Zhipu',        url: 'https://open.bigmodel.cn/api/paas/v4',               model: 'glm-4-flash' },
  { value: 'minimax',     label: 'MiniMax',               url: 'https://api.minimax.io/v1',                          model: 'MiniMax-M2' },
  { value: 'stepfun',     label: '阶跃星辰 / StepFun',      url: 'https://api.stepfun.ai/step_plan/v1',                model: 'step-3.5-flash' },
  { value: 'siliconflow', label: '硅基流动 / SiliconFlow',   url: 'https://api.siliconflow.cn/v1',                      model: 'deepseek-ai/DeepSeek-V3' },
  { value: 'openrouter',  label: 'OpenRouter',            url: 'https://openrouter.ai/api/v1',                       model: 'openai/gpt-4o-mini' },
  { value: 'azure',       label: 'Azure OpenAI',          url: '',                                                   model: '' },
  { value: 'ollama',      label: 'Ollama',                url: 'http://localhost:11434/v1',                          model: 'llama3' },
  { value: 'lmstudio',    label: 'LM Studio',             url: 'http://localhost:1234/v1',                           model: 'local-model' },
  { value: 'custom',      label: '自定义',                  url: '',                                                   model: '' },
]

const PROVIDER_COLORS: Record<string, string> = {
  openai:      'bg-green-100 text-green-700',
  anthropic:   'bg-purple-100 text-purple-700',
  deepseek:    'bg-blue-100 text-blue-700',
  qwen:        'bg-orange-100 text-orange-700',
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
  custom:      'bg-gray-100 text-gray-600',
}

function providerLabel(p: string) {
  return PROVIDER_OPTIONS.find((o) => o.value === p)?.label ?? p
}

function providerColor(p: string) {
  return PROVIDER_COLORS[p.toLowerCase()] ?? 'bg-gray-100 text-gray-600'
}

// ─── Form state ───────────────────────────────────────────────────────────────

const DEFAULT_FORM: ApiPresetDTO = {
  name: '',
  provider: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  modelName: '',
  temperature: 0.7,
  maxTokens: 1024,
  enabled: true,
}

type TestState = {
  loading: boolean
  success?: boolean
  latencyMs?: number
  message?: string
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ModelPresetPage() {
  const { toast } = useToast()
  const [presets, setPresets] = useState<ApiPresetVO[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ApiPresetVO | null>(null)
  const [form, setForm] = useState<ApiPresetDTO>(DEFAULT_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Delete confirm
  const [deleteConfirmPreset, setDeleteConfirmPreset] = useState<ApiPresetVO | null>(null)

  // Test result per preset id
  const [testStates, setTestStates] = useState<Record<number, TestState>>({})

  // Modal-level test state (for edit mode test)
  const [modalTest, setModalTest] = useState<TestState | null>(null)

  const loadPresets = async () => {
    setLoading(true)
    try {
      setPresets(await api.getPresets())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPresets() }, [])

  // ── Open modal ──
  const openCreate = () => {
    setEditTarget(null)
    setForm(DEFAULT_FORM)
    setFormError('')
    setModalTest(null)
    setFormOpen(true)
  }

  const openEdit = (p: ApiPresetVO) => {
    setEditTarget(p)
    setForm({
      name:        p.name,
      provider:    p.provider,
      baseUrl:     p.baseUrl ?? '',
      apiKey:      '',        // don't prefill
      modelName:   p.modelName,
      temperature: p.temperature,
      maxTokens:   p.maxTokens,
      enabled:     p.enabled,
    })
    setFormError('')
    setModalTest(null)
    setFormOpen(true)
  }

  // ── Provider change auto-fills baseUrl and modelName (modelName only if empty) ──
  const handleProviderChange = (prov: string) => {
    const opt = PROVIDER_OPTIONS.find((o) => o.value === prov)
    setForm((f) => ({
      ...f,
      provider: prov,
      baseUrl: opt?.url ?? '',
      modelName: f.modelName.trim() ? f.modelName : (opt?.model ?? ''),
    }))
  }

  // ── Submit modal ──
  const handleSubmit = async () => {
    if (!form.name.trim())      { setFormError('请填写配置名称'); return }
    if (!form.provider.trim())  { setFormError('请选择 Provider'); return }
    if (!form.modelName.trim()) { setFormError('请填写模型名称'); return }
    setFormError('')
    setSubmitting(true)
    try {
      if (editTarget) {
        await api.updatePreset(editTarget.id, form)
      } else {
        await api.createPreset(form)
      }
      toast.success('配置已保存')
      setFormOpen(false)
      await loadPresets()
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Delete ──
  const handleDeleteClick = (p: ApiPresetVO) => {
    setDeleteConfirmPreset(p)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmPreset) return
    const target = deleteConfirmPreset
    setDeleteConfirmPreset(null)
    try {
      await api.deletePreset(target.id)
      toast.success('配置已删除')
      await loadPresets()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  // ── Toggle enabled (table row) ──
  const handleToggleEnabled = async (p: ApiPresetVO) => {
    try {
      await api.updatePreset(p.id, {
        name:        p.name,
        provider:    p.provider,
        baseUrl:     p.baseUrl ?? '',
        apiKey:      '',    // don't change key
        modelName:   p.modelName,
        temperature: p.temperature,
        maxTokens:   p.maxTokens,
        enabled:     !p.enabled,
      })
      await loadPresets()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '操作失败')
    }
  }

  // ── Test (table row) ──
  const handleTest = async (p: ApiPresetVO) => {
    setTestStates((prev) => ({ ...prev, [p.id]: { loading: true } }))
    try {
      const res = await api.testPreset(p.id)
      setTestStates((prev) => ({ ...prev, [p.id]: { loading: false, ...res } }))
    } catch (e: unknown) {
      setTestStates((prev) => ({
        ...prev,
        [p.id]: { loading: false, success: false, latencyMs: 0, message: e instanceof Error ? e.message : '请求失败' },
      }))
    }
  }

  // ── Test (modal, edit mode only) ──
  const handleModalTest = async () => {
    if (!editTarget) {
      setModalTest({ loading: false, success: false, latencyMs: 0, message: '请先保存配置后再测试' })
      return
    }
    setModalTest({ loading: true })
    try {
      const res = await api.testPreset(editTarget.id)
      setModalTest({ loading: false, ...res })
    } catch (e: unknown) {
      setModalTest({ loading: false, success: false, latencyMs: 0, message: e instanceof Error ? e.message : '请求失败' })
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-gray-50">
      <Breadcrumbs
        items={[{ label: '模型配置' }]}
        actions={
          <button onClick={openCreate} className="pc-btn-primary">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10 3.75a.75.75 0 0 1 .75.75v4.75H15.5a.75.75 0 0 1 0 1.5h-4.75v4.75a.75.75 0 0 1-1.5 0V10.75H4.5a.75.75 0 0 1 0-1.5h4.75V4.5A.75.75 0 0 1 10 3.75Z" clipRule="evenodd" />
            </svg>
            新建配置
          </button>
        }
      />

      <main className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">
        <p className="text-sm text-ink-muted">
          管理模型 API 配置，支持 OpenAI、Anthropic、DeepSeek 等多家国内外 Provider
        </p>

        {/* Table */}
        <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">加载中…</div>
          ) : presets.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              还没有配置，点击「新建配置」添加
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">名称</th>
                  <th className="text-left px-5 py-3 font-medium">Provider</th>
                  <th className="text-left px-5 py-3 font-medium">Base URL</th>
                  <th className="text-left px-5 py-3 font-medium">模型名</th>
                  <th className="text-left px-5 py-3 font-medium">API Key</th>
                  <th className="text-center px-5 py-3 font-medium">状态</th>
                  <th className="text-right px-5 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {presets.map((p) => {
                  const ts = testStates[p.id]
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${providerColor(p.provider)}`}>
                          {providerLabel(p.provider)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 font-mono text-xs">
                        {p.baseUrl ? (p.baseUrl.length > 40 ? p.baseUrl.slice(0, 40) + '…' : p.baseUrl) : '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-700 font-mono text-xs">{p.modelName}</td>
                      <td className="px-5 py-3 text-gray-500 font-mono text-xs">{p.apiKeyMasked}</td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => handleToggleEnabled(p)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            p.enabled ? 'bg-indigo-500' : 'bg-gray-300'
                          }`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                            p.enabled ? 'translate-x-4' : 'translate-x-1'
                          }`} />
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {/* Test result inline */}
                          {ts && !ts.loading && (
                            <span className={`text-xs ${ts.success ? 'text-green-600' : 'text-red-500'}`}>
                              {ts.success ? `✅ 成功 ${ts.latencyMs}ms` : `❌ ${ts.message}`}
                            </span>
                          )}
                          <button
                            onClick={() => handleTest(p)}
                            disabled={ts?.loading}
                            className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50 transition-colors"
                          >
                            {ts?.loading ? '测试中…' : '测试连接'}
                          </button>
                          <button
                            onClick={() => openEdit(p)}
                            className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteClick(p)}
                            className="text-xs px-2.5 py-1 rounded border border-gray-200 text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      <ConfirmDialog
        isOpen={deleteConfirmPreset !== null}
        title="删除配置"
        message={`确定要删除配置「${deleteConfirmPreset?.name ?? ''}」吗？`}
        confirmText="删除"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmPreset(null)}
      />

      {/* Modal */}
      {formOpen && (
        <PresetModal
          editTarget={editTarget}
          form={form}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          onProviderChange={handleProviderChange}
          onSubmit={handleSubmit}
          onClose={() => setFormOpen(false)}
          onTest={handleModalTest}
          testState={modalTest}
          error={formError}
          submitting={submitting}
        />
      )}
    </div>
  )
}

// ─── Modal component ──────────────────────────────────────────────────────────

interface ModalProps {
  editTarget: ApiPresetVO | null
  form: ApiPresetDTO
  onChange: (patch: Partial<ApiPresetDTO>) => void
  onProviderChange: (p: string) => void
  onSubmit: () => void
  onClose: () => void
  onTest: () => void
  testState: TestState | null
  error: string
  submitting: boolean
}

function PresetModal({
  editTarget, form, onChange, onProviderChange,
  onSubmit, onClose, onTest, testState, error, submitting,
}: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {editTarget ? '编辑配置' : '新建配置'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Name */}
        <Field label="配置名称" required>
          <input
            type="text" value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="例：GPT-4o Mini 生产环境"
            className={inputCls}
          />
        </Field>

        {/* Provider */}
        <Field label="Provider" required>
          <select
            value={form.provider}
            onChange={(e) => onProviderChange(e.target.value)}
            className={inputCls}
          >
            {PROVIDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        {/* Base URL */}
        <Field label="Base URL">
          <input
            type="text" value={form.baseUrl}
            onChange={(e) => onChange({ baseUrl: e.target.value })}
            placeholder="https://api.openai.com/v1"
            className={inputCls}
          />
        </Field>

        {/* API Key */}
        <Field label="API Key">
          <input
            type="password" value={form.apiKey ?? ''}
            onChange={(e) => onChange({ apiKey: e.target.value })}
            placeholder={editTarget ? '留空则不修改' : '请输入 API Key'}
            className={inputCls}
          />
        </Field>

        {/* Model Name */}
        <Field label="模型名称" required>
          <input
            type="text" value={form.modelName}
            onChange={(e) => onChange({ modelName: e.target.value })}
            placeholder="gpt-4o-mini"
            className={inputCls}
          />
        </Field>

        {/* Temperature */}
        <Field label={`Temperature (${form.temperature.toFixed(1)})`}>
          <input
            type="range" min={0} max={2} step={0.1}
            value={form.temperature}
            onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })}
            className="w-full accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>0 (确定)</span><span>1.0</span><span>2.0 (随机)</span>
          </div>
        </Field>

        {/* Max Tokens */}
        <Field label="Max Tokens">
          <input
            type="number" min={256} max={32768}
            value={form.maxTokens}
            onChange={(e) => onChange({ maxTokens: parseInt(e.target.value) || 1024 })}
            className={inputCls}
          />
        </Field>

        {/* Test connection (edit mode) */}
        <div className="flex items-center gap-3">
          <button
            onClick={onTest}
            disabled={testState?.loading}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50 transition-colors"
          >
            {testState?.loading ? '测试中…' : '测试连接'}
          </button>
          {testState && !testState.loading && (
            <span className={`text-sm ${testState.success ? 'text-green-600' : 'text-red-500'}`}>
              {testState.success
                ? `✅ 连接成功，耗时 ${testState.latencyMs}ms`
                : `❌ ${testState.message}`}
            </span>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            取消
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {submitting ? '保存中…' : editTarget ? '保存修改' : '创建配置'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, children }: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full'
