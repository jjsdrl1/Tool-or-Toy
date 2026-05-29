import { useCallback, useEffect, useRef, useState } from 'react'
import type { RunRequestDTO, RunStats, SseChunk } from '../types/run'

interface UseStreamRunReturn {
  output: string
  stats: RunStats | null
  runRecordId: number | null
  isStreaming: boolean
  error: string | null
  startStream: (params: RunRequestDTO) => void
  cancelStream: () => void
  reset: () => void
}

/**
 * SSE streaming hook for LLM run output.
 *
 * Uses native fetch + ReadableStream — NOT Axios (doesn't support streaming)
 * and NOT EventSource (only supports GET without body).
 *
 * Performance: text chunks are buffered in a ref and flushed every 50ms
 * to avoid re-rendering on every single token (≈20fps refresh rate).
 */
export function useStreamRun(): UseStreamRunReturn {
  const [output, setOutput] = useState('')
  const [stats, setStats] = useState<RunStats | null>(null)
  const [runRecordId, setRunRecordId] = useState<number | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const bufferRef = useRef('')
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const flushBuffer = useCallback(() => {
    if (bufferRef.current) {
      const flushed = bufferRef.current
      bufferRef.current = ''
      setOutput((prev) => prev + flushed)
    }
  }, [])

  const clearFlushTimer = useCallback(() => {
    if (flushTimerRef.current !== null) {
      clearInterval(flushTimerRef.current)
      flushTimerRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    clearFlushTimer()
    setOutput('')
    setStats(null)
    setRunRecordId(null)
    setError(null)
    setIsStreaming(false)
    bufferRef.current = ''
  }, [clearFlushTimer])

  const startStream = useCallback(
    async (params: RunRequestDTO) => {
      // Cancel any in-progress stream
      abortRef.current?.abort()
      clearFlushTimer()

      abortRef.current = new AbortController()

      setOutput('')
      setStats(null)
      setRunRecordId(null)
      setError(null)
      setIsStreaming(true)
      bufferRef.current = ''

      // Batch-flush buffer every 50ms → ~20fps, avoids per-token re-renders
      flushTimerRef.current = setInterval(flushBuffer, 50)

      try {
        const response = await fetch('/api/runs/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: abortRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        if (!response.body) {
          throw new Error('No response body')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let lineBuffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          lineBuffer += decoder.decode(value, { stream: true })
          const lines = lineBuffer.split('\n')
          // The last element may be an incomplete line — keep it for the next chunk
          lineBuffer = lines.pop() ?? ''

          for (const line of lines) {
            // Per the SSE spec the leading space after `data:` is optional,
            // and Spring's SseEmitter emits `data:{json}` without the space.
            if (line.startsWith('data:')) {
              const raw = (line.charAt(5) === ' ' ? line.slice(6) : line.slice(5)).trim()
              if (!raw) continue
              try {
                const event = JSON.parse(raw) as SseChunk
                handleEvent(event)
              } catch {
                // Ignore malformed JSON or SSE comment lines
              }
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message)
        }
      } finally {
        clearFlushTimer()
        flushBuffer() // flush any remaining buffered text
        setIsStreaming(false)
      }
    },
    [flushBuffer, clearFlushTimer]
  )

  function handleEvent(event: SseChunk) {
    switch (event.type) {
      case 'chunk':
        // Write to buffer; the 50ms timer flushes it to state
        bufferRef.current += event.content ?? ''
        break
      case 'stats':
        setStats({
          inputTokens: event.inputTokens,
          outputTokens: event.outputTokens,
          latencyMs: event.latencyMs,
          model: event.model,
        })
        break
      case 'done':
        setRunRecordId(event.runRecordId)
        break
      case 'error':
        setError(event.message ?? '模型调用失败')
        break
    }
  }

  const cancelStream = useCallback(() => {
    abortRef.current?.abort()
    clearFlushTimer()
    flushBuffer()
    setIsStreaming(false)
  }, [clearFlushTimer, flushBuffer])

  // Cancel stream and flush timer on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (flushTimerRef.current !== null) {
        clearInterval(flushTimerRef.current)
        flushTimerRef.current = null
      }
    }
  }, [])

  return { output, stats, runRecordId, isStreaming, error, startStream, cancelStream, reset }
}
