export type VersionStatus = 'draft' | 'stable' | 'deprecated'

export interface PromptVersion {
  id: number
  projectId: number
  versionNo: number
  systemPrompt: string | null
  userPrompt: string
  note: string
  status: VersionStatus
  modelProvider: string | null
  modelName: string | null
  temperature: number | null
  maxTokens: number | null
  createdAt: string
}

export interface VersionVO extends PromptVersion {
  // future: run stats etc.
}

export interface VersionSaveDTO {
  systemPrompt?: string
  userPrompt: string
  note: string
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
}

export interface DiffResult {
  systemDiff: DiffLine[]
  userDiff: DiffLine[]
}
