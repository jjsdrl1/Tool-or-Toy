export interface ApiPreset {
  id: number
  name: string
  provider: string
  baseUrl: string
  modelName: string
  temperature: number
  maxTokens: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface ApiPresetVO extends ApiPreset {
  apiKeyMasked: string
}

export interface ApiPresetDTO {
  name: string
  provider: string
  baseUrl: string
  apiKey?: string   // 留空表示编辑时不修改
  modelName: string
  temperature: number
  maxTokens: number
  enabled: boolean
}
