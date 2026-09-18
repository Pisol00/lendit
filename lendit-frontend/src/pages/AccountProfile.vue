<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import { ArrowLeft, Star, MessageSquare, Settings } from '@lucide/vue'
import LPagination from '../components/ui/LPagination.vue'
import LSkeleton from '../components/ui/LSkeleton.vue'
import { useAccounts } from '../composables/useAccounts'
import { useAuth } from '../composables/useAuth'
import { useRatings } from '../composables/useRatings'
import { fullName, initials as toInitials, formatDate } from '../utils/format'
import { errorMessage } from '../lib/query'
import type { Account, RaterRole, RatingStats } from '../types/api'

const props = defineProps({
  id: { type: String, required: true },
})
const { t } = useI18n()
const router = useRouter()
const { fetchAccount } = useAccounts()
const { user } = useAuth()

const isMe = computed(() => !!user.value && String(user.value._id) === String(props.id))
const { ratings, pagination, summary, loading, fetchAccountRatings, fetchSummary } = useRatings()

const account = ref<Account | null>(null)
const notFound = ref('')

const tab = ref<RaterRole>('owner')
const tabs = computed<{ key: RaterRole; label: string }[]>(() => [
  { key: 'owner', label: t('account.tabs.owner') },
  { key: 'borrower', label: t('account.tabs.borrower') },
])
const page = ref(1)

const displayName = computed(() => fullName(account.value))
const initials = computed(() => toInitials(account.value))

const tabIndex = computed(() => tabs.value.findIndex((x) => x.key === tab.value))

const tabStats = computed(() =>
  tab.value === 'owner' ? summary.value.asOwner : summary.value.asBorrower,
)

function formatAverage(stats: RatingStats) {
  if (!stats?.count) return '0'
  return stats.average.toFixed(1)
}

async function loadRatings() {
  try {
    await fetchAccountRatings(props.id, { role: tab.value, page: page.value, limit: 10 })
  } catch {
    void 0
  }
}

onMounted(async () => {
  try {
    account.value = await fetchAccount(props.id)
  } catch (err) {
    notFound.value = errorMessage(err, t('account.notFound'))
    return
  }
  await Promise.all([fetchSummary(props.id), loadRatings()])
})

watch(tab, () => {
  page.value = 1
  loadRatings()
})
watch(page, loadRatings)

function goBack() {
  router.back()
}
</script>

<template>
  <main class="prof">
    <button type="button" class="prof__back" @click="goBack">
      <ArrowLeft :size="18" :stroke-width="2" aria-hidden="true" />
      {{ t('common.back') }}
    </button>

    <p v-if="notFound" class="prof__notfound">{{ notFound }}</p>

    <template v-else-if="account">
      <header class="prof__head">
        <div class="prof__avatar" aria-hidden="true">{{ initials }}</div>
        <div class="prof__id">
          <h1 class="prof__name">{{ displayName }}</h1>
          <p class="prof__email">{{ account.email }}</p>
        </div>
        <RouterLink v-if="isMe" class="prof__settings" :to="{ name: 'profile' }">
          <Settings :size="15" :stroke-width="2" aria-hidden="true" />
          {{ t('account.editProfile') }}
        </RouterLink>
      </header>

      <div class="prof__switchrow">
        <div
          class="prof__tabs"
          :style="{ '--thumb': tabIndex }"
          role="tablist"
          :aria-label="t('account.reviewType')"
        >
          <span class="prof__thumb" aria-hidden="true"></span>
          <button
            v-for="item in tabs"
            :key="item.key"
            type="button"
            role="tab"
            class="prof__tab"
            :class="{ 'is-active': tab === item.key }"
            :aria-selected="tab === item.key"
            @click="tab = item.key"
          >
            {{ item.label }}
            <span class="prof__tab-count">
              {{ item.key === 'owner' ? summary.asOwner.count : summary.asBorrower.count }}
            </span>
          </button>
        </div>

        <p class="prof__tabscore">
          {{ t('account.averageScore') }}
          <strong>{{ formatAverage(tabStats) }}</strong>
          {{ t('account.outOfReviews', { count: tabStats.count }) }}
        </p>
      </div>

      <div v-if="loading && !ratings.length" class="prof__list" role="presentation">
        <div v-for="n in 3" :key="n" class="rev-skeleton">
          <LSkeleton width="8rem" />
          <LSkeleton width="70%" />
          <LSkeleton width="9rem" height="0.625rem" />
        </div>
      </div>

      <ul v-else-if="ratings.length" class="prof__list">
        <li v-for="r in ratings" :key="r._id" class="prof__item">
          <div class="prof__item-top">
            <h3 class="prof__rater">{{ fullName(r.rater) }}</h3>
            <span class="prof__date">{{ formatDate(r.createdAt) }}</span>
          </div>

          <p class="prof__loan">
            <span
              class="prof__stars"
              :aria-label="t('account.starsOutOfFive', { rating: r.rating })"
            >
              <Star
                v-for="n in 5"
                :key="n"
                :size="14"
                :stroke-width="2"
                :class="['prof__star', { 'is-on': n <= r.rating }]"
                aria-hidden="true"
              />
            </span>
            <span class="prof__book">
              <template v-if="r.borrowing?.book">
                {{
                  t(tab === 'owner' ? 'account.forLending' : 'account.forBorrowing', {
                    title: r.borrowing.book.title,
                  })
                }}
                <span v-if="r.borrowing.book.deletedAt" class="prof__book-gone">
                  {{ t('account.bookDeleted') }}
                </span>
              </template>
              <span v-else class="prof__book-gone">{{ t('account.bookDeleted') }}</span>
            </span>
          </p>

          <p v-if="r.comment" class="prof__comment">{{ r.comment }}</p>
          <p v-else class="prof__comment prof__comment--empty">{{ t('account.noComment') }}</p>
        </li>
      </ul>

      <div v-else class="prof__empty">
        <MessageSquare :size="36" :stroke-width="1.5" aria-hidden="true" />
        <p>{{ tab === 'owner' ? t('account.emptyOwner') : t('account.emptyBorrower') }}</p>
      </div>

      <LPagination
        v-if="pagination.totalPages > 1"
        :page="pagination.page"
        :total-pages="pagination.totalPages"
        class="prof__pager"
        @update:page="page = $event"
      />
    </template>
  </main>
