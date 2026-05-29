import { get, post } from './request'
import {
  BatchCompareGroup,
  BatchCompareCreateDTO,
  BatchCompareResultVO,
} from '../types/batchCompare'

export const batchCompareApi = {
  create(dto: BatchCompareCreateDTO): Promise<BatchCompareGroup> {
    return post('/batch-compares', dto)
  },

  getResult(id: number): Promise<BatchCompareResultVO> {
    return get(`/batch-compares/${id}`)
  },

  listByProject(projectId: number): Promise<BatchCompareGroup[]> {
    return get(`/projects/${projectId}/batch-compares`)
  },
}
