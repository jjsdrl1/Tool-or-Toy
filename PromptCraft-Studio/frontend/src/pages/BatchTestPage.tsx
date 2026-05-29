import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { listVersions } from '../api/versionApi'
import { getPresets } from '../api/presetApi'
import { getProject } from '../api/projectApi'
import { batchRunApi } from '../api/batchRunApi'
import TestCaseTable from '../components/batch/TestCaseTable'
import { useToast } from '../components/common/Toast'
import { Breadcrumbs } from '../components/common/Breadcrumbs'
import { VersionVO } from '../types/version'
import { ApiPresetVO } from '../types/preset'
import { ProjectVO } from '../types/project'
import { BatchRun, BatchRunStatusVO } from '../types/batchRun'
import { parseVariables } from '../utils/variableParser'

type Tab = 'cases' | 'progress' | 'matrix'

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
  const navigate = useNavigate()
  const projectId = Number(id)
  const { toast } = useToast()

  const [project, setProject] = useState<ProjectVO | null>(null)
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

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    getProject(projectId).then(setProject).catch(() => {})
    listVersions(projectId).then(setVersions)
    getPresets().then(setPresets)
    batchRunApi.listBatchRuns(projectId).then(runs => {
      setDoneBatchRuns(runs.filter(r => r.status === 'done'))
    })
  }, [projectId])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
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

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      <Breadcrumbs
        items={[
          { label: '我的项目', to: '/projects' },
          { label: project?.name ?? '项目详情', to: `/projects/${id}` },
          { label: '批量测试' },
        ]}
        actions={
          <button
            onClick={() => navigate(`/projects/${id}/editor`)}
            className="pc-btn-ghost"
          >
            返回编辑器
          </button>
        }
      />

      <main className="max-w-6xl w-full mx-auto p-6 flex flex-col gap-6">
      {/* Tabs */}
      <div className="flex border-b border-gray-100 gap-1">
        {(['cases', 'progress', 'matrix'] as Tab[]).map(t => {
          const labels: Record<Tab, string> = {
            cases: '测试样例',
            progress: '运行进度',
            matrix: '结果矩阵',
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
            <div className="text-center py-12 text-ink-subtle">
              请选择一个已完成的批量任务查看结果
            </div>
          )}
        </div>
      )}
      </main>
    </div>
  )
}
