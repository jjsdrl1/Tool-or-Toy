import { useEffect, useRef, useState } from 'react'

interface Props {
  code: string
  language: 'python' | 'typescript'
  filename: string
}

export default function CodePreview({ code, language, filename }: Props) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  async function handleCopy() {
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    if (!code) return
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!code) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
        请在左侧选择版本和配置，然后点击「生成代码」
      </div>
    )
  }

  const lines = code.split('\n')

  return (
    <div className="relative flex flex-col border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-mono text-gray-500">{filename}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              copied
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {copied ? '✓ 已复制' : '复制'}
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1 text-xs rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
          >
            下载
          </button>
        </div>
      </div>

      {/* Code area with line numbers */}
      <div className="overflow-auto max-h-[60vh]">
        <table className="w-full text-sm font-mono leading-relaxed">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td
                  className="select-none text-right text-gray-400 px-3 py-0 text-xs w-10 align-top"
                  style={{ userSelect: 'none' }}
                >
                  {idx + 1}
                </td>
                <td className="px-4 py-0 whitespace-pre text-gray-800 align-top">
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
