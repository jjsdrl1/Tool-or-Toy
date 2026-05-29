import { useState, useEffect, KeyboardEvent } from 'react'
import type { ProjectVO, ProjectDTO } from '../../types/project'
import { useProjectStore } from '../../stores/projectStore'
import { useToast } from '../common/Toast'

interface Props {
  project?: ProjectVO
  onSuccess: () => void
  onClose: () => void
}

export function ProjectForm({ project, onSuccess, onClose }: Props) {
  const { createProject, updateProject } = useProjectStore()
  const { toast } = useToast()

  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [tags, setTags] = useState<string[]>(
    Array.isArray(project?.tags) ? project.tags : []
  )
  const [tagInput, setTagInput] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description)
      setTags(Array.isArray(project.tags) ? project.tags : [])
    }
  }, [project])

  const addTag = (raw: string) => {
    const trimmed = raw.replace(/,/g, '').trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed])
    }
    setTagInput('')
  }

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1))
    }
  }

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  const handleSubmit = async () => {
    if (!name.trim()) { setError('请填写项目名称'); return }
    if (!description.trim()) { setError('请填写项目描述'); return }
    setError('')
    setSubmitting(true)
    try {
      const dto: ProjectDTO = { name: name.trim(), description: description.trim(), tags }
      if (project) {
        await updateProject(project.id, dto)
        toast.success('项目已更新')
      } else {
        await createProject(dto)
        toast.success('项目创建成功')
      }
      onSuccess()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {project ? '编辑项目' : '新建项目'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            项目名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入项目名称"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            项目描述 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="请描述这个 Prompt 项目的用途和目标"
            rows={3}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">标签</label>
          <div className="flex flex-wrap gap-1.5 border border-gray-300 rounded-lg px-3 py-2 min-h-[40px] focus-within:ring-2 focus-within:ring-indigo-500">
            {tags.map((tag) => (
              <span
                key={tag}
                className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs flex items-center gap-1"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="text-blue-400 hover:text-blue-700 leading-none"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={() => { if (tagInput.trim()) addTag(tagInput) }}
              placeholder={tags.length === 0 ? '输入标签，按 Enter 或逗号添加' : ''}
              className="flex-1 min-w-[120px] text-sm outline-none bg-transparent"
            />
          </div>
        </div>

        {/* Error */}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {submitting ? '提交中…' : project ? '保存修改' : '创建项目'}
          </button>
        </div>
      </div>
    </div>
  )
}
