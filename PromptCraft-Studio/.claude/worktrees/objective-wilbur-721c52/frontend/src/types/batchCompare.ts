export type CompareMode = 'compare_versions' | 'compare_presets'

export interface BatchCompareGroup {
  id: number
  projectId: number
  mode: CompareMode
  status: string
  name: string
  createdAt: string
  finishedAt?: string
}

export interface BatchCompareCreateDTO {
  projectId: number
  mode: CompareMode
  fixedVersionId?: number
  fixedPresetId?: number
  versionIds?: number[]
  presetIds?: number[]
  testCaseIds: number[]
  concurrency: number
}

export interface CompareColumn {
  batchRunId: number
  versionId: number
  versionLabel: string
  presetId: number
  presetLabel: string
  status: string
  successCount: number
  failedCount: number
  totalCount: number
}

export interface CellResult {
  batchRunId: number
  status: string
  outputSummary?: string
  errorMessage?: string
  inputTokens?: number
  outputTokens?: number
  latencyMs?: number
}

export interface CompareRow {
  testCaseId: number
  testCaseName: string
  cells: CellResult[]
}

export interface BatchCompareResultVO {
  id: number
  projectId: number
  mode: CompareMode
  status: string
  name: string
  createdAt: string
  finishedAt?: string
  columns: CompareColumn[]
  rows: CompareRow[]
}
