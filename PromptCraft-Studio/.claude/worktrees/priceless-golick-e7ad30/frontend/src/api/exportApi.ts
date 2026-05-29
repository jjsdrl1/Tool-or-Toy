import { post } from './request'
import { ExportRequest, ExportResult } from '../types/export'

export function exportCode(req: ExportRequest): Promise<ExportResult> {
  return post<ExportResult>('/export/code', req)
}

export function exportJson(versionId: number, presetId: number): Promise<object> {
  return post<object>('/export/json', { versionId, presetId, language: 'python' })
}
