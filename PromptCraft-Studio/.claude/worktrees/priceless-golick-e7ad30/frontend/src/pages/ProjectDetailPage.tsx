import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProject } from '../api/projectApi'
import type { ProjectVO } from '../types/project'
import type { VersionVO } from '../types/version'
import { VersionTimeline } from '../components/version/VersionTimeline'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectVO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getProject(Number(id))
      .then(setProject)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
        加载中…
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500">
        {error || '项目不存在'}
      </div>
    )
  }

  const navItems = [
    { label: '打开编辑器', path: `/projects/${id}/editor` },
    { label: '版本对比',   path: `/projects/${id}/compare` },
    { label: '批量测试',   path: `/projects/${id}/batch-test` },
    { label: '代码导出',   path: `/projects/${id}/export` },
  ]

  const tags: string[] = Array.isArray(project.tags) ? project.tags : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/projects')}
          className="text-gray-400 hover:text-indigo-600 text-sm"
        >
          ← 返回列表
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-sm text-gray-500">PromptCraft Studio</span>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Project header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              {project.stableVersionNo != null && (
                <span className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 mt-1 inline-block">
                  stable v{project.stableVersionNo}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {project.versionCount} 个版本
            </span>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">{project.description}</p>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
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
        </div>

        {/* Navigation buttons */}
        <div className="flex flex-wrap gap-3">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Version timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">版本历史</h2>
          <VersionTimeline
            projectId={Number(id)}
            onVersionSelect={(v: VersionVO) => navigate(`/projects/${id}/editor/${v.id}`)}
          />
        </div>
      </main>
    </div>
  )
}
