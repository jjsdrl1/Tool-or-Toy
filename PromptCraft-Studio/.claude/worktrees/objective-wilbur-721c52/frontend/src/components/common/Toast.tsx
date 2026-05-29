import { create } from 'zustand'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  message: string
}

interface ToastStore {
  toasts: ToastItem[]
  add: (type: ToastType, message: string) => void
  remove: (id: string) => void
}

const borderColors: Record<ToastType, string> = {
  success: 'border-green-500',
  error: 'border-red-500',
  warning: 'border-amber-500',
  info: 'border-blue-500',
}

const iconColors: Record<ToastType, string> = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
}

const icons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (type, message) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 3000)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function useToast() {
  const add = useToastStore((s) => s.add)
  return {
    toast: {
      success: (msg: string) => add('success', msg),
      error: (msg: string) => add('error', msg),
      warning: (msg: string) => add('warning', msg),
      info: (msg: string) => add('info', msg),
    },
  }
}

export function ToastContainer() {
  const { toasts, remove } = useToastStore()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`bg-white shadow-lg rounded-lg px-4 py-3 border-l-4 w-80 flex items-start gap-3 pointer-events-auto ${borderColors[t.type]}`}
        >
          <span className={`text-sm font-bold flex-shrink-0 mt-0.5 ${iconColors[t.type]}`}>
            {icons[t.type]}
          </span>
          <span className="text-sm text-gray-700 flex-1 min-w-0 break-words">{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0 text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
