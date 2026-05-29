import { get } from './request'
import type { RunRecord } from '../types/run'

export function listRunsByProject(projectId: number): Promise<RunRecord[]> {
  return get<RunRecord[]>(`/projects/${projectId}/runs`)
}

export function listRunsByVersion(versionId: number): Promise<RunRecord[]> {
  return get<RunRecord[]>(`/versions/${versionId}/runs`)
}

export function getRunRecord(id: number): Promise<RunRecord> {
  return get<RunRecord>(`/runs/${id}`)
}
