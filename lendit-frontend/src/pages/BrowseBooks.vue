<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Search, BookX, TriangleAlert, X } from '@lucide/vue'
import LInput from '../components/ui/LInput.vue'
import LButton from '../components/ui/LButton.vue'
import LEmpty from '../components/ui/LEmpty.vue'
import LSelect from '../components/ui/LSelect.vue'
import LMultiSelect from '../components/ui/LMultiSelect.vue'
import LSkeleton from '../components/ui/LSkeleton.vue'
import LPagination from '../components/ui/LPagination.vue'
import BookCard from '../components/BookCard.vue'
import { useBooks } from '../composables/useBooks'
import { useTags } from '../composables/useTags'
import type { Book } from '../types/api'

const { t } = useI18n()
const { books, pagination, loading, error, fetchBooks } = useBooks()
const { tags: availableTags, fetchTags } = useTags()
const route = useRoute()
const router = useRouter()

type SortKey = 'newest' | 'title' | 'author'
type SortOption = {
  value: SortKey
  label: string
  query: { sortBy: string; sortOrder: 'asc' | 'desc' }
}

const sortOptions = computed<SortOption[]>(() => [
  {
    value: 'newest',
    label: t('browse.sort.newest'),
    query: { sortBy: 'createdAt', sortOrder: 'desc' },
  },
  {
    value: 'title',
    label: t('browse.sort.title'),
    query: { sortBy: 'title', sortOrder: 'asc' },
  },
  {
    value: 'author',
    label: t('browse.sort.author'),
    query: { sortBy: 'author', sortOrder: 'asc' },
  },
])

function one(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function readState(q: Record<string, unknown>) {
  const tags = [
    ...new Set(
      one(q.tag)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ]

  const sortBy = one(q.sortBy)
  const sortOrder = one(q.sortOrder)
  const opt = sortBy
    ? sortOptions.value.find((o) => o.query.sortBy === sortBy && o.query.sortOrder === sortOrder)
    : null

  const p = parseInt(one(q.page), 10)
  return {
    search: one(q.search),
    tags,
    sort: opt?.value ?? ('newest' as SortKey),
    page: Number.isFinite(p) && p > 0 ? p : 1,
  }
}

const seed = readState(route.query)

const search = ref(seed.search)
const activeTags = ref(seed.tags)
const sort = ref(seed.sort)
const page = ref(seed.page)
const browseEl = ref<HTMLElement | null>(null)
const limit = 20

function clearFilters() {
  search.value = ''
  activeTags.value = []
  sort.value = 'newest'
}

function currentSort(): SortOption {
  const [first] = sortOptions.value
  return sortOptions.value.find((o) => o.value === sort.value) ?? (first as SortOption)
}

function apiParams() {
  const opt = currentSort()
  return {
    search: search.value.trim(),
    tag: activeTags.value.join(','),
    sortBy: opt.query.sortBy,
    sortOrder: opt.query.sortOrder,
    page: page.value,
    limit,
  }
}

function load() {
  fetchBooks(apiParams()).catch(() => {})
}

function buildQuery(): Record<string, string> {
  const q: Record<string, string> = {}
  if (search.value.trim()) q.search = search.value.trim()
  if (activeTags.value.length) q.tag = activeTags.value.join(',')
  if (sort.value !== 'newest') {
    const opt = currentSort()
    q.sortBy = opt.query.sortBy
    q.sortOrder = opt.query.sortOrder
  }
  if (page.value > 1) q.page = String(page.value)
  return q
}

let syncingFromUrl = false
function sameQuery(a: Record<string, unknown>, b: Record<string, unknown>) {
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  return ka.length === kb.length && ka.every((k) => a[k] === b[k])
}
function pushUrl() {
  if (syncingFromUrl) return
  const next = buildQuery()
  if (sameQuery(next, route.query)) return

  router.replace({ query: next })
}

let searchT: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  page.value = 1
  clearTimeout(searchT)
  searchT = setTimeout(() => {
    pushUrl()
    load()
  }, 300)
})

watch(
  [activeTags, sort],
  () => {
    page.value = 1
    pushUrl()
    load()
  },
  { deep: true },
)

