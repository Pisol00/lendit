import { ApiError } from './http'

export type QueryValue = string | number | boolean | null | undefined

export function toQuery(params: Record<string, QueryValue>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    q.set(k, String(v))
  }
  return q.toString()
}

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.message) return err.message
  if (err instanceof Error && err.message) return err.message
  return fallback
}

export const emptyPagination = { page: 1, limit: 0, total: 0, totalPages: 1 }
