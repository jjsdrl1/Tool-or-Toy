import { get, post, put, del } from './request'
import type { VersionVO, VersionSaveDTO, DiffResult } from '../types/version'
import type { PromptVersion } from '../types/version'

export function listVersions(projectId: number): Promise<VersionVO[]> {
  return get<VersionVO[]>(`/projects/${projectId}/versions`)
}

export function getVersion(id: number): Promise<VersionVO> {
  return get<VersionVO>(`/versions/${id}`)
}

export function saveVersion(projectId: number, dto: VersionSaveDTO): Promise<PromptVersion> {
  return post<PromptVersion>(`/projects/${projectId}/versions`, dto)
}

export function updateStatus(id: number, status: string): Promise<void> {
  return put<void>(`/versions/${id}/status?status=${encodeURIComponent(status)}`)
}

export function forkVersion(id: number): Promise<PromptVersion> {
  return post<PromptVersion>(`/versions/${id}/fork`)
}

export function deleteVersion(id: number): Promise<void> {
  return del<void>(`/versions/${id}`)
}

export function diffVersions(aId: number, bId: number): Promise<DiffResult> {
  return get<DiffResult>('/versions/diff', { a: String(aId), b: String(bId) })
}
