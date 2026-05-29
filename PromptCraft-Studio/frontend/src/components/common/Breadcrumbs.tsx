import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

export interface Crumb {
  label: string
  to?: string
}

interface Props {
  items: Crumb[]
  actions?: ReactNode
}

/**
 * Breadcrumb-style page header.
 *
 * Renders a "Project → Editor" trail on the left and an optional action
 * slot (buttons, pills) on the right. Used by all sub-pages to keep the
 * "where am I + how to go back" pattern consistent.
 *
 * Visual: subtle brand-tinted gradient + thicker brand-100 bottom border
 * so the header reads as a distinct band, not blending into white cards
 * below.
 */
export function Breadcrumbs({ items, actions }: Props) {
  return (
    <nav
      className={[
        'px-6 py-3 flex items-center gap-2 flex-shrink-0',
        // Tinted gradient: hint of brand on the left fading to white
        'bg-gradient-to-r from-brand-50/70 via-white to-white',
        // Stronger bottom border in brand family
        'border-b-2 border-brand-100',
        // Tiny inner shadow for "panel" feel
        'shadow-[inset_0_-1px_0_rgba(47,62,78,0.03)]',
      ].join(' ')}
    >
      <ol className="flex items-center gap-1.5 flex-wrap min-w-0">
        {items.map((c, idx) => {
          const isLast = idx === items.length - 1
          return (
            <li key={`${c.label}-${idx}`} className="flex items-center gap-1.5 min-w-0">
              {c.to && !isLast ? (
                <Link
                  to={c.to}
                  className="text-sm text-ink-muted hover:text-brand-700 transition-colors truncate max-w-[200px] font-medium"
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  className={[
                    'text-sm truncate max-w-[260px]',
                    isLast ? 'text-ink font-semibold' : 'text-ink-muted font-medium',
                  ].join(' ')}
                >
                  {c.label}
                </span>
              )}
              {!isLast && (
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-3.5 h-3.5 text-brand-300 flex-shrink-0"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M7.21 14.77a.75.75 0 0 1 .02-1.06L10.94 10 7.23 6.29a.75.75 0 1 1 1.06-1.06l4.24 4.24a.75.75 0 0 1 0 1.06l-4.24 4.24a.75.75 0 0 1-1.08 0Z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </li>
          )
        })}
      </ol>
      {actions && <div className="ml-auto flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </nav>
  )
}
