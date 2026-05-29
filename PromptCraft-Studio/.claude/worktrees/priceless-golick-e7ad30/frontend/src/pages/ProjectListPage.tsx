import { useEffect, useMemo, useState } from 'react'
import { useProjectStore } from '../stores/projectStore'
import { ProjectCard } from '../components/project/ProjectCard'
import { ProjectForm } from '../components/project/ProjectForm'
import { EmptyState } from '../components/common/EmptyState'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { useToast } from '../components/common/Toast'
import type { ProjectVO } from '../types/project'

export default function ProjectListPage() {
  const { projects, loading, fetchProjects } = useProjectStore()
  const { toast } = useToast()

  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ProjectVO | undefined>(undefined)
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<ProjectVO | null>(null)

  // Initial load
  useEffect(() => {
    fetchProjects()
  }, [])

  // Debounce keyword
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 500)
    return () => clearTimeout(timer)
  }, [keyword])

  // Re-fetch when filter changes
  useEffect(() => {
    fetchProjects({
      keyword: debouncedKeyword || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
    })
  }, [debouncedKeyword, selectedTags])

  // Aggregate all unique tags from current projects list
  const allTags = useMemo(
    () => [...new Set(projects.flatMap((p) => (Array.isArray(p.tags) ? p.tags : [])))],
    [projects]
  )

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const openCreate = () => { setEditTarget(undefined); setFormOpen(true) }
  const openEdit = (p: ProjectVO) => { setEditTarget(p); setFormOpen(true) }

  const handleDeleteClick = (p: ProjectVO) => {
    setDeleteConfirmProject(p)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmProject) return
    const target = deleteConfirmProject
    setDeleteConfirmProject(null)
    try {
      await useProjectStore.getState().deleteProject(target.id)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">我的项目</h1>
        <button
          onClick={openCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + 新建项目
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Filter area */}
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索项目名称或描述…"
            className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <SkeletonGrid />
        ) : projects.length === 0 ? (
          <EmptyState
            icon="✦"
            title="还没有项目"
            description="创建你的第一个 Prompt 项目，开始工程化管理"
            actionLabel="创建第一个项目"
            onAction={openCreate}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onEdit={() => openEdit(p)}
                onDelete={() => handleDeleteClick(p)}
              />
            ))}
          </div>
        )}
      </main>

      {formOpen && (
        <ProjectForm
          project={editTarget}
          onSuccess={() => setFormOpen(false)}
          onClose={() => setFormOpen(false)}
        />
      )}

      <ConfirmDialog
        isOpen={deleteConfirmProject !== null}
        title="删除项目"
        message={`确认删除项目「${deleteConfirmProject?.name ?? ''}」？此操作不可撤销。`}
        confirmText="删除"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmProject(null)}
      />
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-3 animate-pulse"
        >
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-5/6" />
          <div className="h-8 bg-gray-100 rounded-lg mt-2" />
        </div>
      ))}
    </div>
  )
}
