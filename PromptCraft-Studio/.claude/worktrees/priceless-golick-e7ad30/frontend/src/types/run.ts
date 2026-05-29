export interface RunRecord {
  id: number
  projectId: number
  versionId: number | null
  apiPresetId: number | null
  variablesJson: string
  renderedSystemPrompt: string | null
  renderedUserPrompt: string | null
  outputText: string | null
  inputChars: number | null
  outputChars: number | null
  inputTokens: number | null
  outputTokens: number | null
  latencyMs: number | null
  success: boolean
  errorMessage: string | null
  modelProvider: string | null
  modelName: string | null
  createdAt: string
}

export interface RunStats {
  inputTokens: number
  outputTokens: number
  latencyMs: number
  model: string
}

export interface RunRequestDTO {
  versionId: number
  presetId: number
  variablesJson: string
}

// SSE event types received from backend
export type SseChunk =
  | { type: 'chunk'; content: string }
  | { type: 'stats'; inputTokens: number; outputTokens: number; latencyMs: number; model: string }
  | { type: 'done'; runRecordId: number }
  | { type: 'error'; message: string }
