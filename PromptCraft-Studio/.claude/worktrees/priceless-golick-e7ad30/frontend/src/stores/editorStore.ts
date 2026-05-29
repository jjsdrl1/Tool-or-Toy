import { create } from 'zustand'
import { parseVariables } from '../utils/variableParser'
import type { VersionVO } from '../types/version'

interface EditorState {
  systemPrompt: string
  userPrompt: string
  detectedVars: string[]
  variables: Record<string, string>
  selectedVersionId: number | null
  selectedPresetId: number | null
  isDirty: boolean

  setSystemPrompt: (v: string) => void
  setUserPrompt: (v: string) => void
  setVariable: (key: string, value: string) => void
  applyVariables: (incoming: Record<string, string>) => void
  setSelectedPresetId: (id: number | null) => void
  loadVersion: (version: VersionVO) => void
  resetEditor: () => void
}

function syncVars(
  systemPrompt: string,
  userPrompt: string,
  currentVariables: Record<string, string>
): { detectedVars: string[]; variables: Record<string, string> } {
  const newVars = parseVariables((systemPrompt || '') + ' ' + (userPrompt || ''))
  const variables = { ...currentVariables }
  newVars.forEach((v) => {
    if (!(v in variables)) variables[v] = ''
  })
  return { detectedVars: newVars, variables }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  systemPrompt: '',
  userPrompt: '',
  detectedVars: [],
  variables: {},
  selectedVersionId: null,
  selectedPresetId: null,
  isDirty: false,

  setSystemPrompt: (v) =>
    set((state) => ({
      systemPrompt: v,
      isDirty: true,
      ...syncVars(v, state.userPrompt, state.variables),
    })),

  setUserPrompt: (v) =>
    set((state) => ({
      userPrompt: v,
      isDirty: true,
      ...syncVars(state.systemPrompt, v, state.variables),
    })),

  setVariable: (key, value) =>
    set((state) => ({ variables: { ...state.variables, [key]: value } })),

  applyVariables: (incoming) =>
    set((state) => {
      const next = { ...state.variables }
      // Fill values for currently-detected variables that exist in the snapshot.
      state.detectedVars.forEach((v) => {
        if (incoming[v] !== undefined) next[v] = incoming[v]
      })
      return { variables: next }
    }),

  setSelectedPresetId: (id) => set({ selectedPresetId: id }),

  loadVersion: (version) => {
    const sysPr = version.systemPrompt ?? ''
    const usrPr = version.userPrompt ?? ''
    const newVars = parseVariables(sysPr + ' ' + usrPr)
    const variables: Record<string, string> = {}
    newVars.forEach((v) => { variables[v] = '' })
    set({
      systemPrompt: sysPr,
      userPrompt: usrPr,
      detectedVars: newVars,
      variables,
      selectedVersionId: version.id,
      isDirty: false,
    })
  },

  resetEditor: () =>
    set({
      systemPrompt: '',
      userPrompt: '',
      detectedVars: [],
      variables: {},
      selectedVersionId: null,
      isDirty: false,
    }),
}))
