import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProject } from '../api/projectApi'
import { listVersions } from '../api/versionApi'
import type { ProjectVO } from '../types/project'
import type { VersionVO } from '../types/version'
import { Breadcrumbs } from '../components/common/Breadcrumbs'

// ── Nav model ──────────────────────────────────────────────────
interface NavItem {
  label: string
  description: string
  path: string
  icon: JSX.Element
  accent: 'brand' | 'accent' | 'steel' | 'emerald' | 'violet'
}

// ── Pentagon vertex coordinates (% of container) ───────────────
// 5 vertices on a circle of r=42%, centered at (50%, 52%).
// First vertex at top (-90°), then every +72° clockwise.
//   x = 50 + r·sin(θ),   y = 52 - r·cos(θ)
const VERTEX_POSITIONS = [
  { left: 50,   top: 10  }, // top         (-90°)
  { left: 89.9, top: 39  }, // upper-right (-18°)
  { left: 74.7, top: 86  }, // lower-right (+54°)
  { left: 25.3, top: 86  }, // lower-left  (+126°)
  { left: 10.1, top: 39  }, // upper-left  (+198°)
] as const

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectVO | null>(null)
  const [versions, setVersions] = useState<VersionVO[]>([])
  const [versionPickerOpen, setVersionPickerOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const pickerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      getProject(Number(id)).then(setProject),
      listVersions(Number(id)).then(setVersions).catch(() => setVersions([])),
    ])
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }, [id])

  // Click-outside to close version picker
  useEffect(() => {
    if (!versionPickerOpen) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setVersionPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [versionPickerOpen])

  const sortedVersions = useMemo(
    () => [...versions].sort((a, b) => b.versionNo - a.versionNo),
    [versions]
  )

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center text-ink-subtle text-sm">
        加载中…
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center text-red-500 text-sm">
        {error || '项目不存在'}
      </div>
    )
  }

  const navItems: NavItem[] = [
    {
      label:       '打开编辑器',
      description: '编辑 Prompt 与变量',
      path:        `/projects/${id}/editor`,
      accent:      'brand',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
             strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M11 4H4v16h16v-7" />
          <path d="m18.5 2.5 3 3L12 15l-4 1 1-4Z" />
        </svg>
      ),
    },
    {
      label:       '版本对比',
      description: '左右对照两版本',
      path:        `/projects/${id}/compare`,
      accent:      'steel',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
             strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M9 3v18M15 3v18M3 9h6M3 15h6M15 9h6M15 15h6" />
        </svg>
      ),
    },
    {
      label:       '模型对比',
      description: '横评多家 API 模型',
      path:        `/projects/${id}/model-compare`,
      accent:      'accent',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
             strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <circle cx="7"  cy="12" r="3" />
          <circle cx="17" cy="12" r="3" />
          <path d="M10 12h4" />
        </svg>
      ),
    },
    {
      label:       '批量测试',
      description: '用样例批量跑模型',
      path:        `/projects/${id}/batch-test`,
      accent:      'violet',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
             strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 14h.01M12 14h4M8 18h.01M12 18h4" />
        </svg>
      ),
    },
    {
      label:       '代码导出',
      description: '生成 SDK 代码片段',
      path:        `/projects/${id}/export`,
      accent:      'emerald',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
             strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="m8 6-6 6 6 6M16 6l6 6-6 6" />
          <path d="m14 4-4 16" />
        </svg>
      ),
    },
  ]

  const accentBg: Record<NavItem['accent'], string> = {
    brand:   'bg-brand-50   text-brand-700   border-brand-100   group-hover:bg-brand-100',
    steel:   'bg-steel-50   text-steel-600   border-steel-100   group-hover:bg-steel-100',
    accent:  'bg-accent-50  text-accent-700  border-accent-100  group-hover:bg-accent-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100 group-hover:bg-emerald-100',
    violet:  'bg-violet-50  text-violet-700  border-violet-100  group-hover:bg-violet-100',
  }
  const accentRing: Record<NavItem['accent'], string> = {
    brand:   'group-hover:ring-brand-200',
    steel:   'group-hover:ring-steel-200',
    accent:  'group-hover:ring-accent-200',
    emerald: 'group-hover:ring-emerald-200',
    violet:  'group-hover:ring-violet-200',
  }

  const tags: string[] = Array.isArray(project.tags) ? project.tags : []

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      <Breadcrumbs
        items={[
          { label: '我的项目', to: '/projects' },
          { label: project.name },
        ]}
      />

      <main className="max-w-5xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        {/* ── Project header card ──────────────────────────────── */}
        <div className="pc-card p-6 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold text-ink leading-tight">{project.name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                {project.stableVersionNo != null && (
                  <span className="pc-pill-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    stable v{project.stableVersionNo}
                  </span>
                )}
                <span className="pc-pill-muted">{project.versionCount} 个版本</span>
              </div>
            </div>
          </div>
          {project.description && (
            <p className="text-ink-soft text-sm leading-relaxed">{project.description}</p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="pc-pill-brand">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Pentagon navigation constellation ────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="pc-section-label">功能星座</span>
            <span className="text-xs text-ink-subtle">点击节点进入功能 · 中央选择版本</span>
          </div>

          {/* Responsive: pentagon on sm+, vertical stack on mobile */}
          <div className="pc-card p-6 bg-gradient-to-br from-white to-gray-50/40">

            {/* ── PENTAGON (sm+) ─────────────────────────────── */}
            <div className="hidden sm:block relative w-full max-w-[560px] aspect-square mx-auto">
              {/* Decorative star skeleton */}
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full pointer-events-none"
                aria-hidden
              >
                {/* outer pentagon (connecting all 5 vertices in order) */}
                <polygon
                  points={VERTEX_POSITIONS.map((v) => `${v.left},${v.top}`).join(' ')}
                  fill="none"
                  stroke="rgba(47, 62, 78, 0.08)"
                  strokeWidth="0.4"
                  strokeDasharray="1 1"
                />
                {/* inner star: each vertex connects to the 2 non-adjacent vertices */}
                <g
                  fill="none"
                  stroke="rgba(47, 62, 78, 0.12)"
                  strokeWidth="0.35"
                >
                  {VERTEX_POSITIONS.map((v, i) => {
                    const v2 = VERTEX_POSITIONS[(i + 2) % 5]
                    return (
                      <line
                        key={i}
                        x1={v.left}
                        y1={v.top}
                        x2={v2.left}
                        y2={v2.top}
                      />
                    )
                  })}
                </g>
              </svg>

              {/* ── 5 function nodes ────────────────────────── */}
              {navItems.map((item, idx) => {
                const pos = VERTEX_POSITIONS[idx]
                return (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.path)}
                    style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
                    className={[
                      'absolute -translate-x-1/2 -translate-y-1/2',
                      'group w-[140px] flex flex-col items-center gap-2 px-3 py-3',
                      'bg-white rounded-2xl border border-gray-100 shadow-card',
                      'hover:shadow-card-hover hover:scale-[1.04]',
                      'transition-all duration-200 ease-smooth',
                      'ring-0 hover:ring-4',
                      accentRing[item.accent],
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'w-11 h-11 rounded-xl border flex items-center justify-center transition-colors',
                        accentBg[item.accent],
                      ].join(' ')}
                    >
                      {item.icon}
                    </span>
                    <span className="flex flex-col items-center gap-0.5 leading-tight">
                      <span className="text-sm font-semibold text-ink group-hover:text-brand-700 transition-colors">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-ink-subtle whitespace-nowrap">
                        {item.description}
                      </span>
                    </span>
                  </button>
                )
              })}

              {/* ── Center: version picker ──────────────────── */}
              <div
                ref={pickerRef}
                className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 w-[180px]"
              >
                <button
                  onClick={() => setVersionPickerOpen((o) => !o)}
                  className={[
                    'w-[180px] h-[180px] rounded-full',
                    'bg-gradient-to-br from-brand-700 to-brand-500',
                    'text-white shadow-elevated',
                    'flex flex-col items-center justify-center gap-1.5',
                    'transition-transform duration-200 ease-smooth',
                    'hover:scale-105 active:scale-100',
                    'ring-4 ring-white',
                  ].join(' ')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                       strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 opacity-90">
                    <path d="M3 3v5h5" />
                    <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
                    <path d="M12 7v5l4 2" />
                  </svg>
                  <span className="text-xs uppercase tracking-widest opacity-80">版本历史</span>
                  <span className="text-base font-semibold">
                    {sortedVersions.length === 0 ? '暂无' : `${sortedVersions.length} 个版本`}
                  </span>
                  {project.stableVersionNo != null && (
                    <span className="text-[10px] bg-white/15 backdrop-blur-sm rounded-full px-2 py-0.5 mt-0.5">
                      stable v{project.stableVersionNo}
                    </span>
                  )}
                </button>

                {/* Dropdown panel */}
                {versionPickerOpen && (
                  <div
                    className="absolute left-1/2 top-[calc(100%+12px)] -translate-x-1/2 w-[280px] bg-white rounded-2xl shadow-elevated border border-gray-100 z-20 flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                        选择版本进入编辑器
                      </span>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {sortedVersions.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-ink-subtle">
                          还没有版本
                          <button
                            onClick={() => navigate(`/projects/${id}/editor`)}
                            className="block mx-auto mt-2 text-brand-700 hover:text-brand-600 text-xs font-medium"
                          >
                            去编辑器创建第一个 →
                          </button>
                        </div>
                      ) : (
                        <ul className="divide-y divide-gray-100">
                          {sortedVersions.map((v) => (
                            <li key={v.id}>
                              <button
                                onClick={() => {
                                  setVersionPickerOpen(false)
                                  navigate(`/projects/${id}/editor/${v.id}`)
                                }}
                                className="w-full text-left px-4 py-2.5 hover:bg-brand-50/60 transition-colors flex items-center gap-3 group/item"
                              >
                                <span
                                  className={[
                                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                                    v.status === 'stable'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-gray-100 text-ink-muted',
                                  ].join(' ')}
                                >
                                  v{v.versionNo}
                                </span>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-sm font-medium text-ink truncate group-hover/item:text-brand-700 transition-colors">
                                    {v.note || '无备注'}
                                  </span>
                                  <span className="text-[11px] text-ink-subtle">
                                    {new Date(v.createdAt).toLocaleString('zh-CN', { hour12: false })}
                                  </span>
                                </div>
                                {v.status === 'stable' && (
                                  <span className="pc-pill-warning flex-shrink-0">stable</span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/60">
                      <button
                        onClick={() => {
                          setVersionPickerOpen(false)
                          navigate(`/projects/${id}/editor`)
                        }}
                        className="w-full text-xs text-brand-700 hover:text-brand-600 font-medium text-center"
                      >
                        + 创建新版本
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Vertical stack fallback for mobile ─────────── */}
            <div className="sm:hidden flex flex-col gap-3">
              {/* Mobile center picker */}
              <div ref={!versionPickerOpen ? undefined : pickerRef} className="relative">
                <button
                  onClick={() => setVersionPickerOpen((o) => !o)}
                  className="w-full bg-gradient-to-br from-brand-700 to-brand-500 text-white rounded-2xl shadow-card p-4 flex items-center gap-3"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                       strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 opacity-90">
                    <path d="M3 3v5h5" />
                    <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
                    <path d="M12 7v5l4 2" />
                  </svg>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-[10px] uppercase tracking-widest opacity-80">版本历史</span>
                    <span className="text-base font-semibold">
                      {sortedVersions.length === 0 ? '暂无版本' : `${sortedVersions.length} 个版本`}
                    </span>
                  </div>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="ml-auto w-5 h-5 opacity-80">
                    <path fillRule="evenodd" d="M5.3 7.7a1 1 0 0 1 1.4 0L10 11l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" clipRule="evenodd" />
                  </svg>
                </button>
                {versionPickerOpen && (
                  <div className="mt-2 bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
                    <div className="max-h-72 overflow-y-auto">
                      {sortedVersions.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-ink-subtle">
                          还没有版本
                        </div>
                      ) : (
                        <ul className="divide-y divide-gray-100">
                          {sortedVersions.map((v) => (
                            <li key={v.id}>
                              <button
                                onClick={() => {
                                  setVersionPickerOpen(false)
                                  navigate(`/projects/${id}/editor/${v.id}`)
                                }}
                                className="w-full text-left px-4 py-2.5 flex items-center gap-3"
                              >
                                <span className={[
                                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                                  v.status === 'stable'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-gray-100 text-ink-muted',
                                ].join(' ')}>
                                  v{v.versionNo}
                                </span>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-sm font-medium text-ink truncate">
                                    {v.note || '无备注'}
                                  </span>
                                  <span className="text-[11px] text-ink-subtle">
                                    {new Date(v.createdAt).toLocaleString('zh-CN', { hour12: false })}
                                  </span>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile feature list */}
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="group pc-card-hover p-4 flex items-center gap-3 text-left"
                >
                  <span className={[
                    'flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center transition-colors',
                    accentBg[item.accent],
                  ].join(' ')}>
                    {item.icon}
                  </span>
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="text-sm font-medium text-ink group-hover:text-brand-700 transition-colors">
                      {item.label}
                    </span>
                    <span className="text-xs text-ink-muted leading-relaxed">
                      {item.description}
                    </span>
                  </div>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-ink-subtle">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L10.94 10 7.23 6.29a.75.75 0 1 1 1.06-1.06l4.24 4.24a.75.75 0 0 1 0 1.06l-4.24 4.24a.75.75 0 0 1-1.08 0Z" clipRule="evenodd" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
