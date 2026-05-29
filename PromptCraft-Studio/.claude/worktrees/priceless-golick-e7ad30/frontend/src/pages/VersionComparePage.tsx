import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getProject } from '../api/projectApi'
import { listVersions, diffVersions } from '../api/versionApi'
import { getPresets } from '../api/presetApi'
import { createCompare, updateWinner } from '../api/compareApi'
import type { ProjectVO } from '../types/project'
import type { VersionVO, DiffResult } from '../types/version'
import type { ApiPresetVO } from '../types/preset'
import { parseVariables } from '../utils/variableParser'
import { useStreamRun } from '../hooks/useStreamRun'
import { VersionDiffPanel } from '../components/version/VersionDiffPanel'
import { ComparePanel } from '../components/compare/ComparePanel'

export default function VersionComparePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const projectId = Number(id)

  // ── Data ──────────────────────────────────────────────────────────────────
  const [project, setProject] = useState<ProjectVO | null>(null)
  const [versions, setVersions] = useState<VersionVO[]>([])
  const [presets, setPresets] = useState<ApiPresetVO[]>([])

  // ── Version selection ─────────────────────────────────────────────────────
  const [versionAId, setVersionAId] = useState<number | null>(null)
  const [versionBId, setVersionBId] = useState<number | null>(null)

  // ── Shared config ─────────────────────────────────────────────────────────
  const [presetId, setPresetId] = useState<number | null>(null)
  const [variables, setVariables] = useState<Record<string, string>>({})

  // ── Diff ──────────────────────────────────────────────────────────────────
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
  const [showDiff, setShowDiff] = useState(false)
  const [diffLoading, setDiffLoading] = useState(false)

  // ── Compare session ───────────────────────────────────────────────────────
  const [compareId, setCompareId] = useState<number | null>(null)
  const [hasRun, setHasRun] = useState(false)

  // ── Annotation ────────────────────────────────────────────────────────────
  const [winner, setWinner] = useState<'a' | 'b' | 'tie' | null>(null)
  const [annotateReason, setAnnotateReason] = useState('')
  const [annotated, setAnnotated] = useState(false)
  const [annotating, setAnnotating] = useState(false)
  const [annotateError, setAnnotateError] = useState('')

  // ── Linked scroll ─────────────────────────────────────────────────────────
  const [linkedScroll, setLinkedScroll] = useState(false)
  const panelARef = useRef<HTMLDivElement | null>(null)
  const panelBRef = useRef<HTMLDivElement | null>(null)
  const isScrollingSyncRef = useRef(false)

  // ── Streams ───────────────────────────────────────────────────────────────
  const streamA = useStreamRun()
  const streamB = useStreamRun()

  // ── Derived ───────────────────────────────────────────────────────────────
  const versionA = versions.find((v) => v.id === versionAId)
  const versionB = versions.find((v) => v.id === versionBId)

  const detectedVars = (() => {
    const setA = parseVariables(
      (versionA?.systemPrompt ?? '') + ' ' + (versionA?.userPrompt ?? '')
    )
    const setB = parseVariables(
      (versionB?.systemPrompt ?? '') + ' ' + (versionB?.userPrompt ?? '')
    )
    return [...new Set([...setA, ...setB])]
  })()

  const bothVersionsSelected =
    versionAId !== null && versionBId !== null && versionAId !== versionBId

  const bothDone =
    hasRun &&
    !streamA.isStreaming &&
    !streamB.isStreaming &&
    (!!streamA.output || !!streamB.output || !!streamA.error || !!streamB.error)

  const canRun = bothVersionsSelected && presetId !== null

  // ── Load data on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    getProject(projectId).then(setProject).catch(() => {})
    getPresets()
      .then((list) => {
        const enabled = list.filter((p) => p.enabled)
        setPresets(enabled)
        if (enabled.length > 0) setPresetId(enabled[0].id)
      })
      .catch(() => {})
    listVersions(projectId)
      .then((list) => {
        setVersions(list)
        const sorted = [...list].sort((a, b) => b.versionNo - a.versionNo)
        const qA = searchParams.get('a') ? Number(searchParams.get('a')) : null
        const qB = searchParams.get('b') ? Number(searchParams.get('b')) : null
        const initA = qA && list.find((v) => v.id === qA) ? qA : sorted[0]?.id ?? null
        const initB = qB && list.find((v) => v.id === qB) ? qB : sorted[1]?.id ?? null
        setVersionAId(initA)
        setVersionBId(initB)
      })
      .catch(() => {})
  }, [id])

  // ── Fetch diff when both versions selected ────────────────────────────────
  useEffect(() => {
    if (!bothVersionsSelected) {
      setDiffResult(null)
      return
    }
    setDiffLoading(true)
    diffVersions(versionAId!, versionBId!)
      .then((d) => setDiffResult(d))
      .catch(() => setDiffResult(null))
      .finally(() => setDiffLoading(false))
    // Reset compare session when versions change
    setCompareId(null)
    setHasRun(false)
    setWinner(null)
    setAnnotated(false)
    setAnnotateReason('')
    streamA.reset()
    streamB.reset()
  }, [versionAId, versionBId])

  // ── Sync detected variables into variables state ──────────────────────────
  useEffect(() => {
    setVariables((prev) => {
      const next: Record<string, string> = {}
      detectedVars.forEach((v) => {
        next[v] = prev[v] ?? ''
      })
      return next
    })
  }, [versionAId, versionBId])

  // ── Linked scroll setup ───────────────────────────────────────────────────
  useEffect(() => {
    if (!linkedScroll) return
    const a = panelARef.current
    const b = panelBRef.current
    if (!a || !b) return

    const syncFromA = () => {
      if (isScrollingSyncRef.current) return
      isScrollingSyncRef.current = true
      b.scrollTop = a.scrollTop
      requestAnimationFrame(() => {
        isScrollingSyncRef.current = false
      })
    }
    const syncFromB = () => {
      if (isScrollingSyncRef.current) return
      isScrollingSyncRef.current = true
      a.scrollTop = b.scrollTop
      requestAnimationFrame(() => {
        isScrollingSyncRef.current = false
      })
    }

    a.addEventListener('scroll', syncFromA)
    b.addEventListener('scroll', syncFromB)
    return () => {
      a.removeEventListener('scroll', syncFromA)
      b.removeEventListener('scroll', syncFromB)
    }
  }, [linkedScroll])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRunBoth = useCallback(async () => {
    if (!canRun) return

    let cid = compareId
    if (!cid) {
      try {
        const record = await createCompare({
          projectId,
          versionAId: versionAId!,
          versionBId: versionBId!,
        })
        cid = record.id
        setCompareId(cid)
      } catch (e: unknown) {
        console.error('创建对比记录失败:', e)
        // Still run even if compare record creation failed
      }
    }

    setHasRun(true)
    setWinner(null)
    setAnnotated(false)
    setAnnotateReason('')

    const variablesJson = JSON.stringify(variables)
    streamA.startStream({ versionId: versionAId!, presetId: presetId!, variablesJson })
    streamB.startStream({ versionId: versionBId!, presetId: presetId!, variablesJson })
  }, [canRun, compareId, projectId, versionAId, versionBId, presetId, variables])

  const handleCancelAll = useCallback(() => {
    streamA.cancelStream()
    streamB.cancelStream()
  }, [])

  const handleSaveAnnotation = useCallback(async () => {
    if (!compareId || winner === null) return
    setAnnotating(true)
    setAnnotateError('')
    try {
      const winnerVersionId =
        winner === 'a' ? versionAId! : winner === 'b' ? versionBId! : null
      await updateWinner(compareId, winnerVersionId, annotateReason || (winner === 'tie' ? '平局' : ''))
      setAnnotated(true)
    } catch (e: unknown) {
      setAnnotateError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setAnnotating(false)
    }
  }, [compareId, winner, versionAId, versionBId, annotateReason])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate(`/projects/${id}`)}
          className="text-gray-400 hover:text-indigo-600 text-sm"
        >
          ← {project?.name ?? '项目详情'}
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-sm text-gray-600 font-medium">版本对比</span>
      </nav>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-5">
        {/* ── Version selection ──────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            选择对比版本
          </h2>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium whitespace-nowrap">版本 A</span>
              <select
                value={versionAId ?? ''}
                onChange={(e) => setVersionAId(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="" disabled>
                  选择版本
                </option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.versionNo} — {v.note.slice(0, 30)}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-gray-400 font-bold">VS</span>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium whitespace-nowrap">版本 B</span>
              <select
                value={versionBId ?? ''}
                onChange={(e) => setVersionBId(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="" disabled>
                  选择版本
                </option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.versionNo} — {v.note.slice(0, 30)}
                  </option>
                ))}
              </select>
            </div>

            {versionAId === versionBId && versionAId !== null && (
              <span className="text-xs text-red-500">请选择两个不同版本</span>
            )}
          </div>
        </div>

        {/* ── Diff panel ────────────────────────────────────────────── */}
        {bothVersionsSelected && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowDiff((s) => !s)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                Prompt Diff
                {diffLoading && (
                  <span className="text-xs text-gray-400">加载中…</span>
                )}
              </span>
              <span className="text-gray-400">{showDiff ? '▲' : '▼'}</span>
            </button>
            {showDiff && diffResult && (
              <div className="border-t border-gray-100 p-4">
                <VersionDiffPanel
                  diffResult={diffResult}
                  title={`v${versionA?.versionNo} → v${versionB?.versionNo}`}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Shared config ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            共享配置
          </h2>
          <div className="flex flex-wrap gap-4 items-start">
            {/* Preset selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap">模型配置</span>
              {presets.length === 0 ? (
                <span className="text-xs text-gray-400 italic">暂无配置</span>
              ) : (
                <select
                  value={presetId ?? ''}
                  onChange={(e) => setPresetId(Number(e.target.value))}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.modelName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Variable inputs */}
            {detectedVars.length > 0 && (
              <div className="flex flex-col gap-2 flex-1 min-w-[240px]">
                <span className="text-sm text-gray-600">变量</span>
                {detectedVars.map((varName) => (
                  <div key={varName} className="flex items-center gap-2">
                    <label className="text-xs font-mono text-indigo-600 w-24 flex-shrink-0">
                      {'{{'}{varName}{'}}'}
                    </label>
                    <input
                      type="text"
                      value={variables[varName] ?? ''}
                      onChange={(e) =>
                        setVariables((prev) => ({ ...prev, [varName]: e.target.value }))
                      }
                      placeholder={`填写 ${varName}`}
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Action buttons ────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <button
            disabled={!canRun || streamA.isStreaming || streamB.isStreaming}
            onClick={handleRunBoth}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            <span className="text-base leading-none">▶</span>
            同时运行
          </button>

          {(streamA.isStreaming || streamB.isStreaming) && (
            <button
              onClick={handleCancelAll}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <span className="inline-block w-2 h-2 bg-white rounded-sm" />
              全部取消
            </button>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={linkedScroll}
              onChange={(e) => setLinkedScroll(e.target.checked)}
              className="rounded"
            />
            联动滚动
          </label>
        </div>

        {/* ── Double column output ──────────────────────────────────── */}
        {bothVersionsSelected && (
          <div className="grid grid-cols-2 gap-4">
            <ComparePanel
              label={`版本 A — v${versionA?.versionNo ?? '?'}`}
              output={streamA.output}
              stats={streamA.stats}
              isStreaming={streamA.isStreaming}
              error={streamA.error}
              onCancel={streamA.cancelStream}
              scrollRef={panelARef}
            />
            <ComparePanel
              label={`版本 B — v${versionB?.versionNo ?? '?'}`}
              output={streamB.output}
              stats={streamB.stats}
              isStreaming={streamB.isStreaming}
              error={streamB.error}
              onCancel={streamB.cancelStream}
              scrollRef={panelBRef}
            />
          </div>
        )}

        {/* ── Annotation section ────────────────────────────────────── */}
        {bothDone && compareId && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              标注结果
              {annotated && (
                <span className="ml-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                  已保存
                </span>
              )}
            </h2>

            {annotated ? (
              <div className="text-sm text-gray-600">
                已标注为：
                <strong className="text-indigo-600">
                  {winner === 'a'
                    ? `版本 A (v${versionA?.versionNo}) 更好`
                    : winner === 'b'
                    ? `版本 B (v${versionB?.versionNo}) 更好`
                    : '平局'}
                </strong>
                {annotateReason && (
                  <span className="ml-2 text-gray-400">— {annotateReason}</span>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Winner selection */}
                <div className="flex gap-3">
                  {(
                    [
                      { key: 'a', label: `A 更好 (v${versionA?.versionNo})` },
                      { key: 'b', label: `B 更好 (v${versionB?.versionNo})` },
                      { key: 'tie', label: '平局（跳过）' },
                    ] as const
                  ).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setWinner(key)}
                      className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                        winner === key
                          ? key === 'a'
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : key === 'b'
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-gray-600 border-gray-600 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-400 bg-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Reason input (optional) */}
                {winner !== null && (
                  <input
                    type="text"
                    value={annotateReason}
                    onChange={(e) => setAnnotateReason(e.target.value)}
                    placeholder="原因（可选）"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 max-w-sm"
                  />
                )}

                {annotateError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                    {annotateError}
                  </p>
                )}

                <button
                  disabled={winner === null || annotating}
                  onClick={handleSaveAnnotation}
                  className="self-start px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {annotating ? '保存中…' : '保存标注'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
