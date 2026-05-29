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
    <div className="pc-card-hover p-5 flex flex-col gap-3 group">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-ink leading-snug break-all group-hover:text-brand-700 transition-colors">
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
      <p className="text-sm text-ink-muted line-clamp-2 flex-1 leading-relaxed">
        {project.description}
      </p>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="pc-pill-brand">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer info */}
      <div className="text-xs text-ink-subtle flex flex-wrap gap-x-3 gap-y-1">
        {project.stableVersionNo != null && (
          <span className="text-emerald-600 font-medium">stable v{project.stableVersionNo}</span>
        )}
        <span>共 {project.versionCount} 个版本</span>
        <span>最后修改 {updatedAt}</span>
      </div>

      {/* Enter button */}
      <button
        onClick={() => navigate(`/projects/${project.id}`)}
        className="mt-1 pc-btn-primary w-full"
      >
        进入项目
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 transition-transform group-hover:translate-x-0.5">
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L10.94 10 7.23 6.29a.75.75 0 1 1 1.06-1.06l4.24 4.24a.75.75 0 0 1 0 1.06l-4.24 4.24a.75.75 0 0 1-1.08 0Z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  )
}
