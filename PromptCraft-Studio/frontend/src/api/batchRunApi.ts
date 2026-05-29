import { get, post } from './request'
import { BatchRun, BatchRunCreateDTO, BatchRunStatusVO } from '../types/batchRun'

export const batchRunApi = {
  createBatchRun(dto: BatchRunCreateDTO): Promise<BatchRun> {
    return post('/batch-runs', dto)
  },

  getBatchRunStatus(id: number): Promise<BatchRunStatusVO> {
    return get(`/batch-runs/${id}`)
  },

  listBatchRuns(projectId: number): Promise<BatchRun[]> {
    return get(`/projects/${projectId}/batch-runs`)
  },

  async exportResult(id: number): Promise<void> {
    const response = await fetch(`/api/batch-runs/${id}/export`)
    if (!response.ok) throw new Error('导出失败')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `batch-result-${id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  },
}
