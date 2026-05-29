import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../components/common/Toast'
import { Breadcrumbs } from '../components/common/Breadcrumbs'
import { getProject } from '../api/projectApi'
import { listVersions, saveVersion } from '../api/versionApi'
import type { ProjectVO } from '../types/project'
import type { VersionVO } from '../types/version'
import { useEditorStore } from '../stores/editorStore'
import { useStreamRun } from '../hooks/useStreamRun'
import { VersionTimeline } from '../components/version/VersionTimeline'
import { PromptEditor } from '../components/editor/PromptEditor'
import { VariablePanel } from '../components/editor/VariablePanel'
import { ModelConfigBar } from '../components/editor/ModelConfigBar'
import { RunOutputPanel } from '../components/editor/RunOutputPanel'

export default function PromptEditorPage() {
  const { id, vid } = useParams<{ id: string; vid: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<ProjectVO | null>(null)
  const [loadError, setLoadError] = useState('')

  // Panel collapse state — give the editor more breathing room when needed
  const [leftCollapsed, setLeftCollapsed]   = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)

  // Save dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveNote, setSaveNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const loadVersion = useEditorStore((s) => s.loadVersion)
  const resetEditor = useEditorStore((s) => s.resetEditor)
  const isDirty = useEditorStore((s) => s.isDirty)
  const selectedVersionId = useEditorStore((s) => s.selectedVersionId)
  const userPrompt = useEditorStore((s) => s.userPrompt)
  const variables = useEditorStore((s) => s.variables)

  const { toast } = useToast()

  const { output, stats, runRecordId, isStreaming, error, startStream, cancelStream, reset: resetOutput } =
    useStreamRun()

  // Load project info
  useEffect(() => {
    if (!id) return
    getProject(Number(id))
      .then(setProject)
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : '加载失败'))
  }, [id])

  // Load version: from :vid or latest
  useEffect(() => {
    if (!id) return
    resetEditor()
    resetOutput()

    if (vid) {
      listVersions(Number(id))
        .then((versions) => {
          const target = versions.find((v) => v.id === Number(vid))
          if (target) loadVersion(target)
          else setLoadError('版本不存在')
        })
        .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : '加载失败'))
    } else {
      listVersions(Number(id))
        .then((versions) => {
          if (versions.length > 0) {
            const latest = versions.sort((a, b) => b.versionNo - a.versionNo)[0]
            loadVersion(latest)
            navigate(`/projects/${id}/editor/${latest.id}`, { replace: true })
          }
        })
        .catch(() => {
          // No versions yet is fine — start with empty editor
        })
    }
  }, [id, vid])

  const handleVersionSelect = (v: VersionVO) => {
    loadVersion(v)
    resetOutput()
    navigate(`/projects/${id}/editor/${v.id}`, { replace: true })
  }

  const handleRun = (presetId: number) => {
    if (!selectedVersionId) return
    const variablesJson = JSON.stringify(variables)
    startStream({ versionId: selectedVersionId, presetId, variablesJson })
  }

  const openSaveDialog = () => {
    setSaveNote('')
    setSaveError('')
    setShowSaveDialog(true)
  }

  const handleSave = async () => {
    if (!id) return
    if (!saveNote.trim()) {
      setSaveError('请填写版本备注')
      return
    }
    if (!userPrompt.trim()) {
      setSaveError('User Prompt 不能为空')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      const { systemPrompt, userPrompt: uPrompt } = useEditorStore.getState()
      const saved = await saveVersion(Number(id), {
        systemPrompt: systemPrompt || undefined,
        userPrompt: uPrompt,
        note: saveNote.trim(),
      })
      toast.success('版本保存成功')
      setShowSaveDialog(false)
      navigate(`/projects/${id}/editor/${saved.id}`, { replace: true })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '保存失败'
      setSaveError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center text-red-500 text-sm">
        {loadError}
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Breadcrumb header */}
      <Breadcrumbs
        items={[
          { label: '我的项目', to: '/projects' },
          { label: project?.name ?? '项目详情', to: `/projects/${id}` },
          { label: 'Prompt 编辑器' },
        ]}
        actions={
          <>
            {isDirty && (
              <span className="pc-pill-warning">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                未保存
              </span>
            )}
            <button
              onClick={() => navigate(`/projects/${id}/compare`)}
              className="pc-btn-ghost"
              title="进入版本对比"
            >
              版本对比
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/batch-test`)}
              className="pc-btn-ghost"
              title="进入批量测试"
            >
              批量测试
            </button>
            <button onClick={openSaveDialog} className="pc-btn-primary">
              保存版本
            </button>
          </>
        }
      />

      {/* 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Version timeline ─ collapsible ─────────────────── */}
        <aside
          className={[
            'flex-shrink-0 border-r-2 border-brand-100 bg-gradient-to-b from-brand-50/40 to-white overflow-hidden flex flex-col transition-[width] duration-300 ease-smooth',
            leftCollapsed ? 'w-10' : 'w-64',
          ].join(' ')}
        >
          {leftCollapsed ? (
            <button
              onClick={() => setLeftCollapsed(false)}
              className="w-full h-full flex flex-col items-center pt-4 gap-2 text-ink-muted hover:text-brand-700 hover:bg-brand-50/60 transition-colors"
              title="展开版本历史"
            >
              <ChevronRight />
              <span className="[writing-mode:vertical-rl] text-[11px] tracking-widest uppercase mt-2">
                版本历史
              </span>
            </button>
          ) : (
            <>
              <div className="px-4 py-3 border-b-2 border-brand-100 bg-gradient-to-r from-brand-50/60 to-white flex items-center justify-between flex-shrink-0">
                <span className="pc-section-label">版本历史</span>
                <button
                  onClick={() => setLeftCollapsed(true)}
                  className="text-ink-subtle hover:text-ink-muted p-1 rounded hover:bg-gray-100"
                  title="折叠"
                >
                  <ChevronLeft />
                </button>
              </div>
              <div className="p-3 overflow-y-auto flex-1">
                {id && (
                  <VersionTimeline
                    projectId={Number(id)}
                    currentVersionId={selectedVersionId ?? undefined}
                    onVersionSelect={handleVersionSelect}
                  />
                )}
              </div>
            </>
          )}
        </aside>

        {/* Center: Editor + Run ─ flex-1 ──────────────────────────── */}
        <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
          <ModelConfigBar
            onRun={handleRun}
            onCancel={cancelStream}
            isStreaming={isStreaming}
          />

          <div className="flex flex-col gap-5 p-6">
            <PromptEditor />
            <RunOutputPanel
              output={output}
              stats={stats}
              isStreaming={isStreaming}
              error={error}
              runRecordId={runRecordId}
              onClear={resetOutput}
            />
          </div>
        </main>

        {/* Right: Variable panel ─ collapsible ──────────────────── */}
        <aside
          className={[
            'flex-shrink-0 border-l-2 border-brand-100 bg-gradient-to-b from-brand-50/40 to-white overflow-hidden flex flex-col transition-[width] duration-300 ease-smooth',
            rightCollapsed ? 'w-10' : 'w-[300px]',
          ].join(' ')}
        >
          {rightCollapsed ? (
            <button
              onClick={() => setRightCollapsed(false)}
              className="w-full h-full flex flex-col items-center pt-4 gap-2 text-ink-muted hover:text-brand-700 hover:bg-brand-50/60 transition-colors"
              title="展开变量面板"
            >
              <ChevronLeft />
              <span className="[writing-mode:vertical-rl] text-[11px] tracking-widest uppercase mt-2">
                变量 & 预览
              </span>
            </button>
          ) : (
            <>
              <div className="px-4 py-3 border-b-2 border-brand-100 bg-gradient-to-r from-brand-50/60 to-white flex items-center justify-between flex-shrink-0">
                <span className="pc-section-label">变量 &amp; 预览</span>
                <button
                  onClick={() => setRightCollapsed(true)}
                  className="text-ink-subtle hover:text-ink-muted p-1 rounded hover:bg-gray-100"
                  title="折叠"
                >
                  <ChevronRight />
                </button>
              </div>
              <div className="p-3 overflow-y-auto flex-1">
                <VariablePanel />
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Save version dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-elevated w-[420px] p-6 flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-ink">保存新版本</h2>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-ink-soft">
                版本备注 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={saveNote}
                onChange={(e) => setSaveNote(e.target.value)}
                placeholder="描述此版本的改动内容…"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') setShowSaveDialog(false)
                }}
                className="pc-input"
              />
            </div>
            {saveError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2">
                {saveError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSaveDialog(false)}
                disabled={saving}
                className="pc-btn-ghost"
              >
                取消
              </button>
              <button onClick={handleSave} disabled={saving} className="pc-btn-primary">
                {saving ? '保存中…' : '确认保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Small chevron icons ────────────────────────────────────
function ChevronLeft() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 0 1 0 1.06L9.06 10l3.73 3.71a.75.75 0 1 1-1.06 1.06l-4.24-4.24a.75.75 0 0 1 0-1.06l4.24-4.24a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
    </svg>
  )
}
function ChevronRight() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M7.21 5.23a.75.75 0 0 1 1.06 0l4.24 4.24a.75.75 0 0 1 0 1.06l-4.24 4.24a.75.75 0 1 1-1.06-1.06L10.94 10 7.21 6.29a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  )
}
