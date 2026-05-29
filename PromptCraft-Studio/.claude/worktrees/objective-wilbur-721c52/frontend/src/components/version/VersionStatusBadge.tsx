interface Props {
  status: string
}

const CONFIG: Record<string, { label: string; cls: string }> = {
  draft:      { label: '草稿',   cls: 'bg-gray-100 text-gray-600' },
  stable:     { label: '✓ 稳定', cls: 'bg-green-100 text-green-700' },
  deprecated: { label: '已废弃', cls: 'bg-red-100 text-red-500 line-through' },
}

export function VersionStatusBadge({ status }: Props) {
  const cfg = CONFIG[status] ?? CONFIG.draft
  return (
    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}
