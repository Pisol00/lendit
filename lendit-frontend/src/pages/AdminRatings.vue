<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Search, Star, Trash2, RotateCcw } from '@lucide/vue'
import LInput from '../components/ui/LInput.vue'
import LButton from '../components/ui/LButton.vue'
import LBadge from '../components/ui/LBadge.vue'
import LModal from '../components/ui/LModal.vue'
import LEmpty from '../components/ui/LEmpty.vue'
import LSelect from '../components/ui/LSelect.vue'
import LPagination from '../components/ui/LPagination.vue'
import LSkeleton from '../components/ui/LSkeleton.vue'
import { TriangleAlert } from '@lucide/vue'
import { useToast } from '../composables/useToast'
import { useRatingModeration } from '../composables/useRatings'
import { formatDate, fullName } from '../utils/format'
import { errorMessage } from '../lib/query'
import type { Rating } from '../types/api'

const { t } = useI18n()
const { success, info, error: toastError } = useToast()
const { ratings, pagination, loading, error, fetchModeration, removeRating, restoreRating } =
  useRatingModeration()

const search = ref('')

const starFilter = ref('')
const statusFilter = ref<'live' | 'deleted' | 'all'>('live')
const page = ref(1)
const limit = 10

const starOptions = computed(() => [
  { value: '', label: t('admin.reviews.allRatings') },
  ...[1, 2, 3, 4, 5].map((n) => ({
    value: String(n),
    label: n === 1 ? t('rating.star', { n }) : t('rating.stars', { n }),
  })),
])
const statusOptions = computed(() => [
  { value: 'live', label: t('admin.reviews.statusLive') },
  { value: 'deleted', label: t('admin.reviews.statusDeleted') },
  { value: 'all', label: t('admin.reviews.statusAll') },
])

const viewingDeleted = computed(() => statusFilter.value === 'deleted')

function load() {
  fetchModeration({
    search: search.value.trim(),

    rating: starFilter.value ? Number(starFilter.value) : undefined,
    status: statusFilter.value,
    page: page.value,
    limit,
  }).catch(() => {})
}

onMounted(load)

let searchT: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  page.value = 1
  clearTimeout(searchT)
  searchT = setTimeout(load, 300)
})
watch([starFilter, statusFilter], () => {
  page.value = 1
  load()
})
watch(page, load)

const confirmOpen = ref(false)
const pending = ref<Rating | null>(null)
const working = ref(false)

function askDelete(rating: Rating) {
  pending.value = rating
  confirmOpen.value = true
}

async function confirmDelete() {
  const row = pending.value
  if (!row) return
  working.value = true
  try {
    await removeRating(row._id)
    success(t('admin.reviews.deleted'))
    confirmOpen.value = false
    load()
  } catch (err) {
    toastError(errorMessage(err, t('admin.reviews.deleteFailed')))
  } finally {
    working.value = false
  }
}

async function restore(rating: Rating) {
  try {
    await restoreRating(rating._id)
    info(t('admin.reviews.restored'))
    load()
  } catch (err) {
    toastError(errorMessage(err, t('admin.reviews.restoreFailed')))
  }
}
</script>

