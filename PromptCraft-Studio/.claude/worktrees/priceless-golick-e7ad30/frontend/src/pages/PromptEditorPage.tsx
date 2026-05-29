import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../components/common/Toast'
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500">
        {loadError}
      </div>
    )
  }

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
        <span className="text-sm text-gray-600 font-medium">Prompt 编辑器</span>
        {isDirty && (
          <span className="text-xs text-orange-500 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
            未保存
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={openSaveDialog}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          保存版本
        </button>
      </nav>

      {/* 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Version timeline — 256px */}
        <aside className="w-64 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            版本历史
          </div>
          <div className="p-3">
            {id && (
              <VersionTimeline
                projectId={Number(id)}
                currentVersionId={selectedVersionId ?? undefined}
                onVersionSelect={handleVersionSelect}
              />
            )}
          </div>
        </aside>

        {/* Center: Editor + Run — flex-1 */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* Model config + run button */}
          <ModelConfigBar
            onRun={handleRun}
            onCancel={cancelStream}
            isStreaming={isStreaming}
          />

          <div className="flex flex-col gap-4 p-6 flex-1">
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

        {/* Right: Variable panel — 320px */}
        <aside className="w-80 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            变量 & 预览
          </div>
          <div className="p-3">
            <VariablePanel />
          </div>
        </aside>
      </div>

      {/* Save version dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-96 p-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-gray-800">保存新版本</h2>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">
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
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            {saveError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                {saveError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSaveDialog(false)}
                disabled={saving}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-40"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg font-medium transition-colors"
              >
                {saving ? '保存中…' : '确认保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
