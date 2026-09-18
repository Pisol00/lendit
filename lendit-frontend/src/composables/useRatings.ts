import { ref } from 'vue'
import { http } from '../lib/http'
import { toQuery, errorMessage, emptyPagination } from '../lib/query'
import i18n from '../i18n/index'
import type { Paginated, Rating, RatingSummary, RaterRole } from '../types/api'
import type { OverdueLike } from '../utils/format'

const t = (key: string) => i18n.global.t(key)

export const RATING_WINDOW_DAYS = 7

const EMPTY_SUMMARY: RatingSummary = {
  overall: { average: 0, count: 0 },
  asOwner: { average: 0, count: 0 },
  asBorrower: { average: 0, count: 0 },
}

export function isWithinRatingWindow(
  borrowing: (OverdueLike & { returnedDate?: string | Date }) | null | undefined,
): boolean {
  if (!borrowing || borrowing.status !== 'returned' || !borrowing.returnedDate) return false
  const deadline = new Date(borrowing.returnedDate).getTime() + RATING_WINDOW_DAYS * 86400000
  return Date.now() <= deadline
}

export function useRatings() {
  const ratings = ref<Rating[]>([])
  const pagination = ref({ ...emptyPagination })
  const summary = ref<RatingSummary>({ ...EMPTY_SUMMARY })
  const loading = ref(false)
  const error = ref('')

  async function fetchAccountRatings(
    accountId: string,
    { role, page, limit }: { role?: RaterRole; page?: number; limit?: number } = {},
  ) {
    loading.value = true
    error.value = ''
    try {
      const qs = toQuery({ role, page, limit })
      const data = await http.get<Paginated<Rating>>(
        `/ratings/accounts/${accountId}${qs ? `?${qs}` : ''}`,
      )
      ratings.value = data.items ?? []
      if (data.pagination) pagination.value = data.pagination
      return data
    } catch (err) {
      error.value = errorMessage(err, t('errors.loadRatings'))
      ratings.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchSummary(accountId: string) {
    error.value = ''
    try {
      const data = await http.get<RatingSummary>(`/ratings/accounts/${accountId}/summary`)
      summary.value = { ...EMPTY_SUMMARY, ...(data ?? {}) }
      return summary.value
    } catch (err) {
      error.value = errorMessage(err, t('errors.loadSummary'))
      summary.value = { ...EMPTY_SUMMARY }
      throw err
    }
  }

  function fetchBorrowingRatings(borrowingId: string) {
    return http.get<Rating[]>(`/ratings/borrowings/${borrowingId}`)
  }

  function createRating({
    borrowingId,
    rating,
    comment,
  }: {
    borrowingId: string
    rating: number
    comment?: string
  }) {
    return http.post<Rating>('/ratings', { borrowingId, rating, comment })
  }

  return {
    ratings,
    pagination,
    summary,
    loading,
    error,
    fetchAccountRatings,
    fetchSummary,
    fetchBorrowingRatings,
    createRating,
  }
}

export function useRatingModeration() {
  const ratings = ref<Rating[]>([])
  const pagination = ref({ ...emptyPagination })
  const loading = ref(false)
  const error = ref('')

  async function fetchModeration({
    rating,
    raterId,
    rateeId,
    search,
    status,
    page,
    limit,
  }: {
    rating?: number
    raterId?: string
    rateeId?: string
    search?: string

    status?: 'live' | 'deleted' | 'all' | ''
    page?: number
    limit?: number
  } = {}) {
    loading.value = true
    error.value = ''
    try {
      const qs = toQuery({ rating, raterId, rateeId, search, status, page, limit })
      const data = await http.get<Paginated<Rating>>(`/ratings/moderation${qs ? `?${qs}` : ''}`)
      ratings.value = data.items ?? []
      if (data.pagination) pagination.value = data.pagination
      return data
    } catch (err) {
      error.value = errorMessage(err, t('errors.loadRatingList'))
      ratings.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  function removeRating(id: string) {
    return http.delete(`/ratings/${id}`)
  }

  function restoreRating(id: string) {
    return http.put(`/ratings/${id}/restore`)
  }

  return {
    ratings,
    pagination,
    loading,
    error,
    fetchModeration,
    removeRating,
    restoreRating,
  }
}
