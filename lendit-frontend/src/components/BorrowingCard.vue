<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Calendar, TriangleAlert, Star } from '@lucide/vue'
import LCard from './ui/LCard.vue'
import LButton from './ui/LButton.vue'
import { statusLabelKey } from '../composables/useBorrowings'
import { isWithinRatingWindow, RATING_WINDOW_DAYS } from '../composables/useRatings'
import {
  formatDate,
  isOverdue as checkOverdue,
  overdueDuration as formatOverdueDuration,
} from '../utils/format'
import type { DecoratedBorrowing } from '../types/api'
import type { ButtonVariant } from './ui/types'

const props = defineProps<{ item: DecoratedBorrowing }>()
defineEmits<{
  action: [payload: { id: string; action: string }]
  rate: [item: DecoratedBorrowing]
}>()

const { t } = useI18n()

const fmt = formatDate
const isOwner = computed(() => props.item._role === 'owner')
const book = computed(() => props.item.book || {})
const bookTitle = computed(() => book.value.title || t('book.untitled'))
const counterpartLabel = computed(() =>
  isOwner.value ? t('borrowings.card.borrower') : t('borrowings.card.owner'),
)
const isOverdue = computed(() => checkOverdue(props.item))
const overdueDuration = computed(() => formatOverdueDuration(props.item))

const ACTIVE = new Set(['pending', 'borrowing'])
const daysToDue = computed(() => {
  if (!ACTIVE.has(props.item.status) || !props.item.dueDate) return null
  const due = new Date(props.item.dueDate)
  const a = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate())
  const now = new Date()
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((a - b) / 86400000)
})
const dueText = computed(() => {
  const n = daysToDue.value
  if (n === null || n < 0) return ''
  if (n === 0) return t('borrowings.card.dueToday')
  return t('borrowings.card.dueIn', n)
})

type CardAction = { key: string; label: string; variant: ButtonVariant }
const actions = computed<CardAction[]>(() => {
  const s = props.item.status
  if (isOwner.value) {
    if (s === 'pending')
      return [
        { key: 'borrowing', label: t('borrowings.actions.approve'), variant: 'primary' },
        { key: 'rejected', label: t('borrowings.actions.reject'), variant: 'secondary' },
      ]
    if (s === 'borrowing')
      return [{ key: 'returned', label: t('borrowings.actions.markReturned'), variant: 'primary' }]
  } else {
    if (s === 'pending')
      return [
        { key: 'cancelled', label: t('borrowings.actions.cancelRequest'), variant: 'primary' },
      ]
  }
  return []
})

const canRate = computed(() => isWithinRatingWindow(props.item))
</script>

<template>
  <LCard padding="none" class="brw" :class="{ 'is-overdue': isOverdue }">
    <div class="brw__main">
      <h3 class="brw__title" :title="bookTitle">{{ bookTitle }}</h3>
      <p class="brw__people">
        <span class="brw__label">{{ counterpartLabel }}</span>
        <RouterLink
          v-if="item.counterpartId"
          :to="{ name: 'account', params: { id: item.counterpartId } }"
          class="brw__personlink"
        >
          {{ item.counterpart }}
        </RouterLink>
        <template v-else>{{ item.counterpart }}</template>
      </p>
    </div>

    <div class="brw__when">
      <p class="brw__dates">
        <Calendar :size="13" :stroke-width="1.75" aria-hidden="true" />
        <span class="brw__range">{{ fmt(item.startDate) }} to {{ fmt(item.dueDate) }}</span>
      </p>
      <p v-if="isOverdue" class="brw__flag brw__flag--late">
        <TriangleAlert :size="12" :stroke-width="2.5" aria-hidden="true" />
        {{ t('borrowings.card.overdue', { duration: overdueDuration }) }}
      </p>
      <p v-else-if="item.returnedDate" class="brw__flag brw__flag--done">
        {{ t('borrowings.card.returnedOn', { date: fmt(item.returnedDate) }) }}
      </p>
      <p v-else-if="dueText" class="brw__flag">{{ dueText }}</p>
    </div>

    <div class="brw__actions">
      <template v-if="actions.length || canRate">
        <LButton
          v-for="a in actions"
          :key="a.key"
          :variant="a.variant"
          size="sm"
          @click="$emit('action', { id: item._id, action: a.key })"
        >
          {{ a.label }}
        </LButton>
        <LButton
          v-if="canRate"
          variant="secondary"
          size="sm"
          :title="t('borrowings.card.rateWindow', { days: RATING_WINDOW_DAYS })"
          @click="$emit('rate', item)"
        >
          <Star :size="15" :stroke-width="2" aria-hidden="true" />
          {{ t('borrowings.card.rate') }}
        </LButton>
      </template>

      <span v-else class="brw__state">{{ t(statusLabelKey(item.status)) }}</span>
    </div>
  </LCard>
</template>

<style scoped>
.brw {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(8rem, auto);
  align-items: center;
  gap: var(--space-3) var(--space-6);
  padding: var(--space-4) var(--space-5);
  transition:
    border-color var(--dur) var(--ease),
    background var(--dur) var(--ease);
}
.brw:hover {
  background: var(--bg-subtle);
}

.brw.is-overdue {
  border-color: color-mix(in srgb, var(--danger) 35%, var(--border));
}

.brw__main {
  min-width: 0;
}
.brw__title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  line-height: var(--leading-snug);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.brw__people {
  margin: 2px 0 0;
  font-size: var(--text-sm);
  color: var(--ink-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.brw__label {
  color: var(--ink-faint);
  margin-right: 5px;
}
.brw__personlink {
  color: var(--ink);
  text-decoration: underline;
  text-decoration-color: var(--border);
  text-underline-offset: 2px;
  transition: text-decoration-color var(--dur) var(--ease);
}
.brw__personlink:hover {
  text-decoration-color: var(--primary);
}

.brw__when {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: right;
}
.brw__dates {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--text-sm);
  color: var(--ink-soft);
  white-space: nowrap;
}
.brw__dates svg {
  color: var(--ink-faint);
  flex-shrink: 0;
}
.brw__range {
  font-variant-numeric: tabular-nums;
}
.brw__flag {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  color: var(--ink-faint);
  white-space: nowrap;
}
.brw__flag--late {
  color: var(--danger);
  font-weight: 600;
}
.brw__flag--done {
  color: var(--success);
}

.brw__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  justify-content: flex-end;
}

.brw__state {
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

@media (max-width: 900px) {
  .brw {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-2) var(--space-4);
  }
  .brw__when {
    grid-column: 1;
    text-align: left;
  }
  .brw__dates,
  .brw__flag {
    justify-content: flex-start;
  }
  .brw__actions {
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: center;
  }
}

@media (max-width: 560px) {
  .brw {
    grid-template-columns: 1fr;
    padding: var(--space-4);
  }
  .brw__title,
  .brw__people,
  .brw__dates,
  .brw__flag {
    white-space: normal;
  }
  .brw__actions {
    grid-column: 1;
    grid-row: auto;
    justify-content: flex-start;
    margin-top: var(--space-1);
  }
  .brw__actions :deep(.l-btn) {
    flex: 1;
  }
}
</style>
