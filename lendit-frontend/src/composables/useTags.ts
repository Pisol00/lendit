import { ref } from 'vue'
import { http } from '../lib/http'
import type { Tag } from '../types/api'

export interface TagDetail {
  name: string
  bookCount: number
}

export function useTags() {
  const tags = ref<string[]>([])
  const tagDetails = ref<TagDetail[]>([])
  const loading = ref(false)

  async function fetchTags() {
    loading.value = true
    try {
      const data = await http.get<Tag[]>('/tags')
      const rows = Array.isArray(data) ? data : []
      tagDetails.value = rows.map((row) => ({
        name: row._id,

        bookCount: row.bookCount ?? 0,
      }))
      tags.value = tagDetails.value.map((row) => row.name)
      return tags.value
    } finally {
      loading.value = false
    }
  }

  function createTag(name: string) {
    return http.post('/tags', { name })
  }

  function deleteTag(name: string) {
    return http.delete(`/tags/${encodeURIComponent(name)}`)
  }

  return { tags, tagDetails, loading, fetchTags, createTag, deleteTag }
}
