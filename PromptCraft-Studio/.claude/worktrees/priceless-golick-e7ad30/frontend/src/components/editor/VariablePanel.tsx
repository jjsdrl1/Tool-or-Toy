import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { previewPrompt } from '../../utils/promptRenderer'
import { variableSnapshotApi } from '../../api/variableSnapshotApi'
import type { VariableSnapshot } from '../../types/variableSnapshot'
import { useToast } from '../common/Toast'

export function VariablePanel() {
  const systemPrompt = useEditorStore((s) => s.systemPrompt)
  const userPrompt = useEditorStore((s) => s.userPrompt)
  const detectedVars = useEditorStore((s) => s.detectedVars)
  const variables = useEditorStore((s) => s.variables)
  const setVariable = useEditorStore((s) => s.setVariable)
  const applyVariables = useEditorStore((s) => s.applyVariables)
  const selectedVersionId = useEditorStore((s) => s.selectedVersionId)

  const { toast } = useToast()

  const [snapshots, setSnapshots] = useState<VariableSnapshot[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [snapshotName, setSnapshotName] = useState('')
  const [saving, setSaving] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const refreshSnapshots = useCallback(async (vid: number) => {
    try {
      const list = await variableSnapshotApi.list(vid)
      setSnapshots(list)
    } catch (e) {
      // Non-fatal — just leave the list empty
      console.warn('Failed to load variable snapshots', e)
    }
  }, [])

  useEffect(() => {
    if (selectedVersionId) {
      void refreshSnapshots(selectedVersionId)
    } else {
      setSnapshots([])
    }
  }, [selectedVersionId, refreshSnapshots])

  const handleSave = async () => {
    if (!selectedVersionId) return
    const name = snapshotName.trim()
    if (!name) {
      toast.error('请填写变量组名称')
      return
    }
    setSaving(true)
    try {
      await variableSnapshotApi.create(selectedVersionId, { name, variables })
      toast.success('变量组已保存')
      setShowSaveDialog(false)
      setSnapshotName('')
      await refreshSnapshots(selectedVersionId)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleApply = (snap: VariableSnapshot) => {
    try {
      const parsed = JSON.parse(snap.variablesJson) as Record<string, string>
      applyVariables(parsed)
      toast.success(`已应用变量组「${snap.name}」`)
      setHistoryOpen(false)
    } catch {
      toast.error('变量组数据已损坏')
    }
  }

  const handleDelete = async (snap: VariableSnapshot, e: MouseEvent) => {
    e.stopPropagation()
    if (!selectedVersionId) return
    try {
      await variableSnapshotApi.remove(snap.id)
      toast.success('已删除')
      await refreshSnapshots(selectedVersionId)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  const openSaveDialog = () => {
    if (detectedVars.length === 0) {
      toast.error('当前没有可保存的变量')
      return
    }
    setSnapshotName('')
    setShowSaveDialog(true)
  }

  const previewHtml = previewPrompt(
    (systemPrompt ? systemPrompt + '\n\n' : '') + userPrompt,
    variables
  )

  const canManageSnapshots = selectedVersionId !== null

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto">
      {/* Variables */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex-shrink-0">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700 flex items-center justify-between">
          <span>变量填充</span>
          {detectedVars.length > 0 && (
            <span className="text-xs text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">
              {detectedVars.length} 个
            </span>
          )}
        </div>

        {detectedVars.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-400 text-center">
            在提示词中使用 <code className="bg-gray-100 rounded px-1">{'{{变量名}}'}</code> 添加变量
          </div>
        ) : (
          <div className="px-4 py-3 flex flex-col gap-3">
            {detectedVars.map((varName) => (
              <div key={varName} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">
                  <span className="text-indigo-500 font-mono">{`{{${varName}}}`}</span>
                </label>
                <input
                  type="text"
                  value={variables[varName] ?? ''}
                  onChange={(e) => setVariable(varName, e.target.value)}
                  placeholder={`填入 ${varName} 的值…`}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
                />
              </div>
            ))}
          </div>
        )}

        {canManageSnapshots && (
          <div className="px-4 py-3 border-t border-gray-100 flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openSaveDialog}
                className="flex-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-3 py-1.5 transition-colors"
              >
                保存当前变量组
              </button>
              <button
                type="button"
                onClick={() => setHistoryOpen((v) => !v)}
                className="flex-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5 transition-colors"
              >
                历史变量组（{snapshots.length}）
              </button>
            </div>

            {historyOpen && (
              <div className="border border-gray-200 rounded-lg max-h-56 overflow-y-auto bg-white">
                {snapshots.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-gray-400 text-center">
                    暂无保存的变量组
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {snapshots.map((snap) => (
                      <li
                        key={snap.id}
                        className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-indigo-50/40 cursor-pointer group"
                        onClick={() => handleApply(snap)}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-gray-800 truncate">
                            {snap.name}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(snap.createdAt).toLocaleString('zh-CN', { hour12: false })}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(snap, e)}
                          className="text-[11px] text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          删除
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700 flex-shrink-0">
          渲染预览
        </div>
        <div
          className="px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-all overflow-y-auto max-h-80 font-mono"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>

      {/* Save snapshot dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-96 p-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-gray-800">保存变量组</h2>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">
                名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                placeholder="如：示例样例、长文本测试…"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') setShowSaveDialog(false)
                }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded px-2 py-1.5">
              将保存当前 {detectedVars.length} 个变量的填写内容，仅在该版本下可见。
            </div>
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
