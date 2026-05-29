import { get, post, put, del } from './request'
import type { Project, ProjectVO, ProjectDTO, ProjectFilter } from '../types/project'

export function getProjects(filter: ProjectFilter = {}): Promise<ProjectVO[]> {
  const params: Record<string, string> = {}
  if (filter.keyword) params.keyword = filter.keyword
  if (filter.tags && filter.tags.length > 0) params.tags = filter.tags.join(',')
  return get<ProjectVO[]>('/projects', Object.keys(params).length > 0 ? params : undefined)
}

export function getProject(id: number): Promise<ProjectVO> {
  return get<ProjectVO>(`/projects/${id}`)
}

export function createProject(dto: ProjectDTO): Promise<Project> {
  return post<Project>('/projects', dto)
}

export function updateProject(id: number, dto: ProjectDTO): Promise<Project> {
  return put<Project>(`/projects/${id}`, dto)
}

export function deleteProject(id: number): Promise<void> {
  return del<void>(`/projects/${id}`)
}

export function setStableVersion(projectId: number, versionId: number): Promise<void> {
  return put<void>(`/projects/${projectId}/stable?versionId=${versionId}`)
}
