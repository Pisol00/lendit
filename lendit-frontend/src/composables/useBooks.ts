import { ref } from 'vue'
import { http } from '../lib/http'
import { toQuery, errorMessage, emptyPagination } from '../lib/query'
import type { QueryValue } from '../lib/query'
import i18n from '../i18n/index'
import type { Book, Paginated } from '../types/api'

const t = (key: string) => i18n.global.t(key)

export interface BookPayload {
  title: string
  author: string
  publisher: string
  edition: number
  isbn: string
  cover?: string
  quantity: number
  tags: string[]
}

export function useBooks() {
  const books = ref<Book[]>([])
  const pagination = ref({ ...emptyPagination })
  const loading = ref(false)
  const error = ref('')

  async function fetchBooks(params: Record<string, QueryValue> = {}) {
    loading.value = true
    error.value = ''
    try {
      const qs = toQuery(params)
      const data = await http.get<Paginated<Book>>(`/books${qs ? `?${qs}` : ''}`)
      books.value = data.items ?? []
      if (data.pagination) pagination.value = data.pagination
      return data
    } catch (err) {
      error.value = errorMessage(err, t('errors.loadBooks'))
      books.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchBook(id: string) {
    loading.value = true
    error.value = ''
    try {
      return await http.get<Book>(`/books/${id}`)
    } catch (err) {
      error.value = errorMessage(err, t('errors.loadBook'))
      throw err
    } finally {
      loading.value = false
    }
  }

  function createBook(payload: BookPayload) {
    return http.post<Book>('/books', payload)
  }

  function updateBook(id: string, payload: BookPayload) {
    return http.put<Book>(`/books/${id}`, payload)
  }

  function removeBook(id: string) {
    return http.delete(`/books/${id}`)
  }

  return {
    books,
    pagination,
    loading,
    error,
    fetchBooks,
    fetchBook,
    createBook,
    updateBook,
    removeBook,
  }
}
