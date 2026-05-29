import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

/**
 * Top-level shell.
 *
 * Layout = fixed sidebar + scrollable main area. Pages may either:
 *   - Use `min-h-full` for "long page that scrolls inside <main>"
 *     (ProjectList, ProjectDetail, ModelPreset, BatchTest, CodeExport, Compare).
 *   - Use `h-full` for "fills viewport, internal panels scroll instead"
 *     (PromptEditor — 3-column layout that should not overflow).
 */
export function Layout() {
  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