</template>

<style scoped>
.prof {
  max-width: var(--page-max);
  margin: 0 auto;
  padding: var(--page-pad-y) var(--page-pad-x);
}

.prof__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
  padding: 0;
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  color: var(--ink-soft);
  background: none;
  border: 0;
  cursor: pointer;
}
.prof__back:hover {
  color: var(--ink);
}

@media (max-width: 768px) {
  .prof__back {
    display: none;
  }
}
.prof__notfound {
  padding: var(--space-8) var(--space-4);
  text-align: center;
  color: var(--ink-soft);
}

.prof__head {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--border);
}
.prof__id {
  min-width: 0;
}
.prof__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  flex-shrink: 0;
  font-family: var(--font-ui);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--fg-inverse);
  background: var(--primary);
  border-radius: var(--radius-pill);
}
.prof__id {
  min-width: 0;
  flex: 1;
}
.prof__name {
  margin: 0 0 var(--space-1);
  font-size: var(--text-xl);
}
.prof__email {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--ink-soft);
  overflow-wrap: anywhere;
}

.prof__settings {
  margin-left: auto;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--control-sm);
  padding: 0 var(--space-4);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ink-soft);
  background: none;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  transition:
    color var(--dur) var(--ease),
    border-color var(--dur) var(--ease),
    background var(--dur) var(--ease);
}
.prof__settings:hover {
  color: var(--primary);
  border-color: var(--primary);
  background: var(--bg-subtle);
}

@media (pointer: coarse) {
  .prof__back,
  .prof__settings {
    margin-left: auto;
    flex-shrink: 0;
    min-height: 44px;
  }
  .prof__back {
    align-items: center;
  }
}

.prof__switchrow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-3) var(--space-4);

  margin: var(--space-5) 0 var(--space-4);
}

.prof__tabs {
  position: relative;
  display: inline-grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 2px;
  padding: 3px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.prof__thumb {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc((100% - 6px - 2px) / 2);
  background: var(--surface);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  transform: translateX(calc(var(--thumb, 0) * (100% + 2px)));
  transition: transform 260ms cubic-bezier(0.32, 0.72, 0, 1);
}

.prof__tab {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ink-soft);
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--dur) var(--ease);
}
.prof__tab:hover:not(.is-active) {
  color: var(--ink);
}
.prof__tab.is-active {
  color: var(--primary);
}
.prof__tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--ink-faint);
  background: color-mix(in srgb, var(--ink) 7%, transparent);
  border-radius: var(--radius-pill);
  transition:
    color var(--dur) var(--ease),
    background var(--dur) var(--ease);
}
.prof__tab.is-active .prof__tab-count {
  color: var(--fg-inverse);
  background: var(--primary);
}

@media (prefers-reduced-motion: reduce) {
  .prof__thumb {
    transition: none;
  }
}

.rev-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.prof__tabscore {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--ink-soft);
}
.prof__tabscore strong {
  color: var(--ink);
}
.prof__loading {
  padding: var(--space-3);
  font-size: var(--text-sm);
  color: var(--ink-soft);
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.prof__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}
.prof__item {
  padding: var(--space-4);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.prof__item-top {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  margin-bottom: 2px;
}
.prof__rater {
  min-width: 0;
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--text-base);
  font-weight: 600;
  line-height: var(--leading-snug);
}
.prof__date {
  flex-shrink: 0;
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--ink-faint);
  white-space: nowrap;
}

.prof__loan {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-2);
  margin: 0 0 var(--space-2);
}
.prof__book {
  min-width: 0;
  font-size: var(--text-sm);
  color: var(--ink-soft);
  overflow-wrap: anywhere;
}
.prof__book-gone {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--ink-faint);
}

.prof__stars {
  display: inline-flex;
  flex-shrink: 0;
  gap: 1px;
  color: var(--border);
}
.prof__star.is-on {
  color: var(--warning);
  fill: currentColor;
}
.prof__comment {
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
  overflow-wrap: anywhere;
}
.prof__comment--empty {
  color: var(--ink-faint);
  font-style: italic;
}
.prof__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-4);
  text-align: center;
  color: var(--ink-faint);
}
.prof__empty p {
  margin: 0;
  color: var(--ink-soft);
}

.prof__pager {
  margin-top: var(--space-5);
}

@media (max-width: 560px) {
  .prof__head {
    flex-wrap: wrap;
  }
}
</style>
