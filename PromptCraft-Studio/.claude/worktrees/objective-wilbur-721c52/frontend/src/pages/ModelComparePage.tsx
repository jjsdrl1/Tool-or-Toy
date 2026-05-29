import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { listVersions } from '../api/versionApi'
import { getPresets } from '../api/presetApi'
import { getProject } from '../api/projectApi'
import { batchCompareApi } from '../api/batchCompareApi'
import TestCaseTable from '../components/batch/TestCaseTable'
import { useToast } from '../components/common/Toast'
import { Breadcrumbs } from '../components/common/Breadcrumbs'
import { VersionVO } from '../types/version'
import { ApiPresetVO } from '../types/preset'
import { ProjectVO } from '../types/project'
import { BatchCompareGroup, BatchCompareResultVO } from '../types/batchCompare'
import { parseVariables } from '../utils/variableParser'

type Tab = 'cases' | 'compare'

const STATUS_LABEL: Record<string, string> = {
  pending: '等待中',
  running: '运行中',
  done: '已完成',
  failed: '失败',
}

// ── Unified pill colors using the new design tokens ────────────
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-gray-100 text-ink-muted border border-gray-200',
  running: 'bg-brand-50 text-brand-700 border border-brand-100',
  done:    'bg-emerald-50 text-emerald-700 border border-emerald-100',
  failed:  'bg-red-50 text-red-700 border border-red-100',
}

// Stable zebra colors for matrix columns (alternating, low-contrast surfaces).
// Using the same hue family so columns feel balanced rather than rainbow-noisy.
const COLUMN_TINTS = [
  'bg-white',
  'bg-gray-50/60',
]
const COLUMN_HEADER_TINTS = [
  'bg-brand-50/70 text-brand-800',
  'bg-steel-50/70 text-steel-700',
]

