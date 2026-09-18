<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Book, ArrowLeft, User, Hash, Building2, Layers, BookCheck, Clock, Copy } from '@lucide/vue'
import LButton from '../components/ui/LButton.vue'
import LBadge from '../components/ui/LBadge.vue'
import LDateRange from '../components/ui/LDateRange.vue'
import LSkeleton from '../components/ui/LSkeleton.vue'
import { useToast } from '../composables/useToast'
import { useAuth } from '../composables/useAuth'
import { useBooks } from '../composables/useBooks'
import { useBorrowings } from '../composables/useBorrowings'
import { fullName } from '../utils/format'
import { errorMessage } from '../lib/query'

import type { Book as BookModel } from '../types/api'

const props = defineProps({
  id: { type: String, required: true },
})
const { t } = useI18n()
const router = useRouter()
const { success, error: toastError } = useToast()
const { user } = useAuth()
const { fetchBook, loading, error } = useBooks()
const { request } = useBorrowings()

const book = ref<BookModel | null>(null)
onMounted(async () => {
  try {
    book.value = await fetchBook(props.id)
  } catch {
    void 0
  }
})

const ownerName = computed(() => fullName(book.value?.owner))
const isOwnBook = computed(() => book.value?.owner?._id === user.value?._id)

const isAvailable = computed(() => (book.value?.quantity ?? 0) > 0)

function goBack() {
  router.push({ name: 'browse' })
}

const showForm = ref(false)
const submitting = ref(false)
const form = reactive({ startDate: '', dueDate: '' })
const dateError = ref('')
const currentMinDateTime = ref('')

