function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 将 {{key}} 替换为 vars[key]；key 不存在时保留原始占位符 */
export function renderPrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name) => vars[name] ?? match)
}

/**
 * 生成带高亮的 HTML 预览。
 * - 已填充变量：用转义后的值替换
 * - 未填充变量：用 <mark> 高亮
 * - 换行转 <br>
 */
export function previewPrompt(template: string, vars: Record<string, string>): string {
  // Split on {{...}} while keeping the delimiters
  const parts = template.split(/(\{\{\w+\}\})/g)
  return parts
    .map((part) => {
      const match = part.match(/^\{\{(\w+)\}\}$/)
      if (match) {
        const name = match[1]
        const val = vars[name]
        if (val && val.trim()) return escapeHtml(val)
        return `<mark class="bg-amber-100 text-amber-800 rounded px-0.5">{{${name}}}</mark>`
      }
      // Plain text: escape HTML then convert newlines
      return escapeHtml(part).replace(/\n/g, '<br>')
    })
    .join('')
}
