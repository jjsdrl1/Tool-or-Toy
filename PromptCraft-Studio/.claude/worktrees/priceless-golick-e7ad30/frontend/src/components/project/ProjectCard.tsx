import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ProjectVO } from '../../types/project'

interface Props {
  project: ProjectVO
  onEdit: () => void
  onDelete: () => void
}

export function ProjectCard({ project, onEdit, onDelete }: Props) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const tags: string[] = Array.isArray(project.tags) ? project.tags : []

  const updatedAt = new Date(project.updatedAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-gray-900 leading-snug break-all">
          {project.name}
        </h3>
        {/* Three-dot menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="4" r="1.5" />
              <circle cx="10" cy="10" r="1.5" />
              <circle cx="10" cy="16" r="1.5" />
            </svg>
          </button>
          {menuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-28 bg-white rounded-lg shadow-lg border border-gray-100 z-20 overflow-hidden">
                <button
                  onClick={() => { setMenuOpen(false); onEdit() }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  编辑
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDelete() }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  删除
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-500 line-clamp-2 flex-1">
        {project.description}
      </p>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer info */}
      <div className="text-xs text-gray-400 flex flex-wrap gap-x-3 gap-y-1">
        {project.stableVersionNo != null && (
          <span>stable v{project.stableVersionNo}</span>
        )}
        <span>共 {project.versionCount} 个版本</span>
        <span>最后修改 {updatedAt}</span>
      </div>

      {/* Enter button */}
      <button
        onClick={() => navigate(`/projects/${project.id}`)}
        className="mt-1 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
      >
        进入项目
      </button>
    </div>
  )
}
