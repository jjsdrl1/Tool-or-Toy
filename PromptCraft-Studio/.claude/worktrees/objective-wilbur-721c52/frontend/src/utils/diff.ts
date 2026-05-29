export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
}

/** 基于 LCS 的逐行 diff，不依赖外部库 */
export function diffLines(a: string, b: string): DiffLine[] {
  const aLines = a ? a.split('\n') : []
  const bLines = b ? b.split('\n') : []
  const m = aLines.length
  const n = bLines.length

  // Build LCS DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (aLines[i - 1] === bLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Iterative backtrack (reversed, then reverse result)
  const result: DiffLine[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aLines[i - 1] === bLines[j - 1]) {
      result.push({ type: 'unchanged', content: aLines[i - 1] })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'added', content: bLines[j - 1] })
      j--
    } else {
      result.push({ type: 'removed', content: aLines[i - 1] })
      i--
    }
  }
  return result.reverse()
}
