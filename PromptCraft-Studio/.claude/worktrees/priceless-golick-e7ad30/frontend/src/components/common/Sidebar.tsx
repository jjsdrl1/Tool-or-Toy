import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/projects', label: '我的项目', icon: '📁' },
  { to: '/settings/presets', label: '模型配置', icon: '⚙️' },
]

export function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <span className="font-bold text-indigo-700 text-sm tracking-tight leading-snug">
          PromptCraft Studio
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Version */}
      <div className="px-5 py-4 text-xs text-gray-400">v1.0</div>
    </aside>
  )
}
