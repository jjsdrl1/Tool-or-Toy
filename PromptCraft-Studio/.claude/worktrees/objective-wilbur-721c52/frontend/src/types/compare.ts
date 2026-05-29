export interface CompareRecord {
  id: number
  projectId: number
  versionAId: number
  versionBId: number
  runAId: number | null
  runBId: number | null
  winnerVersionId: number | null
  reason: string | null
  createdAt: string
}

export interface CompareRecordVO extends CompareRecord {
  versionANo: number
  versionBNo: number
}

export interface CompareCreateDTO {
  projectId: number
  versionAId: number
  versionBId: number
}
