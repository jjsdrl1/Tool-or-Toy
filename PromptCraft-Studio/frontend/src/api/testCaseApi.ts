import { del, get, post, put } from './request'
import { TestCase, TestCaseDTO } from '../types/testCase'

/**
 * 后端理论上会把 variablesJson 序列化为对象，但历史数据或边界情况下可能拿到一个 JSON 字符串。
 * 若不归一化，前端 Object.keys(string) 会得到字符下标 "0","1",... 导致表格列错乱。
 */
function normalizeVariables(raw: unknown): Record<string, string> {
  if (raw == null) return {}
  if (typeof raw === 'string') {
    if (raw.trim() === '') return {}
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const out: Record<string, string> = {}
        for (const [k, v] of Object.entries(parsed)) {
          out[k] = v == null ? '' : String(v)
        }
        return out
      }
    } catch {
      // 不是合法 JSON 时退化为空对象，避免渲染崩溃
    }
    return {}
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      out[k] = v == null ? '' : String(v)
    }
    return out
  }
  return {}
}

function normalizeTestCase(tc: TestCase): TestCase {
  return { ...tc, variablesJson: normalizeVariables(tc.variablesJson as unknown) }
}

export const testCaseApi = {
  async listTestCases(projectId: number): Promise<TestCase[]> {
    const list = await get<TestCase[]>(`/projects/${projectId}/test-cases`)
    return list.map(normalizeTestCase)
  },

  async createTestCase(projectId: number, dto: TestCaseDTO): Promise<TestCase> {
    const tc = await post<TestCase>(`/projects/${projectId}/test-cases`, dto)
    return normalizeTestCase(tc)
  },

  async updateTestCase(id: number, dto: TestCaseDTO): Promise<TestCase> {
    const tc = await put<TestCase>(`/test-cases/${id}`, dto)
    return normalizeTestCase(tc)
  },

  deleteTestCase(id: number): Promise<void> {
    return del(`/test-cases/${id}`)
  },

  async importCsv(projectId: number, file: File): Promise<{ importedCount: number }> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(`/api/projects/${projectId}/test-cases/import`, {
      method: 'POST',
      body: formData,
    })
    const json = await response.json()
    if (!json.success) throw new Error(json.message ?? '导入失败')
    return json.data
  },

  async exportCsv(projectId: number): Promise<void> {
    const response = await fetch(`/api/projects/${projectId}/test-cases/export`)
    if (!response.ok) throw new Error('导出失败')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'test-cases.csv'
    a.click()
    URL.revokeObjectURL(url)
  },
}
