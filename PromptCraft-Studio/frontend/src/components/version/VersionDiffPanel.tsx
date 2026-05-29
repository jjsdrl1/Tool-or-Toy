import { useState } from 'react'
import type { DiffResult, DiffLine } from '../../types/version'

interface Props {
  diffResult: DiffResult
  title?: string
}

export function VersionDiffPanel({ diffResult, title }: Props) {
  const [systemOpen, setSystemOpen] = useState(true)
  const [userOpen, setUserOpen] = useState(true)

  const hasSystemDiff = diffResult.systemDiff.length > 0
  const hasUserDiff = diffResult.userDiff.length > 0

  return (
    <div className="flex flex-col gap-4">
      {title && <h3 className="text-sm font-semibold text-gray-700">{title}</h3>}

      {/* System Prompt diff */}
      {hasSystemDiff && (
        <DiffBlock
          title="System Prompt"
          lines={diffResult.systemDiff}
          open={systemOpen}
          onToggle={() => setSystemOpen((o) => !o)}
        />
      )}
      {!hasSystemDiff && (
        <div className="text-xs text-gray-400 italic">System Prompt 无差异</div>
      )}

      {/* User Prompt diff */}
      <DiffBlock
        title="User Prompt"
        lines={diffResult.userDiff}
        open={userOpen}
        onToggle={() => setUserOpen((o) => !o)}
      />
    </div>
  )
}

function DiffBlock({
  title,
  lines,
  open,
  onToggle,
}: {
  title: string
  lines: DiffLine[]
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        <span>{title}</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="font-mono text-xs overflow-x-auto">
          {lines.length === 0 ? (
            <div className="px-4 py-3 text-gray-400 italic">无差异</div>
          ) : (
            lines.map((line, idx) => (
              <DiffLineRow key={idx} line={line} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function DiffLineRow({ line }: { line: DiffLine }) {
  const { type, content } = line
  const cls =
    type === 'added'
      ? 'bg-green-50 text-green-800 border-l-4 border-green-400'
      : type === 'removed'
      ? 'bg-red-50 text-red-800 border-l-4 border-red-400 line-through'
      : 'text-gray-600'
  const prefix =
    type === 'added' ? '+ ' : type === 'removed' ? '- ' : '  '

  return (
    <div className={`px-4 py-0.5 whitespace-pre-wrap break-all ${cls}`}>
      {prefix}{content}
    </div>
  )
}
