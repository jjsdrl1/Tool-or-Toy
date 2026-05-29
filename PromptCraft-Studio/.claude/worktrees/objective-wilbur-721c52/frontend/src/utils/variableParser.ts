/** 从文本中提取 {{变量名}}，去重，保持首次出现顺序 */
export function parseVariables(text: string): string[] {
  if (!text) return []
  const regex = /\{\{(\w+)\}\}/g
  const seen = new Set<string>()
  const result: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1])
      result.push(match[1])
    }
  }
  return result
}
