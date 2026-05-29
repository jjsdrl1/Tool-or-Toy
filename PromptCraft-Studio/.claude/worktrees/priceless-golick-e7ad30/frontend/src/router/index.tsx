import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '../components/common/Layout'
import ProjectListPage from '../pages/ProjectListPage'
import ProjectDetailPage from '../pages/ProjectDetailPage'
import PromptEditorPage from '../pages/PromptEditorPage'
import VersionComparePage from '../pages/VersionComparePage'
import BatchTestPage from '../pages/BatchTestPage'
import CodeExportPage from '../pages/CodeExportPage'
import ModelPresetPage from '../pages/ModelPresetPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/projects" replace />,
  },
  {
    element: <Layout />,
    children: [
      { path: '/projects', element: <ProjectListPage /> },
      { path: '/projects/:id', element: <ProjectDetailPage /> },
      { path: '/projects/:id/editor', element: <PromptEditorPage /> },
      { path: '/projects/:id/editor/:vid', element: <PromptEditorPage /> },
      { path: '/projects/:id/compare', element: <VersionComparePage /> },
      { path: '/projects/:id/batch-test', element: <BatchTestPage /> },
      { path: '/projects/:id/export', element: <CodeExportPage /> },
      { path: '/settings/presets', element: <ModelPresetPage /> },
    ],
  },
])
