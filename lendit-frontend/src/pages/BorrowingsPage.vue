<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Inbox } from '@lucide/vue'
import BorrowingCard from '../components/BorrowingCard.vue'
import LEmpty from '../components/ui/LEmpty.vue'
import RatingFormModal from '../components/RatingFormModal.vue'
import LSelect from '../components/ui/LSelect.vue'
import LSkeleton from '../components/ui/LSkeleton.vue'
import LButton from '../components/ui/LButton.vue'
import { TriangleAlert } from '@lucide/vue'
import { useToast } from '../composables/useToast'
import { useBorrowings, borrowingStatuses } from '../composables/useBorrowings'
import { useRatings } from '../composables/useRatings'
import { fullName } from '../utils/format'
import { errorMessage } from '../lib/query'
import type { Borrowing, BorrowingStatus, DecoratedBorrowing, RaterRole } from '../types/api'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { success, info, error: toastError } = useToast()
const { list, approve, reject, cancel, returnBook } = useBorrowings()
const { createRating } = useRatings()

type TabKey = 'requests' | 'incoming'

type StatusFilter = BorrowingStatus | ''
const TABS: TabKey[] = ['requests', 'incoming']

function one(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function readState(q: Record<string, unknown>): { tab: TabKey; status: StatusFilter } {
  const tab = one(q.tab)
  const status = one(q.status)
  return {
    tab: TABS.includes(tab as TabKey) ? (tab as TabKey) : 'requests',
    status: borrowingStatuses.some((s) => s.value === status) ? (status as BorrowingStatus) : '',
  }
}

const seed = readState(route.query)
const tab = ref(seed.tab)

const tabs = computed<{ key: TabKey; label: string }[]>(() => [
  { key: 'requests', label: t('borrowings.tabs.requests') },
  { key: 'incoming', label: t('borrowings.tabs.incoming') },
])

const statusFilter = ref<StatusFilter>(seed.status)
const statusOptions = computed(() => [
  { value: '', label: t('borrowings.allStatuses') },
  ...borrowingStatuses.map((s) => ({ value: s.value, label: t(`borrowings.status.${s.value}`) })),
])

const data = ref<Record<TabKey, DecoratedBorrowing[]>>({ requests: [], incoming: [] })
const loading = ref(false)
const error = ref('')

function decorate(item: Borrowing, role: RaterRole): DecoratedBorrowing {
  const owner = item.owner ?? item.book?.owner
  const counterpart = role === 'owner' ? item.borrower : owner
  return {
    ...item,
    owner,
    _role: role,
    counterpart: fullName(counterpart),
    counterpartId: counterpart?._id,
    counterpartName: fullName(counterpart),
  }
}

async function loadTab(key: TabKey) {
  const role = key === 'incoming' ? 'owner' : 'borrower'
  loading.value = true
  error.value = ''
  try {
    const res = await list({ role, status: statusFilter.value || undefined, limit: 20 })
    data.value[key] = (res.items ?? []).map((it) => decorate(it, role))
  } catch (err) {
    error.value = errorMessage(err, 'Failed to load the list')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadTab('requests')
  loadTab('incoming')
})

watch(statusFilter, () => {
  pushUrl()
  loadTab('requests')
  loadTab('incoming')
})

let syncingFromUrl = false
function buildQuery(): Record<string, string> {
  const q: Record<string, string> = {}

  if (tab.value !== 'requests') q.tab = tab.value
  if (statusFilter.value) q.status = statusFilter.value
  return q
}
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

watch(tab, pushUrl)

watch(
  () => route.query,
  (q) => {
    if (route.name !== 'borrowings') return
    if (sameQuery(buildQuery(), q)) return
    const next = readState(q)
    syncingFromUrl = true
    tab.value = next.tab

    statusFilter.value = next.status
    nextTick(() => {
      syncingFromUrl = false
    })
  },
)

const counts = computed(() => ({
  requests: data.value.requests.length,
  incoming: data.value.incoming.length,
}))

const sectionDefs = computed(() => {
  if (tab.value === 'incoming') {
    return [
      {
        key: 'action',
        label: t('borrowings.sections.incomingPending'),
        statuses: ['pending'],
      },
      { key: 'active', label: t('borrowings.sections.incomingActive'), statuses: ['borrowing'] },
      {
        key: 'done',
        label: t('borrowings.sections.incomingDone'),
        statuses: ['returned', 'rejected', 'cancelled'],
      },
    ]
  }
  return [
    { key: 'action', label: t('borrowings.sections.requestsPending'), statuses: ['pending'] },
    { key: 'active', label: t('borrowings.sections.requestsActive'), statuses: ['borrowing'] },
    {
      key: 'done',
      label: t('borrowings.sections.requestsDone'),
      statuses: ['returned', 'rejected', 'cancelled'],
    },
  ]
})

const sections = computed(() =>
  sectionDefs.value
    .map((s) => ({
      ...s,
      items: data.value[tab.value].filter((x) => s.statuses.includes(x.status)),
    }))
    .filter((s) => s.items.length),
)

const filtering = computed(() => !!statusFilter.value)
const flatItems = computed(() => data.value[tab.value])
const isEmpty = computed(() => data.value[tab.value].length === 0)

type ActionKey = 'borrowing' | 'rejected' | 'returned' | 'cancelled'
type ActionSpec = { fn: (id: string) => Promise<unknown>; msgKey: string; tone: 'success' | 'info' }

const actionMap: Record<ActionKey, ActionSpec> = {
  borrowing: { fn: approve, msgKey: 'borrowings.toast.approved', tone: 'success' },
  rejected: { fn: reject, msgKey: 'borrowings.toast.rejected', tone: 'info' },
  returned: { fn: returnBook, msgKey: 'borrowings.toast.returned', tone: 'success' },
  cancelled: { fn: cancel, msgKey: 'borrowings.toast.cancelled', tone: 'info' },
}

async function onAction({ id, action }: { id: string; action: string }) {
  const spec = actionMap[action as ActionKey]
  if (!spec) return
  try {
    await spec.fn(id)
    ;(spec.tone === 'info' ? info : success)(t(spec.msgKey))

    await loadTab(tab.value)
  } catch (err) {
    toastError(errorMessage(err, t('errors.action')))
  }
}

const rateOpen = ref(false)
const rateTarget = ref<DecoratedBorrowing | null>(null)
const rating = ref(false)

function openRating(item: DecoratedBorrowing) {
  rateTarget.value = item
  rateOpen.value = true
}

async function submitRating(payload: Parameters<typeof createRating>[0]) {
  rating.value = true
  try {
    await createRating(payload)
    rateOpen.value = false
    success(t('rating.submitted'))
  } catch (err) {
    toastError(errorMessage(err, t('rating.submitFailed')))
  } finally {
    rating.value = false
  }
}
</script>

<template>
  <main class="brwp">
    <header class="brwp__head">
      <h1 class="brwp__title">{{ t('borrowings.title') }}</h1>
      <p class="brwp__sub">{{ t('borrowings.subtitle') }}</p>
    </header>

    <div class="brwp__controls">
      <div class="brwp__tabs" role="tablist" :aria-label="t('borrowings.tabType')">
        <button
          v-for="item in tabs"
          :key="item.key"
          type="button"
          role="tab"
          class="brwp__tab"
          :class="{ 'is-active': tab === item.key }"
          :aria-selected="tab === item.key"
          @click="tab = item.key"
        >
          {{ item.label }}
          <span class="brwp__tab-count">{{ counts[item.key] }}</span>
        </button>
      </div>
      <div class="brwp__filter">
        <LSelect
          v-model="statusFilter"
          :options="statusOptions"
          :label="t('borrowings.filterByStatus')"
        />
      </div>
    </div>

    <LEmpty
      v-if="error"
      tone="error"
      :icon="TriangleAlert"
      :title="t('errors.loadList')"
      :hint="error"
    >
      <template #action>
        <LButton variant="secondary" @click="loadTab(tab)">{{ t('common.tryAgain') }}</LButton>
      </template>
    </LEmpty>

    <div v-else-if="loading && isEmpty" class="brwp__list" role="presentation">
      <div v-for="n in 4" :key="n" class="brw-skeleton">
        <div class="brw-skeleton__main">
          <LSkeleton width="45%" height="21px" />
          <LSkeleton width="28%" height="19px" />
        </div>
        <div class="brw-skeleton__when">
          <LSkeleton width="11rem" height="19px" />
          <LSkeleton width="6rem" height="16px" />
        </div>
        <LSkeleton width="7rem" height="var(--control-icon-md)" radius="var(--radius)" />
      </div>
    </div>

    <TransitionGroup
      v-else-if="filtering && !isEmpty"
      :key="`${tab}-flat`"
      tag="div"
      name="row"
      class="brwp__list"
    >
      <BorrowingCard
        v-for="item in flatItems"
        :key="item._id"
        :item="item"
        @action="onAction"
        @rate="openRating"
      />
    </TransitionGroup>

    <div v-else-if="!isEmpty" :key="tab" class="brwp__groups">
      <section v-for="sec in sections" :key="sec.key" class="brwp__group">
        <h2 class="brwp__group-title">
          {{ sec.label }}
          <span class="brwp__group-count">{{ sec.items.length }}</span>
        </h2>
        <TransitionGroup tag="div" name="row" class="brwp__list">
          <BorrowingCard
            v-for="item in sec.items"
            :key="item._id"
            :item="item"
            @action="onAction"
            @rate="openRating"
          />
        </TransitionGroup>
      </section>
    </div>

    <LEmpty
      v-else
      :icon="Inbox"
      :title="t('borrowings.emptyTitle')"
      :hint="tab === 'requests' ? t('borrowings.emptyRequests') : t('borrowings.emptyIncoming')"
    />

    <RatingFormModal
      v-model:open="rateOpen"
      :borrowing="rateTarget"
      :submitting="rating"
      @submit="submitRating"
    />
  </main>
</template>

<style scoped>
.brwp {
  max-width: var(--page-max);
  margin: 0 auto;
  padding: var(--page-pad-y) var(--page-pad-x);
}
.brwp__head {
  margin-bottom: var(--space-5);
}

@media (max-width: 768px) {
  .brwp__head {
    display: none;
  }
}
.brwp__title {
  margin: 0 0 var(--space-1);
  font-size: var(--text-2xl);
  letter-spacing: -0.01em;
}
.brwp__sub {
  color: var(--ink-soft);
  font-size: var(--text-sm);
  margin: 0;
}

.brwp__controls {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-3);
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--space-5);
}
.brwp__filter {
  flex-shrink: 0;
  width: 11rem;
  margin-bottom: var(--space-2);
}

