import { get, post, put } from './request'
import type { CompareRecord, CompareRecordVO, CompareCreateDTO } from '../types/compare'

export function createCompare(dto: CompareCreateDTO): Promise<CompareRecord> {
  return post<CompareRecord>('/compares', dto)
}

export function listCompares(projectId: number): Promise<CompareRecordVO[]> {
  return get<CompareRecordVO[]>(`/projects/${projectId}/compares`)
}

export function updateWinner(
  id: number,
  winnerVersionId: number | null,
  reason: string
): Promise<void> {
  return put<void>(`/compares/${id}/winner`, { winnerVersionId, reason })
}

export function linkRunRecord(
  id: number,
  side: 'a' | 'b',
  runRecordId: number
): Promise<void> {
  return put<void>(`/compares/${id}/link-run`, { side, runRecordId })
}