watch(page, () => {
  pushUrl()
  load()
})

watch(
  () => route.query,
  (q) => {
    if (route.name !== 'browse') return
    if (sameQuery(buildQuery(), q)) return
    const next = readState(q)
    syncingFromUrl = true
    search.value = next.search
    activeTags.value = next.tags
    sort.value = next.sort
    page.value = next.page
    nextTick(() => {
      syncingFromUrl = false
      load()
    })
  },
)

onMounted(() => {
  fetchTags().catch(() => {})
  load()
})

watch(
  () => pagination.value.totalPages,
  (tp) => {
    if (tp && page.value > tp) page.value = tp
  },
)

const hasFilters = computed(() => !!search.value || activeTags.value.length > 0)
const resultWindow = computed(() => {
  const total = pagination.value.total
  if (!total) return '0 books'
  const start = (page.value - 1) * limit + 1
  const end = Math.min(page.value * limit, total)
  return `${start}–${end} of ${total} books`
})
const totalPages = computed(() => Math.max(pagination.value.totalPages || 1, 1))

async function changePage(p: number) {
  page.value = p
  await nextTick()

  browseEl.value?.scrollIntoView({ block: 'start' })
}

function removeTag(tag: string) {
  activeTags.value = activeTags.value.filter((t) => t !== tag)
}

function goToBook(book: Book) {
  router.push({ name: 'book', params: { id: book._id } })
}
</script>

<template>
  <main ref="browseEl" class="browse">
    <header class="browse__head">
      <h1 class="browse__title">{{ t('browse.title') }}</h1>
    </header>

    <div class="browse__controls">
      <div class="browse__search">
        <LInput
          v-model="search"
          type="search"
          :placeholder="t('browse.searchPlaceholder')"
          :aria-label="t('browse.searchLabel')"
        >
          <template #prefix>
            <Search :size="18" :stroke-width="2" aria-hidden="true" />
          </template>
        </LInput>
      </div>

      <div class="browse__filter">
        <LMultiSelect
          v-model="activeTags"
          :options="availableTags"
          :label="t('browse.filterByTag')"
          :placeholder="t('browse.allTags')"
        />
      </div>

      <div class="browse__sort">
        <LSelect v-model="sort" :options="sortOptions" :label="t('browse.sortBy')" />
      </div>
    </div>

    <div class="browse__meta">
      <div class="browse__result-line" aria-live="polite">
        <span v-if="loading">{{ t('browse.searching') }}</span>
        <span v-else>{{ resultWindow }}</span>
      </div>
      <div v-if="hasFilters" class="browse__active">
        <button
          v-if="search"
          type="button"
          class="browse__chip"
          :aria-label="t('browse.removeSearch', { term: search })"
          @click="search = ''"
        >
          "{{ search }}"
          <X :size="13" :stroke-width="2" aria-hidden="true" />
        </button>
        <button
          v-for="tag in activeTags"
          :key="tag"
          type="button"
          class="browse__chip"
          :aria-label="t('browse.removeTag', { tag })"
          @click="removeTag(tag)"
        >
          #{{ tag }}
          <X :size="13" :stroke-width="2" aria-hidden="true" />
        </button>
        <button type="button" class="browse__clear" @click="clearFilters">
          {{ t('browse.clearAll') }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="browse__grid" aria-hidden="true">
      <div v-for="n in limit" :key="n" class="skeleton">
        <LSkeleton variant="block" class="skeleton__cover" />
        <div class="skeleton__body">
          <LSkeleton width="85%" height="19px" />
          <LSkeleton width="55%" height="21px" />
          <LSkeleton width="35%" height="19px" class="skeleton__tags" />

          <LSkeleton width="45%" height="18px" class="skeleton__owner" />
        </div>
      </div>
    </div>

    <LEmpty
      v-else-if="error"
      tone="error"
      :icon="TriangleAlert"
      :title="t('browse.loadFailed')"
      :hint="error"
    >
      <template #action>
        <LButton variant="secondary" @click="load">{{ t('common.tryAgain') }}</LButton>
      </template>
    </LEmpty>

    <template v-else-if="books.length">
      <div class="browse__grid">
        <BookCard v-for="book in books" :key="book._id" :book="book" @select="goToBook" />
      </div>

      <LPagination
        v-if="totalPages > 1"
        class="browse__pagination"
        :page="page"
        :total-pages="totalPages"
        @update:page="changePage"
      />
    </template>

    <LEmpty v-else :icon="BookX" :title="t('browse.emptyTitle')" :hint="t('browse.emptyHint')">
      <template #action>
        <LButton variant="secondary" @click="clearFilters">
          {{ t('browse.clearAllFilters') }}
        </LButton>
      </template>
    </LEmpty>
  </main>
</template>

<style scoped>
.browse {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: var(--page-max);
  margin: 0 auto;
  padding: var(--space-5) var(--page-pad-x);
}

.browse__head {
  margin-bottom: var(--space-5);
}

@media (max-width: 768px) {
  .browse__head {
    display: none;
  }
}
.browse__title {
  margin: 0;
  font-size: var(--text-2xl);
}

.browse__controls {
  flex-shrink: 0;
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  margin-bottom: var(--space-3);
}
.browse__search {
  flex: 1;
}

.browse__filter {
  flex-shrink: 0;
  width: 14rem;
}
.browse__sort {
  flex-shrink: 0;
  width: 13rem;
}

.browse__meta {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
  min-height: 1.5rem;
  margin-bottom: var(--space-4);
  font-size: var(--text-sm);
  color: var(--ink-soft);
}
.browse__result-line {
  display: flex;
  align-items: center;
  min-height: 1.5rem;
  white-space: nowrap;
}
.browse__active {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-1);
  min-width: 0;
}
.browse__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  max-width: 13rem;
  min-height: 1.5rem;
  padding: 0 var(--space-2);
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--ink-soft);
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  cursor: pointer;
}
.browse__chip:hover {
  color: var(--ink);
}
.browse__clear {
  min-height: 1.5rem;
  padding: 0 var(--space-2);
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--accent);
  background: var(--accent-tint);
  border: 1px solid var(--border-transparent);
  border-radius: var(--radius-pill);
  cursor: pointer;
}
.browse__clear:hover {
  color: var(--accent-700);
}

