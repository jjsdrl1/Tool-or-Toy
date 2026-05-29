import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { listVersions, updateStatus, forkVersion, deleteVersion, diffVersions } from '../../api/versionApi'
import type { VersionVO, DiffResult } from '../../types/version'
import { VersionStatusBadge } from './VersionStatusBadge'
import { VersionDiffPanel } from './VersionDiffPanel'
import { EmptyState } from '../common/EmptyState'

interface Props {
  projectId: number
  currentVersionId?: number
  onVersionSelect: (v: VersionVO) => void
}

export function VersionTimeline({ projectId, currentVersionId, onVersionSelect }: Props) {
  const navigate = useNavigate()
  const { id: pid } = useParams<{ id: string }>()

  const [versions, setVersions] = useState<VersionVO[]>([])
  const [loading, setLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Diff modal state
  const [diffBase, setDiffBase] = useState<number | null>(null)
  const [diffTarget, setDiffTarget] = useState<number | null>(null)
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [diffError, setDiffError] = useState('')
  const [showDiffModal, setShowDiffModal] = useState(false)

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const [actionError, setActionError] = useState('')

  const load = () => {
    setLoading(true)
    listVersions(projectId)
      .then((vs) => setVersions(vs.sort((a, b) => b.versionNo - a.versionNo)))
      .catch(() => setVersions([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [projectId, currentVersionId])

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleStatus = async (v: VersionVO, status: 'stable' | 'deprecated') => {
    setOpenMenuId(null)
    setActionError('')
    try {
      await updateStatus(v.id, status)
      load()
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : '操作失败')
    }
  }

  const handleFork = async (v: VersionVO) => {
    setOpenMenuId(null)
    setActionError('')
    try {
      const forked = await forkVersion(v.id)
      load()
      navigate(`/projects/${pid}/editor/${forked.id}`)
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Fork 失败')
    }
  }

  const openDiff = (v: VersionVO) => {
    setOpenMenuId(null)
    setDiffBase(v.id)
    setDiffTarget(null)
    setDiffResult(null)
    setDiffError('')
    setShowDiffModal(true)
  }

  const runDiff = async () => {
    if (!diffBase || !diffTarget) return
    setDiffLoading(true)
    setDiffError('')
    try {
      const result = await diffVersions(diffBase, diffTarget)
      setDiffResult(result)
    } catch (e: unknown) {
      setDiffError(e instanceof Error ? e.message : 'Diff 失败')
    } finally {
      setDiffLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeleteError('')
    try {
      await deleteVersion(id)
      setDeleteConfirmId(null)
      load()
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : '删除失败')
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-16" />
        ))}
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <EmptyState
        icon="📝"
        title="还没有版本"
        description="在编辑器中编写 Prompt 并保存，即可创建第一个版本"
        actionLabel="去编辑器创建第一个版本"
        onAction={() => navigate(`/projects/${pid}/editor`)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {actionError && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {actionError}
        </div>
      )}

      {versions.map((v) => {
        const isCurrent = v.id === currentVersionId
        const isStable = v.status === 'stable'

        return (
          <div
            key={v.id}
            className={`relative flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors cursor-pointer
              ${isCurrent
                ? 'bg-indigo-50 border-indigo-200'
                : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
              }`}
            onClick={() => onVersionSelect(v)}
          >
            {/* Version circle */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                ${isStable
                  ? 'bg-yellow-400 text-yellow-900'
                  : isCurrent
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-200 text-gray-600'
                }`}
            >
              v{v.versionNo}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-800 truncate">{v.note}</span>
                <VersionStatusBadge status={v.status} />
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{v.createdAt}</div>
            </div>

            {/* 3-dot menu */}
            <div
              className="relative flex-shrink-0"
              ref={openMenuId === v.id ? menuRef : undefined}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setOpenMenuId(openMenuId === v.id ? null : v.id)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                title="更多操作"
              >
                ···
              </button>

              {openMenuId === v.id && (
                <div className="absolute right-0 top-8 z-10 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm">
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-50"
                    onClick={() => {
                      setOpenMenuId(null)
                      navigate(`/projects/${pid}/editor/${v.id}`)
                    }}
                  >
                    在编辑器中打开
                  </button>
                  {v.status !== 'stable' && (
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-green-700"
                      onClick={() => handleStatus(v, 'stable')}
                    >
                      设为 Stable
                    </button>
                  )}
                  {v.status !== 'deprecated' && (
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-orange-600"
                      onClick={() => handleStatus(v, 'deprecated')}
                    >
                      标记废弃
                    </button>
                  )}
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-indigo-600"
                    onClick={() => handleFork(v)}
                  >
                    Fork 此版本
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-50"
                    onClick={() => openDiff(v)}
                  >
                    查看 Diff
                  </button>
                  <hr className="my-1 border-gray-100" />
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600"
                    onClick={() => {
                      setOpenMenuId(null)
                      setDeleteConfirmId(v.id)
                      setDeleteError('')
                    }}
                  >
                    删除
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Diff modal */}
      {showDiffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-[720px] max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">版本对比</h2>
              <button
                onClick={() => setShowDiffModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">基准版本（旧）</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  value={diffBase ?? ''}
                  onChange={(e) => setDiffBase(Number(e.target.value))}
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNo} — {v.note}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-gray-400 mt-4">→</div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">对比版本（新）</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  value={diffTarget ?? ''}
                  onChange={(e) => setDiffTarget(Number(e.target.value))}
                >
                  <option value="">请选择…</option>
                  {versions
                    .filter((v) => v.id !== diffBase)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.versionNo} — {v.note}
                      </option>
                    ))}
                </select>
              </div>
              <div className="mt-4">
                <button
                  disabled={!diffBase || !diffTarget || diffLoading}
                  onClick={runDiff}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                >
                  {diffLoading ? '对比中…' : '对比'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {diffError && (
                <div className="text-sm text-red-500">{diffError}</div>
              )}
              {diffResult && (
                <VersionDiffPanel
                  diffResult={diffResult}
                  title={`v${versions.find((v) => v.id === diffBase)?.versionNo} → v${versions.find((v) => v.id === diffTarget)?.versionNo}`}
                />
              )}
              {!diffResult && !diffError && (
                <div className="text-sm text-gray-400 text-center py-8">选择两个版本后点击「对比」</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-80 p-6 flex flex-col gap-4">
            <h3 className="text-base font-semibold text-gray-800">确认删除</h3>
            <p className="text-sm text-gray-500">
              删除后不可恢复。Stable 版本无法删除。
            </p>
            {deleteError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
