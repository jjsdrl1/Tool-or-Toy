export interface Project {
  id: number
  name: string
  description: string
  tags: string[]
  stableVersionId: number | null
  createdAt: string
  updatedAt: string
}

export interface ProjectVO extends Project {
  versionCount: number
  stableVersionNo?: number
}

export interface ProjectDTO {
  name: string
  description: string
  tags: string[]
}

export interface ProjectFilter {
  keyword?: string
  tags?: string[]
}
