export interface VariableSnapshot {
  id: number
  versionId: number
  name: string
  variablesJson: string
  createdAt: string
}

export interface VariableSnapshotDTO {
  name: string
  variables: Record<string, string>
}
