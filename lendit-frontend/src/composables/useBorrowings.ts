import { http } from '../lib/http'
import type { Borrowing, BorrowingStatus, Paginated } from '../types/api'

export interface StatusOption {
  value: BorrowingStatus
  labelKey: string
}

export const borrowingStatuses: StatusOption[] = [
  { value: 'pending', labelKey: 'borrowings.status.pending' },
  { value: 'borrowing', labelKey: 'borrowings.status.borrowing' },
  { value: 'returned', labelKey: 'borrowings.status.returned' },
  { value: 'rejected', labelKey: 'borrowings.status.rejected' },
  { value: 'cancelled', labelKey: 'borrowings.status.cancelled' },
]
export const statusLabelKey = (s: string): string =>
  borrowingStatuses.find((x) => x.value === s)?.labelKey || 'borrowings.status.pending'

export function useBorrowings() {
  function list({
    role = 'borrower',
    status,
    page,
    limit,
  }: {
    role?: 'borrower' | 'owner'
    status?: BorrowingStatus | ''
    page?: number
    limit?: number
  } = {}) {
    const q = new URLSearchParams({ role })
    if (status) q.set('status', status)
    if (page) q.set('page', String(page))
    if (limit) q.set('limit', String(limit))
    return http.get<Paginated<Borrowing>>(`/borrowings?${q.toString()}`)
  }

  function request({
    bookId,
    startDate,
    dueDate,
  }: {
    bookId: string
    startDate: string
    dueDate: string
  }) {
    return http.post<Borrowing>('/borrowings', { bookId, startDate, dueDate })
  }

  const approve = (id: string) => http.put<Borrowing>(`/borrowings/${id}/approve`)
  const reject = (id: string) => http.put<Borrowing>(`/borrowings/${id}/reject`)
  const cancel = (id: string) => http.put<Borrowing>(`/borrowings/${id}/cancel`)
  const returnBook = (id: string) => http.put<Borrowing>(`/borrowings/${id}/return`)

  return { list, request, approve, reject, cancel, returnBook }
}
