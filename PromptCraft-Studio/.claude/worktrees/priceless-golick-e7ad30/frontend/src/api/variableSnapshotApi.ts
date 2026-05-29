import { del, get, post } from './request'
import type { VariableSnapshot, VariableSnapshotDTO } from '../types/variableSnapshot'

export const variableSnapshotApi = {
  list(versionId: number): Promise<VariableSnapshot[]> {
    return get(`/versions/${versionId}/variable-snapshots`)
  },

  create(versionId: number, dto: VariableSnapshotDTO): Promise<VariableSnapshot> {
    return post(`/versions/${versionId}/variable-snapshots`, dto)
  },

  remove(id: number): Promise<void> {
    return del(`/variable-snapshots/${id}`)
  },
}
