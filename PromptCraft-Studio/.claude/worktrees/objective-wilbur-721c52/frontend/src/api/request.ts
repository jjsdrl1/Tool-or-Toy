const BASE_URL = '/api'

interface ApiResponse<T> {
  success: boolean
  code: number
  message?: string
  data: T
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string>),
    },
    ...init,
  })

  const json: ApiResponse<T> = await response.json()

  if (!json.success) {
    throw new Error(json.message ?? '请求失败')
  }

  return json.data
}

export function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = params
    ? `${path}?${new URLSearchParams(params).toString()}`
    : path
  return request<T>(url, { method: 'GET' })
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

export function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

export function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' })
}