.browse__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-content: start;
  gap: var(--space-5);
}

.browse__pagination {
  flex-shrink: 0;
  margin-top: var(--space-4);
}

.skeleton {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--surface);
}

.skeleton__cover {
  aspect-ratio: 16 / 9;
  border-radius: 0;
}
.skeleton__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-4) var(--space-4);
}

.skeleton__tags {
  margin-top: var(--space-2);
}

.skeleton__owner {
  margin-top: auto;
  margin-bottom: 12px;
}

.browse__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8) var(--space-4);
  text-align: center;
  color: var(--ink-faint);
}
.browse__empty h3 {
  margin: var(--space-2) 0 0;
  color: var(--ink);
}
.browse__empty p {
  color: var(--ink-soft);
  margin: 0 0 var(--space-2);
}

@media (max-width: 900px) {
  .browse__grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .browse__controls {
    flex-wrap: wrap;
  }
  .browse__search {
    flex: 1 1 100%;
  }
  .browse__filter,
  .browse__sort {
    flex: 1 1 0;
    width: auto;
  }
}
@media (max-width: 700px) {
  .browse__meta {
    flex-direction: column;
    align-items: stretch;
  }
  .browse__active {
    justify-content: flex-start;
  }
}
@media (max-width: 540px) {
  .browse__grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .browse__filter,
  .browse__sort {
    flex: 1 1 0;
    min-width: 0;
  }
  .browse__pagination {
    margin-top: var(--space-3);
  }
}

@media (max-width: 540px) {
  .browse__grid :deep(.book__cover) {
    aspect-ratio: auto;
    height: 5.5rem;
  }

  .browse__grid :deep(.book__title) {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .browse__grid :deep(.book__author) {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

@media (max-width: 400px) {
  .browse__grid :deep(.book__tags) {
    display: none;
  }
}
</style>
