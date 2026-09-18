import i18n from '../i18n/index'
import type { FieldError } from '../types/api'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

const t = (key: string, named?: Record<string, unknown>) =>
  named ? i18n.global.t(key, named) : i18n.global.t(key)

interface ApiErrorOptions {
  status?: number
  errors?: FieldError[]
  requestId?: string
}

export class ApiError extends Error {
  status?: number

  errors?: FieldError[]
  requestId?: string

  constructor(message: string, { status, errors, requestId }: ApiErrorOptions = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.requestId = requestId
  }
}

let tokenGetter: () => string | null = () => null
export function setTokenGetter(fn: () => string | null) {
  tokenGetter = fn
}

interface ErrorBody {
  message?: string
  errors?: FieldError[]
  requestId?: string
}

function messageFromBody(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const b = body as ErrorBody
    if (Array.isArray(b.errors) && b.errors.length) {
      return b.errors.map((e) => e.message).join(', ')
    }
    if (typeof b.message === 'string') return b.message
  }
  return `Request failed (${status})`
}

export interface RequestOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>

  auth?: boolean
}

export async function request<T = unknown>(
  path: string,
  { method = 'GET', body, headers, auth = true }: RequestOptions = {},
): Promise<T> {
  const token = auth ? tokenGetter() : null

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  } catch {
    throw new ApiError(t('errors.network'), { status: 0 })
  }

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    const b = (data ?? {}) as ErrorBody
    throw new ApiError(messageFromBody(data, res.status), {
      status: res.status,
      errors: b.errors,
      requestId: b.requestId ?? res.headers.get('x-request-id') ?? undefined,
    })
  }
  return data as T
}

export const http = {
  get: <T = unknown>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  put: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PUT', body }),
  delete: <T = unknown>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
}
