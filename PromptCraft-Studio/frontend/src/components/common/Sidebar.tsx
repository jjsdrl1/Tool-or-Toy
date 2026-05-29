import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  description?: string
}

// ── Icons (inline SVG, 20px) ────────────────────────────────────
const IconFolder = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
)
const IconSettings = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06A2 2 0 1 1 4.13 16.92l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06A2 2 0 1 1 7.08 4.13l.06.06a1.7 1.7 0 0 0 1.87.34H9A1.7 1.7 0 0 0 10.03 3V3a2 2 0 1 1 4 0v.09c0 .68.41 1.3 1.03 1.56a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.26.62.88 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03Z" />
  </svg>
)
const IconLogo = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
       strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px]">
    <path d="M4 4h10l6 6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
    <path d="M14 4v6h6" />
    <path d="M8 14h6M8 18h4" />
  </svg>
)

const navItems: NavItem[] = [
  { to: '/projects',          label: '我的项目', icon: IconFolder,   description: 'Prompt 工程管理' },
  { to: '/settings/presets',  label: '模型配置', icon: IconSettings, description: 'API Provider 接入' },
]

export function Sidebar() {
  return (
    <aside
      className={[
        'w-60 flex-shrink-0 flex flex-col h-full',
        // ── Tinted gradient background for clear separation from content area
        'bg-gradient-to-b from-brand-50 via-white to-brand-50/40',
        // ── Thicker right border in the brand family
        'border-r-2 border-brand-100',
        // ── Inner shadow for subtle depth
        'shadow-[inset_-1px_0_0_rgba(47,62,78,0.04)]',
      ].join(' ')}
    >
      {/* ── Logo header with stronger tint ─────────────────────── */}
      <div className="px-5 py-5 border-b-2 border-brand-100/70 bg-white/40 backdrop-blur-sm flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-700 to-brand-500 text-white flex items-center justify-center shadow-card ring-2 ring-white">
          {IconLogo}
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-ink text-[15px] tracking-tight">
            PromptCraft
          </span>
          <span className="text-[11px] text-brand-700/80 tracking-wider uppercase font-medium">
            Studio
          </span>
        </div>
      </div>

      {/* Section label */}
      <div className="px-5 pt-5 pb-2 text-[11px] font-bold text-brand-700/80 uppercase tracking-wider">
        工作区
      </div>

      {/* ── Nav items ──────────────────────────────────────────── */}
      <nav className="flex-1 px-3 flex flex-col gap-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ease-smooth',
                isActive
                  ? 'bg-white text-brand-700 font-semibold shadow-card border border-brand-200/80'
                  : 'text-ink-soft border border-transparent hover:bg-white/70 hover:text-ink hover:border-brand-100',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={[
                    'flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
                    isActive
                      ? 'bg-brand-700 text-white shadow-card'
                      : 'bg-white/80 text-ink-muted border border-brand-100/60 group-hover:bg-brand-50 group-hover:text-brand-700 group-hover:border-brand-200',
                  ].join(' ')}
                >
                  {item.icon}
                </span>
                <span className="flex flex-col leading-tight">
                  <span>{item.label}</span>
                  {item.description && (
                    <span className="text-[11px] text-ink-subtle font-normal">
                      {item.description}
                    </span>
                  )}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-t-2 border-brand-100/70 bg-white/40 backdrop-blur-sm flex items-center justify-between">
        <span className="text-[11px] text-ink-muted font-medium">v1.0 · single-machine</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
      </div>
    </aside>
  )
}
