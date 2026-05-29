import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { listVersions } from '../api/versionApi'
import { getPresets } from '../api/presetApi'
import { batchRunApi } from '../api/batchRunApi'
import { batchCompareApi } from '../api/batchCompareApi'
import TestCaseTable from '../components/batch/TestCaseTable'
import { useToast } from '../components/common/Toast'
import { VersionVO } from '../types/version'
import { ApiPresetVO } from '../types/preset'
import { BatchRun, BatchRunStatusVO } from '../types/batchRun'
import {
  BatchCompareGroup,
  BatchCompareResultVO,
  CompareMode,
} from '../types/batchCompare'
import { parseVariables } from '../utils/variableParser'

type Tab = 'cases' | 'progress' | 'matrix' | 'compare'

const STATUS_LABEL: Record<string, string> = {
  pending: '等待中',
  running: '运行中',
  done: '已完成',
  failed: '失败',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  running: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

export default function BatchTestPage() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)
  const { toast } = useToast()

  const [tab, setTab] = useState<Tab>('cases')
  const [versions, setVersions] = useState<VersionVO[]>([])
  const [presets, setPresets] = useState<ApiPresetVO[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<number | ''>('')
  const [selectedPresetId, setSelectedPresetId] = useState<number | ''>('')
  const [concurrency, setConcurrency] = useState(2)
  const [selectedCaseIds, setSelectedCaseIds] = useState<number[]>([])

  const [currentBatchRun, setCurrentBatchRun] = useState<BatchRun | null>(null)
  const [batchStatus, setBatchStatus] = useState<BatchRunStatusVO | null>(null)
  const [doneBatchRuns, setDoneBatchRuns] = useState<BatchRun[]>([])
  const [selectedDoneId, setSelectedDoneId] = useState<number | ''>('')
  const [matrixStatus, setMatrixStatus] = useState<BatchRunStatusVO | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // --- Compare state ---
  const [compareMode, setCompareMode] = useState<CompareMode>('compare_versions')
  const [fixedVersionId, setFixedVersionId] = useState<number | ''>('')
  const [fixedPresetId, setFixedPresetId] = useState<number | ''>('')
  const [selectedVersionIds, setSelectedVersionIds] = useState<Set<number>>(new Set())
  const [selectedPresetIds, setSelectedPresetIds] = useState<Set<number>>(new Set())
  const [compareConcurrency, setCompareConcurrency] = useState(2)
  const [compareSubmitting, setCompareSubmitting] = useState(false)

  const [compareGroups, setCompareGroups] = useState<BatchCompareGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('')
  const [compareResult, setCompareResult] = useState<BatchCompareResultVO | null>(null)
  const [expandedCell, setExpandedCell] = useState<string | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const comparePollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    listVersions(projectId).then(setVersions)
    getPresets().then(setPresets)
    batchRunApi.listBatchRuns(projectId).then(runs => {
      setDoneBatchRuns(runs.filter(r => r.status === 'done'))
    })
    batchCompareApi.listByProject(projectId).then(setCompareGroups)
  }, [projectId])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (comparePollRef.current) clearInterval(comparePollRef.current)
    }
  }, [])

  function startPolling(batchRunId: number) {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const status = await batchRunApi.getBatchRunStatus(batchRunId)
      setBatchStatus(status)
      if (status.status === 'done' || status.status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = null
        if (status.status === 'done') {
          setDoneBatchRuns(prev => [status as BatchRun, ...prev])
        }
      }
    }, 2000)
  }

  function startComparePolling(groupId: number) {
    if (comparePollRef.current) clearInterval(comparePollRef.current)
    comparePollRef.current = setInterval(async () => {
      const result = await batchCompareApi.getResult(groupId)
      setCompareResult(result)
      if (result.status === 'done' || result.status === 'failed') {
        if (comparePollRef.current) clearInterval(comparePollRef.current)
        comparePollRef.current = null
        batchCompareApi.listByProject(projectId).then(setCompareGroups)
      }
    }, 2000)
  }

  async function runBatch() {
    if (!selectedVersionId || !selectedPresetId || selectedCaseIds.length === 0) return
    setSubmitting(true)
    try {
      const batchRun = await batchRunApi.createBatchRun({
        projectId,
        versionId: selectedVersionId as number,
        presetId: selectedPresetId as number,
        testCaseIds: selectedCaseIds,
        concurrency,
      })
      setCurrentBatchRun(batchRun)
      setBatchStatus(null)
      setTab('progress')
      startPolling(batchRun.id)
    } catch (e) {
      toast.error('创建批量运行失败: ' + String(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function runCompare() {
    if (selectedCaseIds.length === 0) {
      toast.error('请先在「测试样例」Tab 中选择样例')
      return
    }

    if (compareMode === 'compare_versions') {
      if (!fixedPresetId) { toast.error('请选择固定的模型配置'); return }
      if (selectedVersionIds.size < 2) { toast.error('至少选择 2 个版本'); return }
    } else {
      if (!fixedVersionId) { toast.error('请选择固定的 Prompt 版本'); return }
      if (selectedPresetIds.size < 2) { toast.error('至少选择 2 个模型配置'); return }
    }

    setCompareSubmitting(true)
    try {
      const group = await batchCompareApi.create({
        projectId,
        mode: compareMode,
        fixedVersionId: compareMode === 'compare_presets' ? (fixedVersionId as number) : undefined,
        fixedPresetId: compareMode === 'compare_versions' ? (fixedPresetId as number) : undefined,
        versionIds: compareMode === 'compare_versions' ? Array.from(selectedVersionIds) : undefined,
        presetIds: compareMode === 'compare_presets' ? Array.from(selectedPresetIds) : undefined,
        testCaseIds: selectedCaseIds,
        concurrency: compareConcurrency,
      })
      setSelectedGroupId(group.id)
      startComparePolling(group.id)
      toast.success('对比任务已创建')
    } catch (e) {
      toast.error('创建对比任务失败: ' + String(e))
    } finally {
      setCompareSubmitting(false)
    }
  }

  async function loadCompareResult(groupId: number) {
    setSelectedGroupId(groupId)
    const result = await batchCompareApi.getResult(groupId)
    setCompareResult(result)
    if (result.status === 'running') {
      startComparePolling(groupId)
    }
  }

  async function loadMatrix(batchRunId: number) {
    setSelectedDoneId(batchRunId)
    const status = await batchRunApi.getBatchRunStatus(batchRunId)
    setMatrixStatus(status)
  }

  const selectedVersion = versions.find(v => v.id === selectedVersionId)
  const templateVariables = selectedVersion
    ? Array.from(new Set([
        ...parseVariables(selectedVersion.systemPrompt ?? ''),
        ...parseVariables(selectedVersion.userPrompt ?? ''),
      ]))
    : []

  const doneCount = batchStatus ? (batchStatus.successCount + batchStatus.failedCount) : 0
  const totalCount = batchStatus?.totalCount ?? 0
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  const successPct = totalCount > 0 ? Math.round((batchStatus?.successCount ?? 0) / totalCount * 100) : 0
  const failedPct = totalCount > 0 ? Math.round((batchStatus?.failedCount ?? 0) / totalCount * 100) : 0

  function toggleVersionId(vid: number) {
    setSelectedVersionIds(prev => {
      const next = new Set(prev)
      if (next.has(vid)) next.delete(vid)
      else next.add(vid)
      return next
    })
  }

  function togglePresetId(pid: number) {
    setSelectedPresetIds(prev => {
      const next = new Set(prev)
      if (next.has(pid)) next.delete(pid)
      else next.add(pid)
      return next
    })
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">批量测试</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {(['cases', 'progress', 'matrix', 'compare'] as Tab[]).map(t => {
          const labels: Record<Tab, string> = {
            cases: '测试样例',
            progress: '运行进度',
            matrix: '结果矩阵',
            compare: '对比测试',
          }
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {labels[t]}
            </button>
          )
        })}
      </div>

      {/* Tab: 测试样例 */}
      {tab === 'cases' && (
        <div className="flex flex-col gap-4">
          {/* Config bar */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600 whitespace-nowrap">版本</label>
              <select
                value={selectedVersionId}
                onChange={e => setSelectedVersionId(e.target.value ? Number(e.target.value) : '')}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm min-w-[140px]"
              >
                <option value="">选择版本</option>
                {versions.map(v => (
                  <option key={v.id} value={v.id}>
                    v{v.versionNo} - {v.note?.slice(0, 20) ?? '无备注'}
                    {v.status === 'stable' ? ' ★' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Preset</label>
              <select
                value={selectedPresetId}
                onChange={e => setSelectedPresetId(e.target.value ? Number(e.target.value) : '')}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm min-w-[140px]"
              >
                <option value="">选择 Preset</option>
                {presets.filter(p => p.enabled).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.modelName})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600 whitespace-nowrap">
                并发数: {concurrency}
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={concurrency}
                onChange={e => setConcurrency(Number(e.target.value))}
                className="w-24"
              />
            </div>
            <button
              onClick={runBatch}
              disabled={
                !selectedVersionId ||
                !selectedPresetId ||
                selectedCaseIds.length === 0 ||
                submitting
              }
              className="ml-auto px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? '提交中...' : `批量运行选中 (${selectedCaseIds.length})`}
            </button>
          </div>

          <TestCaseTable
            projectId={projectId}
            onSelectionChange={setSelectedCaseIds}
            templateVariables={templateVariables}
          />
        </div>
      )}

      {/* Tab: 运行进度 */}
      {tab === 'progress' && (
        <div className="flex flex-col gap-4">
          {!currentBatchRun ? (
            <div className="text-center py-12 text-gray-400">
              尚未发起批量运行，请在「测试样例」Tab 选择样例后点击「批量运行选中」
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center gap-4 flex-wrap">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      STATUS_COLOR[batchStatus?.status ?? currentBatchRun.status]
                    }`}
                  >
                    {STATUS_LABEL[batchStatus?.status ?? currentBatchRun.status]}
                  </span>
                  <span className="text-sm text-gray-600">
                    版本 ID: {currentBatchRun.versionId}
                  </span>
                  <span className="text-sm text-gray-600">
                    Preset ID: {currentBatchRun.presetId}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(currentBatchRun.createdAt).toLocaleString()}
                  </span>
                  {batchStatus?.status === 'done' && (
                    <button
                      onClick={() => batchRunApi.exportResult(currentBatchRun.id)}
                      className="ml-auto px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      导出结果 CSV
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                {batchStatus && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>
                        已完成 {doneCount} / {totalCount}
                        {batchStatus.successCount > 0 && (
                          <span className="text-green-600 ml-2">✓ {batchStatus.successCount} 成功</span>
                        )}
                        {batchStatus.failedCount > 0 && (
                          <span className="text-red-600 ml-2">✗ {batchStatus.failedCount} 失败</span>
                        )}
                      </span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${successPct}%` }}
                      />
                      <div
                        className="h-full bg-red-400 transition-all"
                        style={{ width: `${failedPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Item list */}
              {batchStatus && (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-600 font-medium">样例名</th>
                        <th className="px-4 py-2 text-left text-gray-600 font-medium">状态</th>
                        <th className="px-4 py-2 text-left text-gray-600 font-medium">输出摘要 / 错误</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {batchStatus.items.map(item => (
                        <tr
                          key={item.id}
                          className={item.status === 'failed' ? 'bg-red-50' : ''}
                        >
                          <td className="px-4 py-2 font-medium">{item.testCaseName}</td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[item.status]}`}
                            >
                              {STATUS_LABEL[item.status]}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-600 max-w-xs truncate">
                            {item.status === 'failed'
                              ? <span className="text-red-600">{item.errorMessage}</span>
                              : item.outputSummary ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab: 结果矩阵 */}
      {tab === 'matrix' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600">选择已完成的任务</label>
            <select
              value={selectedDoneId}
              onChange={e => e.target.value && loadMatrix(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm min-w-[240px]"
            >
              <option value="">请选择</option>
              {doneBatchRuns.map(r => (
                <option key={r.id} value={r.id}>
                  #{r.id} — {new Date(r.createdAt).toLocaleString()} ({r.totalCount} 条)
                </option>
              ))}
            </select>
            {matrixStatus && (
              <button
                onClick={() => batchRunApi.exportResult(matrixStatus.id)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                导出结果 CSV
              </button>
            )}
          </div>

          {matrixStatus && (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">样例名</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">状态</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">输出摘要</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {matrixStatus.items.map(item => (
                    <tr
                      key={item.id}
                      className={item.status === 'failed' ? 'bg-red-50' : 'hover:bg-gray-50'}
                    >
                      <td className="px-4 py-2 font-medium whitespace-nowrap">
                        {item.testCaseName}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[item.status]}`}
                        >
                          {STATUS_LABEL[item.status]}
                        </span>
                      </td>
                      <td className="px-4 py-2 max-w-sm">
                        {item.status === 'failed' ? (
                          <span className="text-red-600 text-xs">{item.errorMessage}</span>
                        ) : (
                          <span
                            className="block truncate relative group cursor-help"
                            title={item.outputSummary}
                          >
                            {item.outputSummary ?? '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!matrixStatus && selectedDoneId === '' && (
            <div className="text-center py-12 text-gray-400">
              请选择一个已完成的批量任务查看结果
            </div>
          )}
        </div>
      )}

      {/* Tab: 对比测试 */}
      {tab === 'compare' && (
        <div className="flex flex-col gap-6">
          {/* Mode selector */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-6 mb-4">
              <span className="text-sm font-medium text-gray-700">对比模式:</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={compareMode === 'compare_versions'}
                  onChange={() => setCompareMode('compare_versions')}
                  className="text-blue-600"
                />
                <span className="text-sm">
                  固定模型，对比 Prompt 版本
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={compareMode === 'compare_presets'}
                  onChange={() => setCompareMode('compare_presets')}
                  className="text-blue-600"
                />
                <span className="text-sm">
                  固定 Prompt，对比模型配置
                </span>
              </label>
            </div>

            {compareMode === 'compare_versions' ? (
              <div className="flex flex-col gap-4">
                {/* Fixed preset */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-600 w-24 shrink-0">固定模型</label>
                  <select
                    value={fixedPresetId}
                    onChange={e => setFixedPresetId(e.target.value ? Number(e.target.value) : '')}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm min-w-[200px]"
                  >
                    <option value="">选择模型配置</option>
                    {presets.filter(p => p.enabled).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.modelName})
                      </option>
                    ))}
                  </select>
                </div>
                {/* Multi-select versions */}
                <div className="flex items-start gap-2">
                  <label className="text-sm font-medium text-gray-600 w-24 shrink-0 mt-1">选择版本</label>
                  <div className="flex flex-wrap gap-2">
                    {versions.map(v => (
                      <label
                        key={v.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm cursor-pointer transition-colors ${
                          selectedVersionIds.has(v.id)
                            ? 'border-blue-400 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedVersionIds.has(v.id)}
                          onChange={() => toggleVersionId(v.id)}
                          className="rounded text-blue-600"
                        />
                        v{v.versionNo}
                        {v.note ? ` - ${v.note.slice(0, 15)}` : ''}
                        {v.status === 'stable' ? ' ★' : ''}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Fixed version */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-600 w-24 shrink-0">固定版本</label>
                  <select
                    value={fixedVersionId}
                    onChange={e => setFixedVersionId(e.target.value ? Number(e.target.value) : '')}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm min-w-[200px]"
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
                <div className="flex items-start gap-2">
                  <label className="text-sm font-medium text-gray-600 w-24 shrink-0 mt-1">选择模型</label>
                  <div className="flex flex-wrap gap-2">
                    {presets.filter(p => p.enabled).map(p => (
                      <label
                        key={p.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm cursor-pointer transition-colors ${
                          selectedPresetIds.has(p.id)
                            ? 'border-purple-400 bg-purple-50 text-purple-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPresetIds.has(p.id)}
                          onChange={() => togglePresetId(p.id)}
                          className="rounded text-purple-600"
                        />
                        {p.name} ({p.modelName})
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Concurrency + Submit */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600">
                  并发数: {compareConcurrency}
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={compareConcurrency}
                  onChange={e => setCompareConcurrency(Number(e.target.value))}
                  className="w-24"
                />
              </div>
              <span className="text-xs text-gray-400">
                已选 {selectedCaseIds.length} 条样例
                {selectedCaseIds.length === 0 && (
                  <span className="text-amber-500 ml-1">（请先在「测试样例」Tab 选择）</span>
                )}
              </span>
              <button
                onClick={runCompare}
                disabled={compareSubmitting || selectedCaseIds.length === 0}
                className="ml-auto px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {compareSubmitting ? '提交中...' : '开始对比测试'}
              </button>
            </div>
          </div>

          {/* History selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600">查看历史对比</label>
            <select
              value={selectedGroupId}
              onChange={e => e.target.value && loadCompareResult(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm min-w-[300px]"
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

          {/* Compare result matrix */}
          {compareResult && (
            <div className="flex flex-col gap-3">
              {/* Status header */}
              <div className="flex items-center gap-3">
                <span className="text-base font-semibold text-gray-800">{compareResult.name}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[compareResult.status]}`}>
                  {STATUS_LABEL[compareResult.status]}
                </span>
              </div>

              {/* Column stats */}
              <div className="flex flex-wrap gap-3">
                {compareResult.columns.map(col => (
                  <div
                    key={col.batchRunId}
                    className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-xs flex flex-col gap-1 min-w-[140px]"
                  >
                    <span className="font-semibold text-gray-800">
                      {compareResult.mode === 'compare_versions' ? col.versionLabel : col.presetLabel}
                    </span>
                    <span className="text-gray-500">
                      {compareResult.mode === 'compare_versions' ? col.presetLabel : col.versionLabel}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded ${STATUS_COLOR[col.status]}`}>
                        {STATUS_LABEL[col.status]}
                      </span>
                      <span className="text-green-600">✓{col.successCount}</span>
                      <span className="text-red-600">✗{col.failedCount}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Matrix table */}
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600 whitespace-nowrap sticky left-0 bg-gray-50 z-10">
                        样例名
                      </th>
                      {compareResult.columns.map(col => (
                        <th
                          key={col.batchRunId}
                          className="px-4 py-2 text-left font-medium text-gray-600 whitespace-nowrap min-w-[200px]"
                        >
                          <div className="flex flex-col">
                            <span>
                              {compareResult.mode === 'compare_versions' ? col.versionLabel : col.presetLabel}
                            </span>
                            <span className="text-xs font-normal text-gray-400">
                              {compareResult.mode === 'compare_versions' ? col.presetLabel : col.versionLabel}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {compareResult.rows.map(row => (
                      <tr key={row.testCaseId} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium whitespace-nowrap sticky left-0 bg-white z-10">
                          {row.testCaseName}
                        </td>
                        {row.cells.map((cell, idx) => {
                          const cellKey = `${row.testCaseId}-${cell.batchRunId}`
                          const isExpanded = expandedCell === cellKey
                          return (
                            <td
                              key={idx}
                              className={`px-4 py-2 align-top border-l border-gray-100 ${
                                cell.status === 'failed' ? 'bg-red-50' : ''
                              }`}
                            >
                              {cell.status === 'pending' || cell.status === 'running' ? (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[cell.status]}`}>
                                  {STATUS_LABEL[cell.status]}
                                </span>
                              ) : cell.status === 'failed' ? (
                                <span className="text-red-600 text-xs">{cell.errorMessage}</span>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  <div
                                    className={`text-gray-700 text-xs cursor-pointer ${
                                      isExpanded ? '' : 'line-clamp-3'
                                    }`}
                                    onClick={() => setExpandedCell(isExpanded ? null : cellKey)}
                                  >
                                    {cell.outputSummary ?? '—'}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                    {cell.latencyMs != null && <span>{cell.latencyMs}ms</span>}
                                    {cell.inputTokens != null && <span>in:{cell.inputTokens}</span>}
                                    {cell.outputTokens != null && <span>out:{cell.outputTokens}</span>}
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
          )}

          {!compareResult && selectedGroupId === '' && (
            <div className="text-center py-12 text-gray-400">
              配置对比参数后点击「开始对比测试」，或从历史记录中选择查看
            </div>
          )}
        </div>
      )}
    </div>
  )
}