<template>
  <main class="admin">
    <header class="admin__head">
      <div>
        <h1 class="admin__title">{{ t('admin.reviews.title') }}</h1>
        <p class="admin__sub">{{ t('admin.reviews.subtitle') }}</p>
      </div>
    </header>

    <div class="admin__controls">
      <div class="admin__search">
        <LInput
          v-model="search"
          type="search"
          :placeholder="t('admin.reviews.searchPlaceholder')"
          :aria-label="t('admin.reviews.searchLabel')"
        >
          <template #prefix><Search :size="18" :stroke-width="2" aria-hidden="true" /></template>
        </LInput>
      </div>
      <div class="admin__filter">
        <LSelect
          v-model="starFilter"
          :options="starOptions"
          :label="t('admin.reviews.filterByRating')"
        />
      </div>
      <div class="admin__filter">
        <LSelect
          v-model="statusFilter"
          :options="statusOptions"
          :label="t('admin.reviews.filterByStatus')"
        />
      </div>
    </div>

    <LEmpty
      v-if="error"
      tone="error"
      :icon="TriangleAlert"
      :title="t('errors.loadRatingList')"
      :hint="error"
    >
      <template #action>
        <LButton variant="secondary" @click="load()">{{ t('common.tryAgain') }}</LButton>
      </template>
    </LEmpty>

    <div v-else-if="loading && !ratings.length" class="admin__table" role="presentation">
      <div class="admin__tr admin__tr--head rate__tr">
        <span>{{ t('admin.reviews.colReview') }}</span>
        <span>{{ t('admin.reviews.colPeople') }}</span>
        <span>{{ t('admin.reviews.colRating') }}</span>
        <span>{{ t('admin.reviews.colDate') }}</span>
        <span class="admin__th-actions">{{ t('admin.reviews.colActions') }}</span>
      </div>
      <div v-for="n in 6" :key="n" class="admin__tr rate__tr admin__tr--skeleton">
        <span class="rate__skeleton-text">
          <LSkeleton width="90%" height="21px" />
          <LSkeleton width="45%" height="17px" />
        </span>
        <LSkeleton width="8rem" />
        <LSkeleton width="3.5rem" />
        <LSkeleton width="5rem" />
        <LSkeleton width="3rem" height="var(--control-icon-md)" radius="var(--radius)" />
      </div>
    </div>

    <template v-else-if="ratings.length">
      <div class="admin__table rate__table" role="table">
        <div class="admin__tr admin__tr--head rate__tr" role="row">
          <span role="columnheader">{{ t('admin.reviews.colReview') }}</span>
          <span role="columnheader">{{ t('admin.reviews.colPeople') }}</span>
          <span role="columnheader">{{ t('admin.reviews.colRating') }}</span>
          <span role="columnheader">{{ t('admin.reviews.colDate') }}</span>
          <span role="columnheader" class="admin__th-actions">
            {{ t('admin.reviews.colActions') }}
          </span>
        </div>

        <div v-for="r in ratings" :key="r._id" class="admin__tr rate__tr" role="row">
          <span class="rate__text" role="cell">
            <span v-if="r.comment" class="rate__comment">{{ r.comment }}</span>
            <span v-else class="rate__comment rate__comment--empty">
              {{ t('admin.reviews.noComment') }}
            </span>
            <span v-if="r.borrowing?.book" class="rate__book">
              {{ r.borrowing.book.title }}
              <template v-if="r.borrowing.book.deletedAt">
                {{ t('admin.reviews.bookDeleted') }}
              </template>
            </span>
          </span>

          <span class="rate__people" role="cell">
            <RouterLink
              v-if="r.rater?._id"
              :to="{ name: 'account', params: { id: r.rater._id } }"
              class="rate__person"
            >
              {{ fullName(r.rater) }}
            </RouterLink>
            <span class="rate__arrow" aria-hidden="true">→</span>
            <RouterLink
              v-if="r.ratee?._id"
              :to="{ name: 'account', params: { id: r.ratee._id } }"
              class="rate__person"
            >
              {{ fullName(r.ratee) }}
            </RouterLink>
          </span>

          <span role="cell">
            <span class="rate__score">
              <Star :size="14" :stroke-width="2" aria-hidden="true" />
              {{ r.rating }}
            </span>
          </span>

          <span class="admin__date" role="cell">
            {{ formatDate(r.createdAt) }}
            <LBadge v-if="r.deletedAt" variant="neutral">
              {{ t('admin.reviews.deletedBadge') }}
            </LBadge>
          </span>

          <span class="admin__actions" role="cell">
            <button
              v-if="r.deletedAt"
              type="button"
              class="admin__icon-btn"
              :title="t('admin.reviews.restoreReview')"
              :aria-label="t('admin.reviews.restoreReview')"
              @click="restore(r)"
            >
              <RotateCcw :size="17" :stroke-width="2" aria-hidden="true" />
            </button>
            <button
              v-else
              type="button"
              class="admin__icon-btn admin__icon-btn--danger"
              :title="t('admin.reviews.deleteReview')"
              :aria-label="t('admin.reviews.deleteReview')"
              @click="askDelete(r)"
            >
              <Trash2 :size="17" :stroke-width="2" aria-hidden="true" />
            </button>
          </span>
        </div>
      </div>

      <LPagination
        v-if="pagination.totalPages > 1"
        class="admin__pagination"
        :page="page"
        :total-pages="pagination.totalPages"
        @update:page="(p) => (page = p)"
      />
    </template>

    <LEmpty
      v-else
      :icon="viewingDeleted ? Trash2 : Star"
      :title="viewingDeleted ? t('admin.reviews.emptyDeleted') : t('admin.reviews.emptyFiltered')"
      :hint="
        viewingDeleted ? t('admin.reviews.emptyDeletedHint') : t('admin.reviews.emptyFilteredHint')
      "
    />

    <LModal v-model:open="confirmOpen" :title="t('admin.reviews.deleteTitle')">
      <p v-if="pending">
        {{
          t('admin.reviews.deleteConfirm', {
            author: fullName(pending.rater),
            subject: fullName(pending.ratee),
          })
        }}
      </p>
      <p v-if="pending" class="rate__warn">{{ t('admin.reviews.deleteWarn') }}</p>
      <template #footer="{ close }">
        <LButton variant="secondary" :disabled="working" @click="close">
          {{ t('common.cancel') }}
        </LButton>
        <LButton variant="danger" :loading="working" @click="confirmDelete">
          {{ t('admin.reviews.deleteReview') }}
        </LButton>
      </template>
    </LModal>
  </main>
</template>

<style scoped>
@import '../styles/admin.css';

.rate__skeleton-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.rate__tr {
  grid-template-columns: 1fr 14rem 5rem 8rem 5rem;
  align-items: start;
}
.rate__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}
.rate__comment {
  font-size: var(--text-sm);
  overflow-wrap: anywhere;
}
.rate__comment--empty {
  color: var(--ink-faint);
  font-style: italic;
}
.rate__book {
  font-size: var(--text-xs);
  color: var(--ink-faint);
}
.rate__people {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-1);
  font-size: var(--text-sm);
  min-width: 0;
}
.rate__person {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--border);
  text-underline-offset: 2px;
}
.rate__person:hover {
  text-decoration-color: var(--primary);
}
.rate__arrow {
  color: var(--ink-faint);
}
.rate__score {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--warning);
}
.rate__warn {
  margin: var(--space-3) 0 0;
  padding: var(--space-3);
  font-size: var(--text-xs);
  color: var(--ink-soft);
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

@media (max-width: 900px) {
  .rate__skeleton-text {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .rate__tr {
    grid-template-columns: 1fr auto auto;
  }
  .rate__tr > :nth-child(2),
  .rate__tr > :nth-child(4) {
    display: none;
  }
}
</style>