export default function ModelComparePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectId = Number(id)
  const { toast } = useToast()

  const [project, setProject] = useState<ProjectVO | null>(null)
  const [tab, setTab] = useState<Tab>('cases')
  const [versions, setVersions] = useState<VersionVO[]>([])
  const [presets, setPresets] = useState<ApiPresetVO[]>([])
  const [selectedCaseIds, setSelectedCaseIds] = useState<number[]>([])

  const [fixedVersionId, setFixedVersionId] = useState<number | ''>('')
  const [selectedPresetIds, setSelectedPresetIds] = useState<Set<number>>(new Set())
  const [concurrency, setConcurrency] = useState(2)
  const [submitting, setSubmitting] = useState(false)

  const [compareGroups, setCompareGroups] = useState<BatchCompareGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('')
  const [compareResult, setCompareResult] = useState<BatchCompareResultVO | null>(null)
  const [expandedCell, setExpandedCell] = useState<string | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    getProject(projectId).then(setProject).catch(() => {})
    listVersions(projectId).then(setVersions)
    getPresets().then(setPresets)
    refreshGroups()
  }, [projectId])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  function refreshGroups() {
    batchCompareApi.listByProject(projectId).then(groups => {
      // 只展示模型对比（compare_presets）类型，避免与历史"版本对比"混在一起
      setCompareGroups(groups.filter(g => g.mode === 'compare_presets'))
    })
  }

  function startPolling(groupId: number) {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const result = await batchCompareApi.getResult(groupId)
      setCompareResult(result)
      if (result.status === 'done' || result.status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = null
        refreshGroups()
      }
    }, 2000)
  }

  async function runCompare() {
    if (!fixedVersionId) { toast.error('请选择固定的 Prompt 版本'); return }
    if (selectedPresetIds.size < 2) { toast.error('至少选择 2 个模型配置'); return }
    if (selectedCaseIds.length === 0) { toast.error('请先在「测试样例」Tab 选择样例'); return }

    setSubmitting(true)
    try {
      const group = await batchCompareApi.create({
        projectId,
        mode: 'compare_presets',
        fixedVersionId: fixedVersionId as number,
        presetIds: Array.from(selectedPresetIds),
        testCaseIds: selectedCaseIds,
        concurrency,
      })
      setSelectedGroupId(group.id)
      setCompareResult(null)
      setTab('compare')
      startPolling(group.id)
      toast.success('模型对比任务已创建')
    } catch (e) {
      toast.error('创建对比任务失败: ' + String(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function loadResult(groupId: number) {
    setSelectedGroupId(groupId)
    const result = await batchCompareApi.getResult(groupId)
    setCompareResult(result)
    if (result.status === 'running' || result.status === 'pending') {
      startPolling(groupId)
    } else if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  function togglePresetId(pid: number) {
    setSelectedPresetIds(prev => {
      const next = new Set(prev)
      if (next.has(pid)) next.delete(pid)
      else next.add(pid)
      return next
    })
  }

  const selectedVersion = versions.find(v => v.id === fixedVersionId)
  const templateVariables = selectedVersion
    ? Array.from(new Set([
        ...parseVariables(selectedVersion.systemPrompt ?? ''),
        ...parseVariables(selectedVersion.userPrompt ?? ''),
      ]))
    : []

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      <Breadcrumbs
        items={[
          { label: '我的项目', to: '/projects' },
          { label: project?.name ?? '项目详情', to: `/projects/${id}` },
          { label: '模型对比' },
        ]}
        actions={
          <>
            <button
              onClick={() => navigate(`/projects/${id}/editor`)}
              className="pc-btn-ghost"
            >
              返回编辑器
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/batch-test`)}
              className="pc-btn-ghost"
            >
              批量测试
            </button>
          </>
        }
      />

      <main className="max-w-6xl w-full mx-auto p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">模型对比</h1>
          <p className="text-sm text-ink-muted leading-relaxed">
            固定一个 Prompt 版本，在多个模型配置上批量运行测试样例，横向对比输出质量、延迟、Token 消耗
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 gap-1">
          {(['cases', 'compare'] as Tab[]).map(t => {
            const labels: Record<Tab, string> = {
              cases: '配置与样例',
              compare: '对比结果',
            }
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t
                    ? 'border-brand-700 text-brand-700'
                    : 'border-transparent text-ink-muted hover:text-ink-soft'
                }`}
              >
                {labels[t]}
              </button>
            )
          })}
        </div>

        {/* Tab: 配置与样例 */}
        {tab === 'cases' && (
          <div className="flex flex-col gap-4">
            {/* Config card */}
            <div className="pc-card p-5 flex flex-col gap-4">
              {/* Fixed version */}
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm font-medium text-ink-soft w-32 shrink-0">
                  固定 Prompt 版本
                </label>
                <select
                  value={fixedVersionId}
                  onChange={e => setFixedVersionId(e.target.value ? Number(e.target.value) : '')}
                  className="pc-input flex-1 max-w-md py-1.5"
                >
                  <option value="">选择 Prompt 版本</option>
                  {versions.map(v => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNo} - {v.note?.slice(0, 20) ?? '无备注'}
                      {v.status === 'stable' ? ' ★' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Multi-select presets */}
              <div className="flex items-start gap-3 flex-wrap">
                <label className="text-sm font-medium text-ink-soft w-32 shrink-0 mt-1.5">
                  参与对比的模型
                </label>
                <div className="flex flex-wrap gap-2 flex-1">
                  {presets.filter(p => p.enabled).length === 0 ? (
                    <span className="text-sm text-ink-subtle py-1.5">
                      暂无可用模型配置，请先在「模型配置」中添加
                    </span>
                  ) : (
                    presets.filter(p => p.enabled).map(p => {
                      const active = selectedPresetIds.has(p.id)
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-all ${
                            active
                              ? 'border-brand-400 bg-brand-50 text-brand-700 shadow-card'
                              : 'border-gray-200 bg-white text-ink-soft hover:border-brand-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => togglePresetId(p.id)}
                            className="rounded text-brand-700 accent-brand-700"
                          />
                          {p.name} <span className="text-ink-subtle">({p.modelName})</span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Concurrency + Submit */}
              <div className="flex items-center gap-4 pt-4 border-t border-gray-100 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-ink-soft">
                    并发数: <span className="text-brand-700 font-semibold">{concurrency}</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={concurrency}
                    onChange={e => setConcurrency(Number(e.target.value))}
                    className="w-24 accent-brand-700"
                  />
                </div>
                <span className="text-xs text-ink-muted">
                  已选 {selectedCaseIds.length} 条样例
                  {selectedPresetIds.size > 0 && (
                    <span className="ml-2">
                      · {selectedPresetIds.size} 个模型 ={' '}
                      <span className="font-semibold text-ink-soft">
                        {selectedCaseIds.length * selectedPresetIds.size} 次请求
                      </span>
                    </span>
                  )}
                </span>
                <button
                  onClick={runCompare}
                  disabled={
                    submitting ||
                    !fixedVersionId ||
                    selectedPresetIds.size < 2 ||
                    selectedCaseIds.length === 0
                  }
                  className="ml-auto pc-btn-primary"
                >
                  {submitting ? '提交中…' : '开始模型对比'}
                </button>
              </div>
            </div>

            {/* Test case table */}
            <TestCaseTable
              projectId={projectId}
              onSelectionChange={setSelectedCaseIds}
              templateVariables={templateVariables}
            />
          </div>
        )}

        {/* Tab: 对比结果 */}
        {tab === 'compare' && (
          <div className="flex flex-col gap-4">
            {/* History selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm font-medium text-ink-soft">历史对比任务</label>
              <select
                value={selectedGroupId}
                onChange={e => e.target.value && loadResult(Number(e.target.value))}
                className="pc-input py-1.5 min-w-[320px] max-w-md flex-1"
              >
                <option value="">选择对比任务</option>
                {compareGroups.map(g => (
                  <option key={g.id} value={g.id}>
                    #{g.id} {g.name} — {new Date(g.createdAt).toLocaleString()}
                    {g.status !== 'done' ? ` (${STATUS_LABEL[g.status]})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {compareResult ? (
              <div className="flex flex-col gap-4">
                {/* Status header */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-base font-semibold text-ink">
                    {compareResult.name}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[compareResult.status]}`}>
                    {STATUS_LABEL[compareResult.status]}
                  </span>
                  <span className="text-xs text-ink-subtle">
                    {new Date(compareResult.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Column stats — 每个模型的成功/失败计数 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {compareResult.columns.map(col => (
                    <div
                      key={col.batchRunId}
                      className="pc-card px-4 py-3 flex flex-col gap-1.5"
                    >
                      <span className="font-semibold text-ink text-sm truncate" title={col.presetLabel}>
                        {col.presetLabel}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[col.status]}`}>
                          {STATUS_LABEL[col.status]}
                        </span>
                        <span className="text-xs text-emerald-600 font-medium">✓ {col.successCount}</span>
                        <span className="text-xs text-red-600 font-medium">✗ {col.failedCount}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Matrix table — 行=样例，列=模型 */}
                <div className="overflow-x-auto pc-card">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-4 py-3 text-left font-semibold text-ink-soft whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-100">
                          样例名
                        </th>
                        {compareResult.columns.map((col, idx) => (
                          <th
                            key={col.batchRunId}
                            className={`px-4 py-3 text-left font-semibold whitespace-nowrap min-w-[220px] border-r border-gray-100 last:border-r-0 ${
                              COLUMN_HEADER_TINTS[idx % COLUMN_HEADER_TINTS.length]
                            }`}
                          >
                            {col.presetLabel}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {compareResult.rows.map((row, rowIdx) => (
                        <tr
                          key={row.testCaseId}
                          className={`border-b border-gray-100 last:border-b-0 ${
                            rowIdx % 2 === 1 ? 'bg-gray-50/40' : ''
                          }`}
                        >
                          <td className={`px-4 py-3 font-medium whitespace-nowrap sticky left-0 z-10 border-r border-gray-100 text-ink ${
                            rowIdx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'
                          }`}>
                            {row.testCaseName}
                          </td>
                          {row.cells.map((cell, idx) => {
                            const cellKey = `${row.testCaseId}-${cell.batchRunId}`
                            const isExpanded = expandedCell === cellKey
                            const isFailed = cell.status === 'failed'
                            const tint = COLUMN_TINTS[idx % COLUMN_TINTS.length]
                            return (
                              <td
                                key={idx}
                                className={`px-4 py-3 align-top border-r border-gray-100 last:border-r-0 ${
                                  isFailed
                                    ? 'bg-red-50/60'
                                    : rowIdx % 2 === 1
                                    ? ''  // inherit row tint
                                    : tint
                                }`}
                              >
                                {cell.status === 'pending' || cell.status === 'running' ? (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[cell.status]}`}>
                                    {STATUS_LABEL[cell.status]}
                                  </span>
                                ) : isFailed ? (
                                  <span className="text-red-700 text-xs leading-relaxed">
                                    {cell.errorMessage}
                                  </span>
                                ) : (
                                  <div className="flex flex-col gap-1.5">
                                    <div
                                      className={`text-ink text-xs cursor-pointer whitespace-pre-wrap leading-relaxed transition-all ${
                                        isExpanded ? '' : 'line-clamp-3'
                                      }`}
                                      onClick={() => setExpandedCell(isExpanded ? null : cellKey)}
                                      title={isExpanded ? '点击折叠' : '点击展开'}
                                    >
                                      {cell.outputSummary ?? '—'}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-ink-subtle">
                                      {cell.latencyMs != null && (
                                        <span className="px-1.5 py-0.5 rounded bg-gray-100">
                                          {cell.latencyMs}ms
                                        </span>
                                      )}
                                      {cell.inputTokens != null && (
                                        <span className="px-1.5 py-0.5 rounded bg-gray-100">
                                          in: {cell.inputTokens}
                                        </span>
                                      )}
                                      {cell.outputTokens != null && (
                                        <span className="px-1.5 py-0.5 rounded bg-gray-100">
                                          out: {cell.outputTokens}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-ink-subtle text-sm">
                {selectedGroupId === ''
                  ? '请先在「配置与样例」Tab 配置参数并发起对比，或从上方下拉框选择历史任务'
                  : '加载中…'}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
