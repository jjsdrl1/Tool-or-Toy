export interface ExportRequest {
  versionId: number
  presetId: number
  language: 'python' | 'typescript'
}

export interface ExportResult {
  code: string
  /** Slug-ified project name, used as the download filename */
  functionName: string
}
