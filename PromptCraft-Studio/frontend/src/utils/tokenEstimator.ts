/** 中文字符正则 */
const ZH_REGEX = /[一-鿿]/g

/**
 * 粗略估算 token 数：
 * - 中文字符：2 chars ≈ 1 token
 * - 其他字符：4 chars ≈ 1 token
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  const zhCount = (text.match(ZH_REGEX) ?? []).length
  const otherCount = text.length - zhCount
  return Math.ceil(zhCount / 2) + Math.ceil(otherCount / 4)
}
