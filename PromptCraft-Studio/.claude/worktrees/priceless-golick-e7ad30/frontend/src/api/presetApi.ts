import { get, post, put, del } from './request'
import type { ApiPreset, ApiPresetVO, ApiPresetDTO } from '../types/preset'

export function getPresets(): Promise<ApiPresetVO[]> {
  return get<ApiPresetVO[]>('/presets')
}

export function createPreset(dto: ApiPresetDTO): Promise<ApiPreset> {
  return post<ApiPreset>('/presets', dto)
}

export function updatePreset(id: number, dto: ApiPresetDTO): Promise<ApiPreset> {
  return put<ApiPreset>(`/presets/${id}`, dto)
}

export function deletePreset(id: number): Promise<void> {
  return del<void>(`/presets/${id}`)
}

export function testPreset(id: number): Promise<{ success: boolean; latencyMs: number; message: string }> {
  return post<{ success: boolean; latencyMs: number; message: string }>(`/presets/${id}/test`)
}