function toDateTimeLocalValue(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function openBorrowForm() {
  currentMinDateTime.value = toDateTimeLocalValue()
  dateError.value = ''
  showForm.value = true
}

const DEFAULT_TIME = '09:00'
const datePart = (v: string | undefined) => (v ? v.slice(0, 10) : '')
const timePart = (v: string | undefined) => (v && v.length > 10 ? v.slice(11, 16) : DEFAULT_TIME)

const rangeStart = computed({
  get: () => datePart(form.startDate),
  set: (d) => {
    form.startDate = d ? `${d}T${timePart(form.startDate)}` : ''

    if (form.dueDate && form.dueDate < form.startDate) form.dueDate = ''
  },
})
const rangeEnd = computed({
  get: () => datePart(form.dueDate),
  set: (d) => {
    form.dueDate = d ? `${d}T${timePart(form.dueDate)}` : ''
  },
})

const rangeMin = computed(() => datePart(currentMinDateTime.value))

function dayUTC(iso: string): number | null {
  const [y, m, d] = iso.split('-').map(Number)
  if (y === undefined || m === undefined || d === undefined) return null
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  return Date.UTC(y, m - 1, d)
}

const rangeDays = computed(() => {
  if (!rangeStart.value || !rangeEnd.value) return 0
  const start = dayUTC(rangeStart.value)
  const end = dayUTC(rangeEnd.value)
  if (start === null || end === null) return 0

  return Math.max(1, Math.round((end - start) / 86400000))
})

function clearRange() {
  form.startDate = ''
  form.dueDate = ''
}

const longDate = (v: string) => {
  const [y, m, d] = v.split('-').map(Number)
  if (y === undefined || m === undefined || d === undefined) return v
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const SAME_DAY_END = '18:00'
watch(
  () => [form.startDate, form.dueDate],
  () => {
    if (form.startDate && form.dueDate && form.dueDate <= form.startDate) {
      form.dueDate = `${datePart(form.dueDate)}T${SAME_DAY_END}`
    }
    dateError.value = ''
  },
)

function validate() {
  const start = form.startDate ? new Date(form.startDate) : null
  const due = form.dueDate ? new Date(form.dueDate) : null
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  if (!start) dateError.value = t('book.startRequired')
  else if (start < startOfToday) dateError.value = t('book.startPast')
  else if (!due) dateError.value = t('book.dueRequired')
  else if (due <= start) dateError.value = t('book.dueBeforeStart')
  else dateError.value = ''

  return !dateError.value
}

async function submit() {
  if (!validate()) return
  submitting.value = true
  try {
    await request({
      bookId: props.id,
      startDate: new Date(form.startDate).toISOString(),
      dueDate: new Date(form.dueDate).toISOString(),
    })
    showForm.value = false
    form.startDate = ''
    form.dueDate = ''
    success(t('book.requestSent'))
  } catch (err) {
    toastError(errorMessage(err, t('book.requestFailed')))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="detail">
    <button type="button" class="detail__back" @click="goBack">
      <ArrowLeft :size="18" :stroke-width="2" aria-hidden="true" />
      {{ t('book.backToBrowse') }}
    </button>

    <div v-if="loading && !book" class="detail__skeleton" role="presentation">
      <LSkeleton variant="block" class="detail__skeleton-cover" />
      <div class="detail__skeleton-body">
        <LSkeleton width="60%" height="1.5rem" />
        <LSkeleton width="35%" />
        <LSkeleton width="80%" height="0.625rem" />
        <LSkeleton width="70%" height="0.625rem" />
        <LSkeleton width="50%" height="0.625rem" />
      </div>
    </div>
    <p v-else-if="!book" class="detail__notfound">{{ error || t('book.notFound') }}</p>

    <div v-else class="detail__grid">
      <div class="detail__cover">
        <img
          v-if="book.cover"
          :src="book.cover"
          :alt="t('book.coverAlt', { title: book.title })"
          class="detail__img"
        />
        <div v-else class="detail__placeholder">
          <Book :size="48" :stroke-width="1.25" aria-hidden="true" />
          <span>{{ book.title }}</span>
        </div>
      </div>

      <div class="detail__info">
        <span class="detail__status" :class="isAvailable ? 'is-available' : 'is-borrowed'">
          <span class="detail__status-dot" aria-hidden="true" />
          {{ isAvailable ? t('book.available') : t('book.unavailable') }}
        </span>

        <h1 class="detail__title">{{ book.title }}</h1>
        <p class="detail__owner">
          {{ t('book.owner') }}
          <RouterLink
            v-if="book.owner?._id"
            :to="{ name: 'account', params: { id: book.owner._id } }"
            class="detail__ownerlink"
          >
            {{ ownerName }}
          </RouterLink>
          <template v-else>{{ ownerName }}</template>
        </p>

        <div v-if="book.tags?.length" class="detail__tags">
          <LBadge v-for="tag in book.tags" :key="tag" variant="accent">{{ tag }}</LBadge>
        </div>

        <dl class="detail__facts">
          <div class="detail__fact">
            <dt><User :size="15" :stroke-width="2" aria-hidden="true" /> {{ t('book.author') }}</dt>
            <dd>{{ book.author || t('common.dash') }}</dd>
          </div>
          <div class="detail__fact">
            <dt>
              <Building2 :size="15" :stroke-width="2" aria-hidden="true" />
              {{ t('book.publisher') }}
            </dt>
            <dd>{{ book.publisher || t('common.dash') }}</dd>
          </div>
          <div class="detail__fact">
            <dt>
              <Layers :size="15" :stroke-width="2" aria-hidden="true" /> {{ t('book.edition') }}
            </dt>
            <dd>
              {{ book.edition ? t('book.editionValue', { n: book.edition }) : t('common.dash') }}
            </dd>
          </div>
          <div class="detail__fact">
            <dt><Hash :size="15" :stroke-width="2" aria-hidden="true" /> {{ t('book.isbn') }}</dt>
            <dd>{{ book.isbn || t('common.dash') }}</dd>
          </div>
          <div class="detail__fact">
            <dt><Copy :size="15" :stroke-width="2" aria-hidden="true" /> {{ t('book.copies') }}</dt>
            <dd>{{ t('book.copiesValue', book.quantity ?? 0) }}</dd>
          </div>
        </dl>

        <section class="borrow">
          <p v-if="isOwnBook" class="borrow__note">
            <BookCheck :size="18" :stroke-width="2" aria-hidden="true" />
            {{ t('book.ownBook') }}
          </p>
          <p v-else-if="!isAvailable" class="borrow__note">
            <Clock :size="18" :stroke-width="2" aria-hidden="true" />
            {{ t('book.unavailableHint') }}
          </p>

          <template v-else>
            <div v-if="!showForm" class="borrow__cta">
              <div>
                <p class="borrow__title">{{ t('book.borrowTitle') }}</p>
                <p class="borrow__hint">{{ t('book.borrowHint') }}</p>
              </div>
              <LButton size="lg" @click="openBorrowForm">
                {{ t('book.requestToBorrow') }}
              </LButton>
            </div>

            <form v-else class="borrow__form" novalidate @submit.prevent="submit">
              <p class="borrow__title">{{ t('book.choosePeriod') }}</p>
              <LDateRange v-model:start="rangeStart" v-model:end="rangeEnd" :min="rangeMin" />
              <p v-if="dateError" class="borrow__error" role="alert">{{ dateError }}</p>

              <p class="borrow__summary">
                <span v-if="rangeStart && rangeEnd">
                  {{
                    t('book.rangeChosen', { start: longDate(rangeStart), end: longDate(rangeEnd) })
                  }}
                  <b class="borrow__days">
                    {{ t('book.rangeDays', rangeDays) }}
                  </b>
                </span>
                <span v-else-if="rangeStart">{{ t('book.rangePickEnd') }}</span>
                <span v-else>{{ t('book.rangePickStart') }}</span>
                <button
                  v-if="rangeStart || rangeEnd"
                  type="button"
                  class="borrow__clear"
                  @click="clearRange"
                >
                  {{ t('dateRange.clear') }}
                </button>
              </p>
              <div class="borrow__actions">
                <LButton
                  type="button"
                  variant="secondary"
                  :disabled="submitting"
                  @click="showForm = false"
                >
                  {{ t('common.cancel') }}
                </LButton>
                <LButton type="submit" :loading="submitting">
                  {{ submitting ? t('book.sending') : t('book.confirmRequest') }}
                </LButton>
              </div>
            </form>
          </template>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.detail {
  max-width: 58rem;
  margin: 0 auto;
  padding: var(--page-pad-y) var(--page-pad-x);
}

.detail__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: var(--space-5);
  padding: var(--space-2) var(--space-2) var(--space-2) 0;
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--ink-soft);
  background: none;
  border: 0;
  cursor: pointer;
  transition: color var(--dur) var(--ease);
}
.detail__back:hover {
  color: var(--ink);
}

@media (max-width: 768px) {
  .detail__back {
    display: none;
  }
}
.detail__notfound {
  padding: var(--space-8) 0;
  text-align: center;
  color: var(--ink-soft);
}

.detail__skeleton {
  display: grid;
  grid-template-columns: 14rem 1fr;
  gap: var(--space-5);
  align-items: start;
}
.detail__skeleton-cover {
  aspect-ratio: 3 / 4;
  border-radius: var(--radius-lg);
}
.detail__skeleton-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-2);
}
@media (max-width: 720px) {
  .detail__skeleton {
    grid-template-columns: 1fr;
  }
  .detail__skeleton-cover {
    max-width: 12rem;
  }
}

