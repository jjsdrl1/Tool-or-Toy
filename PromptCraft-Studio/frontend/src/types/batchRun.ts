export type BatchRunStatus = 'pending' | 'running' | 'done' | 'failed';
export type ItemStatus = 'pending' | 'running' | 'done' | 'failed';

export interface BatchRun {
  id: number;
  projectId: number;
  versionId: number;
  presetId: number;
  status: BatchRunStatus;
  totalCount: number;
  successCount: number;
  failedCount: number;
  createdAt: string;
  finishedAt?: string;
}

export interface BatchRunItemVO {
  id: number;
  testCaseId: number;
  testCaseName: string;
  status: ItemStatus;
  errorMessage?: string;
  outputSummary?: string;
}

export interface BatchRunStatusVO extends BatchRun {
  items: BatchRunItemVO[];
}

export interface BatchRunCreateDTO {
  projectId: number;
  versionId: number;
  presetId: number;
  testCaseIds: number[];
  concurrency: number;
}
