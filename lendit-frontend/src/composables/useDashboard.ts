import { ref } from 'vue'
import { http } from '../lib/http'
import { errorMessage } from '../lib/query'
import i18n from '../i18n/index'
import type { DashboardOverview } from '../types/api'

const t = (key: string) => i18n.global.t(key)

const EMPTY: DashboardOverview = {
  stats: { members: 0, books: 0, pendingRequests: 0, activeBorrowings: 0 },
  perDay: { borrowed: [], returned: [] },
  booksByTag: [],
  topBooks: [],
  topOwners: [],
  topBorrowers: [],
}

export function useDashboard() {
  const data = ref<DashboardOverview>({ ...EMPTY })
  const loading = ref(false)
  const error = ref('')

  async function fetchDashboard({
    from,
    to,
    month,
  }: { from?: string; to?: string; month?: string } = {}) {
    loading.value = true
    error.value = ''
    try {
      const params = new URLSearchParams()
      if (month) params.set('month', month)
      if (from && to) {
        params.set('from', from)
        params.set('to', to)
      }
      const qs = params.size ? `?${params}` : ''
      const res = await http.get<Partial<DashboardOverview>>(`/dashboard${qs}`)

      data.value = {
        ...EMPTY,
        ...res,
        stats: { ...EMPTY.stats, ...(res?.stats ?? {}) },
        perDay: { ...EMPTY.perDay, ...(res?.perDay ?? {}) },
      }
      return data.value
    } catch (err) {
      error.value = errorMessage(err, t('errors.loadDashboard'))
      throw err
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, fetchDashboard }
}
