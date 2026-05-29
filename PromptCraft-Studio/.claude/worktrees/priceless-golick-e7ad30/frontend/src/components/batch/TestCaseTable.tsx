import { useEffect, useRef, useState } from 'react'
import { testCaseApi } from '../../api/testCaseApi'
import { TestCase, TestCaseDTO } from '../../types/testCase'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { EmptyState } from '../common/EmptyState'
import { useToast } from '../common/Toast'

interface Props {
  projectId: number
  onSelectionChange: (ids: number[]) => void
  /** 当前选择版本解析出的变量名列表，用于生成 CSV 模板 */
  templateVariables?: string[]
}

type DeletePending =
  | { type: 'bulk'; count: number }
  | { type: 'single'; id: number }
  | null

export default function TestCaseTable({ projectId, onSelectionChange, templateVariables }: Props) {
  const [cases, setCases] = useState<TestCase[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<{ id: number; col: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [deletePending, setDeletePending] = useState<DeletePending>(null)
  const [jsonOpen, setJsonOpen] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [jsonImporting, setJsonImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    load()
  }, [projectId])

  useEffect(() => {
    onSelectionChange(Array.from(selected))
  }, [selected])

  async function load() {
    setLoading(true)
    try {
      setCases(await testCaseApi.listTestCases(projectId))
    } finally {
      setLoading(false)
    }
  }

  // Aggregate all variable keys from all cases, then union with templateVariables
  // so that columns appear as soon as a version with {{variables}} is selected,
  // even before any case has populated those keys.
  const allKeys = Array.from(
    cases.reduce<Set<string>>((acc, tc) => {
      Object.keys(tc.variablesJson).forEach(k => acc.add(k))
      return acc
    }, new Set<string>(templateVariables ?? []))
  )

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelected(new Set(cases.map(c => c.id)))
    } else {
      setSelected(new Set())
    }
  }

  function toggleRow(id: number, checked: boolean) {
    setSelected(prev => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function startEdit(id: number, col: string, current: string) {
    setEditing({ id, col })
    setEditValue(current)
  }

  async function commitEdit(tc: TestCase) {
    if (!editing) return
    if (editValue === getCellValue(tc, editing.col)) {
      setEditing(null)
      return
    }
    const dto: TestCaseDTO = {
      name: tc.name,
      variablesJson: { ...tc.variablesJson },
      expectedOutput: tc.expectedOutput,
    }
    if (editing.col === 'name') {
      dto.name = editValue
    } else if (editing.col === 'expectedOutput') {
      dto.expectedOutput = editValue
    } else {
      dto.variablesJson = { ...tc.variablesJson, [editing.col]: editValue }
    }
    try {
      const updated = await testCaseApi.updateTestCase(tc.id, dto)
      setCases(prev => prev.map(c => (c.id === tc.id ? updated : c)))
    } catch (e) {
      console.error('Save failed', e)
    }
    setEditing(null)
  }

  function getCellValue(tc: TestCase, col: string): string {
    if (col === 'name') return tc.name
    if (col === 'expectedOutput') return tc.expectedOutput ?? ''
    return tc.variablesJson[col] ?? ''
  }

  async function addRow() {
    const dto: TestCaseDTO = {
      name: '新样例',
      variablesJson: Object.fromEntries(allKeys.map(k => [k, ''])),
      expectedOutput: '',
    }
    try {
      const tc = await testCaseApi.createTestCase(projectId, dto)
      setCases(prev => [...prev, tc])
    } catch (e) {
      console.error('Create failed', e)
    }
  }

  async function handleConfirmDelete() {
    if (!deletePending) return
    const pending = deletePending
    setDeletePending(null)
    if (pending.type === 'bulk') {
      await Promise.all(Array.from(selected).map(id => testCaseApi.deleteTestCase(id)))
      setCases(prev => prev.filter(c => !selected.has(c.id)))
      setSelected(new Set())
    } else {
      await testCaseApi.deleteTestCase(pending.id)
      setCases(prev => prev.filter(c => c.id !== pending.id))
      setSelected(prev => {
        const next = new Set(prev)
        next.delete(pending.id)
        return next
      })
    }
  }

  function downloadCsvTemplate() {
    const vars = templateVariables ?? []
    if (vars.length === 0) {
      toast.error('请先在上方选择版本（且该版本包含 {{变量}}）')
      return
    }
    const escape = (s: string) => {
      if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
      return s
    }
    const header = ['name', ...vars, 'expectedOutput'].map(escape).join(',')
    const sample = ['示例样例', ...vars.map(v => `${v}的示例值`), ''].map(escape).join(',')
    const csv = '﻿' + header + '\n' + sample + '\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'test-cases-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * 解析 JSON 文本为 TestCaseDTO 列表。支持以下输入：
   *  - 数组：[ { name?, variables/variablesJson, expectedOutput? }, ... ]
   *  - 数组：[ { var1, var2, ... }, ... ]   （每个对象的键即变量名）
   *  - 单对象：会自动包裹成单元素数组
   */
  function parseJsonToDtos(text: string): TestCaseDTO[] {
    const raw = JSON.parse(text)
    const arr: unknown[] = Array.isArray(raw) ? raw : [raw]
    return arr.map((item, idx) => {
      if (item === null || typeof item !== 'object') {
        throw new Error(`第 ${idx + 1} 项不是对象`)
      }
      const obj = item as Record<string, unknown>
      const explicitVars =
        (obj.variables && typeof obj.variables === 'object' ? obj.variables : null) ??
        (obj.variablesJson && typeof obj.variablesJson === 'object' ? obj.variablesJson : null)

      let variables: Record<string, string>
      if (explicitVars) {
        variables = {}
        for (const [k, v] of Object.entries(explicitVars as Record<string, unknown>)) {
          variables[k] = v == null ? '' : String(v)
        }
      } else {
        variables = {}
        for (const [k, v] of Object.entries(obj)) {
          if (k === 'name' || k === 'expectedOutput') continue
          variables[k] = v == null ? '' : String(v)
        }
      }

      const name = typeof obj.name === 'string' && obj.name.trim()
        ? obj.name.trim()
        : `JSON 样例 ${idx + 1}`
      const expectedOutput =
        typeof obj.expectedOutput === 'string' ? obj.expectedOutput : undefined

      return { name, variablesJson: variables, expectedOutput }
    })
  }

  async function handleImportJson() {
    if (!jsonText.trim()) {
      toast.error('请先粘贴 JSON 内容')
      return
    }
    let dtos: TestCaseDTO[]
    try {
      dtos = parseJsonToDtos(jsonText)
    } catch (e) {
      toast.error('JSON 解析失败: ' + (e instanceof Error ? e.message : String(e)))
      return
    }
    if (dtos.length === 0) {
      toast.error('JSON 中没有可导入的样例')
      return
    }
    setJsonImporting(true)
    try {
      const created = await Promise.all(
        dtos.map(dto => testCaseApi.createTestCase(projectId, dto)),
      )
      setCases(prev => [...prev, ...created])
      toast.success(`成功导入 ${created.length} 条样例`)
      setJsonOpen(false)
      setJsonText('')
    } catch (e) {
      toast.error('导入失败: ' + String(e))
    } finally {
      setJsonImporting(false)
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const res = await testCaseApi.importCsv(projectId, file)
      toast.success(`成功导入 ${res.importedCount} 条样例`)
      await load()
    } catch (err) {
      toast.error('导入失败: ' + String(err))
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const allSelected = cases.length > 0 && cases.every(c => selected.has(c.id))
  const someSelected = selected.size > 0 && !allSelected

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={downloadCsvTemplate}
          disabled={!templateVariables || templateVariables.length === 0}
          title={
            !templateVariables || templateVariables.length === 0
              ? '请先选择包含 {{变量}} 的版本'
              : '下载与当前版本变量匹配的 CSV 模板'
          }
          className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          下载 CSV 模板
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
        >
          导入 CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleImport}
        />
        <button
          onClick={() => testCaseApi.exportCsv(projectId)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
        >
          导出 CSV
        </button>
        <button
          onClick={() => setJsonOpen(true)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
        >
          JSON 导入
        </button>
        {selected.size > 0 && (
          <button
            onClick={() => setDeletePending({ type: 'bulk', count: selected.size })}
            className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
          >
            删除选中 ({selected.size})
          </button>
        )}
        <span className="text-sm text-gray-500 ml-auto">{cases.length} 条样例</span>
      </div>

      {/* Empty / loading state */}
      {loading && (
        <div className="text-center py-8 text-gray-400 text-sm">加载中...</div>
      )}

      {!loading && cases.length === 0 && (
        <EmptyState
          icon="🧪"
          title="还没有测试样例"
          description="点击「+ 添加」或导入 CSV 开始批量测试"
          actionLabel="+ 添加"
          onAction={addRow}
        />
      )}

      {/* Hint when no variable columns can be shown */}
      {!loading && cases.length > 0 && allKeys.length === 0 && (
        <div className="px-3 py-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded">
          当前没有可编辑的变量列。请先在上方选择一个包含 <code className="px-1 bg-white rounded">{'{{变量}}'}</code> 的版本，模板中的变量会自动作为列显示在下方表格中。
        </div>
      )}

      {/* Table */}
      {!loading && cases.length > 0 && (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected }}
                    onChange={e => toggleAll(e.target.checked)}
                  />
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">名称</th>
                {allKeys.map(k => (
                  <th key={k} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                    {k}
                  </th>
                ))}
                <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">期望输出</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cases.map(tc => (
                <tr key={tc.id} className={selected.has(tc.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selected.has(tc.id)}
                      onChange={e => toggleRow(tc.id, e.target.checked)}
                    />
                  </td>
                  {(['name', ...allKeys, 'expectedOutput'] as string[]).map(col => (
                    <td key={col} className="px-3 py-2 max-w-[200px]">
                      {editing?.id === tc.id && editing.col === col ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(tc)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEdit(tc)
                            if (e.key === 'Escape') setEditing(null)
                          }}
                          className="w-full border border-blue-400 rounded px-1 py-0.5 text-sm outline-none"
                        />
                      ) : (
                        <span
                          className="block truncate cursor-pointer hover:text-blue-600 min-h-[1.25rem]"
                          title={getCellValue(tc, col)}
                          onClick={() => startEdit(tc.id, col, getCellValue(tc, col))}
                        >
                          {getCellValue(tc, col) || (
                            <span className="text-gray-300 text-xs">点击编辑</span>
                          )}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setDeletePending({ type: 'single', id: tc.id })}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && cases.length > 0 && (
        <button
          onClick={addRow}
          className="self-start px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
        >
          + 添加
        </button>
      )}

      <ConfirmDialog
        isOpen={deletePending !== null}
        title="确认删除"
        message={
          deletePending?.type === 'bulk'
            ? `确认删除选中的 ${deletePending.count} 条样例？`
            : '确认删除该样例？'
        }
        confirmText="删除"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletePending(null)}
      />

      {jsonOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => !jsonImporting && setJsonOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">在线解析 JSON 测试样例</h3>
              <button
                onClick={() => !jsonImporting && setJsonOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-2 overflow-y-auto">
              <p className="text-xs text-gray-500 leading-relaxed">
                支持以下格式（数组或单对象均可）：
                <br />
                <code className="text-gray-700">{`[{ "name": "可选", "variables": { "role": "翻译", "content": "..." }, "expectedOutput": "可选" }]`}</code>
                <br />
                或直接把每个对象的键作为变量：
                <br />
                <code className="text-gray-700">{`[{ "role": "翻译", "content": "..." }]`}</code>
              </p>
              <textarea
                value={jsonText}
                onChange={e => setJsonText(e.target.value)}
                placeholder='[{"name":"样例1","variables":{"role":"翻译","content":"hello"}}]'
                className="w-full h-64 border border-gray-300 rounded px-3 py-2 text-sm font-mono outline-none focus:border-blue-400"
              />
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setJsonOpen(false)}
                disabled={jsonImporting}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                取消
              </button>
              <button
                onClick={handleImportJson}
                disabled={jsonImporting}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
              >
                {jsonImporting ? '导入中...' : '解析并导入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