.detail__grid {
  display: grid;
  grid-template-columns: 14rem 1fr;
  gap: var(--space-5);
  align-items: start;
}

.detail__cover {
  aspect-ratio: 3 / 4;
  align-self: start;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
}
.detail__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.detail__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-5);
  text-align: center;
  color: var(--ink-faint);
}
.detail__placeholder span {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: var(--text-base);
  line-height: var(--leading-snug);
}

.detail__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.detail__status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 3px 10px;
  margin-bottom: var(--space-2);
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 600;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
}
.detail__status-dot {
  width: var(--status-dot);
  height: var(--status-dot);
  border-radius: var(--radius-round);
}
.is-available {
  color: var(--success);
}
.is-available .detail__status-dot {
  background: var(--success);
}
.is-borrowed {
  color: var(--ink-soft);
}
.is-borrowed .detail__status-dot {
  background: var(--ink-faint);
}

.detail__title {
  margin: 0 0 var(--space-1);
  font-size: var(--text-2xl);
  letter-spacing: var(--tracking-tight);
}

.detail__owner {
  margin: 0 0 var(--space-4);
  font-size: var(--text-lg);
  color: var(--ink-soft);
}
.detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
}

.detail__facts {
  display: grid;

  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4) var(--space-5);
  margin: 0 0 var(--space-5);
  padding: var(--space-5);
  background: var(--bg-subtle);
  border-radius: var(--radius-lg);
}
.detail__fact dt {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  color: var(--ink-faint);
  margin-bottom: 4px;
}
.detail__fact dd {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--ink);
}
.detail__ownerlink {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--border);
  text-underline-offset: 2px;
  transition: text-decoration-color var(--dur) var(--ease);
}
.detail__ownerlink:hover {
  text-decoration-color: var(--primary);
}

.borrow {
  margin-top: auto;
  padding: var(--space-5);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.borrow__note {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--text-sm);
  color: var(--ink-soft);
}
.borrow__note svg {
  flex-shrink: 0;
  color: var(--ink-faint);
}

.borrow__cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}
.borrow__title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--ink);
}
.borrow__hint {
  margin: 2px 0 0;
  font-size: var(--text-sm);
  color: var(--ink-soft);
}

.borrow__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.borrow__form .borrow__title {
  margin-bottom: calc(-1 * var(--space-1));
}

.borrow__clear {
  margin-left: var(--space-3);
  padding: 0;
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  color: var(--accent);
  background: none;
  border: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.borrow__clear:hover {
  color: var(--accent-700);
}

.borrow__days {
  color: var(--ink);
  font-weight: 600;
}

.borrow__summary {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  color: var(--ink-soft);
}
.borrow__error {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  color: var(--danger);
}
.borrow__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.borrow__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

@media (max-width: 720px) {
  .detail__grid {
    grid-template-columns: 1fr;
    gap: var(--space-5);
  }

  .detail__cover {
    min-height: 0;
    aspect-ratio: 3 / 4;
    max-width: 14rem;
  }
}

@media (max-width: 560px) {
  .detail__cover {
    width: 7.5rem;
    max-width: 7.5rem;
    margin-inline: auto;
  }

  .detail__status {
    align-self: center;
    margin-top: calc(var(--space-2) * -1);
    margin-bottom: var(--space-3);
  }
  .detail__placeholder span {
    display: none;
  }
  .detail__placeholder svg {
    width: 32px;
    height: 32px;
  }
}
@media (max-width: 480px) {
  .detail__facts {
    grid-template-columns: 1fr;
  }
  .borrow__cta {
    flex-direction: column;
    align-items: stretch;
  }
  .borrow__row {
    grid-template-columns: 1fr;
  }
  .borrow__actions :deep(.l-btn) {
    flex: 1;
  }
}
</style>
