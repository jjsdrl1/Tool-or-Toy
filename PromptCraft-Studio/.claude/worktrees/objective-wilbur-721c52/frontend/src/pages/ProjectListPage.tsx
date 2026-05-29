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
    <div className="min-h-full bg-gray-50">
      {/* Page header — tinted strip with stronger bottom border */}
      <div className="bg-gradient-to-r from-brand-50/70 via-white to-white border-b-2 border-brand-100 px-6 py-5 shadow-[inset_0_-1px_0_rgba(47,62,78,0.03)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-ink tracking-tight">我的项目</h1>
            <p className="text-xs text-ink-muted">
              管理 Prompt 工程项目，支持版本化、批量测试、SDK 导出
            </p>
          </div>
          <button onClick={openCreate} className="pc-btn-primary">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10 3.75a.75.75 0 0 1 .75.75v4.75H15.5a.75.75 0 0 1 0 1.5h-4.75v4.75a.75.75 0 0 1-1.5 0V10.75H4.5a.75.75 0 0 1 0-1.5h4.75V4.5A.75.75 0 0 1 10 3.75Z" clipRule="evenodd" />
            </svg>
            新建项目
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Filter area */}
        <div className="flex flex-col gap-3">
          <div className="relative max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                <circle cx="9" cy="9" r="6" />
                <path d="m14 14 3 3" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索项目名称或描述…"
              className="pc-input pl-9"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-ink-subtle">
                <span className="font-medium uppercase tracking-wider">按标签筛选</span>
                <span className="text-ink-subtle">·</span>
                <span>多选 = 任一匹配</span>
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className="ml-auto text-brand-700 hover:text-brand-600 font-medium"
                  >
                    清除全部 ({selectedTags.length})
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => {
                  const active = selectedTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-all duration-150 ease-smooth ${
                        active
                          ? 'bg-brand-700 text-white border-brand-700 shadow-card'
                          : 'bg-white text-ink-muted border-gray-200 hover:border-brand-300 hover:text-brand-700'
                      }`}
                    >
                      {active && (
                        <svg viewBox="0 0 20 20" fill="currentColor" className="inline-block w-3 h-3 mr-1 -mt-0.5">
                          <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 0 1 1.4-1.4l2.8 2.8 6.3-6.3a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
                        </svg>
                      )}
                      {tag}
                    </button>
                  )
                })}
              </div>
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
