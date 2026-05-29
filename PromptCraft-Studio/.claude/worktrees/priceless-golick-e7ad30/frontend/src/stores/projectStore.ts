import { create } from 'zustand'
import * as api from '../api/projectApi'
import type { ProjectVO, ProjectDTO, ProjectFilter } from '../types/project'

interface ProjectState {
  projects: ProjectVO[]
  currentProject: ProjectVO | null
  loading: boolean
  fetchProjects: (filter?: ProjectFilter) => Promise<void>
  createProject: (dto: ProjectDTO) => Promise<void>
  updateProject: (id: number, dto: ProjectDTO) => Promise<void>
  deleteProject: (id: number) => Promise<void>
  setCurrentProject: (p: ProjectVO) => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,

  fetchProjects: async (filter) => {
    set({ loading: true })
    try {
      const projects = await api.getProjects(filter)
      set({ projects })
    } catch (e) {
      console.error('fetchProjects failed', e)
      throw e
    } finally {
      set({ loading: false })
    }
  },

  createProject: async (dto) => {
    try {
      await api.createProject(dto)
      await get().fetchProjects()
    } catch (e) {
      console.error('createProject failed', e)
      throw e
    }
  },

  updateProject: async (id, dto) => {
    try {
      await api.updateProject(id, dto)
      await get().fetchProjects()
    } catch (e) {
      console.error('updateProject failed', e)
      throw e
    }
  },

  deleteProject: async (id) => {
    try {
      await api.deleteProject(id)
      await get().fetchProjects()
    } catch (e) {
      console.error('deleteProject failed', e)
      throw e
    }
  },

  setCurrentProject: (p) => set({ currentProject: p }),
}))