.brwp__tabs {
  display: flex;
  gap: var(--space-1);
  padding-bottom: 0;
}
.brwp__tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ink-soft);
  background: none;
  border: 0;
  border-bottom: 2px solid var(--border-transparent);
  margin-bottom: -1px;
  cursor: pointer;
  transition:
    color var(--dur) var(--ease),
    border-color var(--dur) var(--ease);
}
.brwp__tab:hover {
  color: var(--ink);
}
.brwp__tab.is-active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}
.brwp__tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--ink-soft);
  background: var(--bg-subtle);
  border-radius: var(--radius-pill);
}
.brwp__tab.is-active .brwp__tab-count {
  color: var(--fg-inverse);
  background: var(--primary);
}

.brwp__groups {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.brwp__group-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-3);
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
}
.brwp__group-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--ink-soft);
  background: var(--bg-subtle);
  border-radius: var(--radius-pill);
}

.brw-skeleton {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(8rem, auto);
  align-items: center;
  gap: var(--space-3) var(--space-6);
  padding: var(--space-4) var(--space-5);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}
.brw-skeleton__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.brw-skeleton__when {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.brwp__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.row-move {
  transition: transform 240ms var(--ease);
}
.row-enter-active {
  transition:
    opacity 240ms var(--ease),
    transform 240ms var(--ease);
}
.row-leave-active {
  transition:
    opacity 180ms var(--ease),
    transform 180ms var(--ease);
  position: absolute;
  width: 100%;
}
.row-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.row-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
@media (prefers-reduced-motion: reduce) {
  .row-move,
  .row-enter-active,
  .row-leave-active {
    transition: opacity 180ms var(--ease);
  }
  .row-enter-from {
    transform: none;
  }
  .row-leave-to {
    transform: none;
  }
}

@media (max-width: 560px) {
  .brwp__controls {
    flex-wrap: wrap;
  }
  .brwp__filter {
    width: 100%;
    margin-bottom: var(--space-3);
  }
}
</style>
