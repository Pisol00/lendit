import { ref } from 'vue'
import { http } from '../lib/http'
import { toQuery, errorMessage, emptyPagination } from '../lib/query'
import type { QueryValue } from '../lib/query'
import i18n from '../i18n/index'
import type { Account, Paginated } from '../types/api'

const t = (key: string) => i18n.global.t(key)

export function useAccounts() {
  const accounts = ref<Account[]>([])
  const pagination = ref({ ...emptyPagination })
  const loading = ref(false)
  const error = ref('')

  async function fetchAccounts(params: Record<string, QueryValue> = {}) {
    loading.value = true
    error.value = ''
    try {
      const qs = toQuery(params)
      const data = await http.get<Paginated<Account>>(`/accounts${qs ? `?${qs}` : ''}`)
      accounts.value = data.items ?? []
      if (data.pagination) pagination.value = data.pagination
      return data
    } catch (err) {
      error.value = errorMessage(err, t('errors.loadAccounts'))
      accounts.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  function fetchAccount(id: string) {
    return http.get<Account>(`/accounts/${id}`)
  }

  const setStatus = (id: string, isActive: boolean) =>
    http.put<Account>(`/accounts/${id}/status`, { isActive })
  const removeAccount = (id: string) => http.delete(`/accounts/${id}`)

  return {
    accounts,
    pagination,
    loading,
    error,
    fetchAccounts,
    fetchAccount,
    setStatus,
    removeAccount,
  }
}
