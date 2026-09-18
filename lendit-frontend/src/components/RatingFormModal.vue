<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Star } from '@lucide/vue'
import LModal from './ui/LModal.vue'
import LButton from './ui/LButton.vue'
import type { DecoratedBorrowing } from '../types/api'

const props = withDefaults(
  defineProps<{
    open?: boolean

    borrowing?: DecoratedBorrowing | null
    submitting?: boolean
  }>(),
  { open: false, borrowing: null, submitting: false },
)
const emit = defineEmits<{
  'update:open': [open: boolean]
  submit: [payload: { borrowingId: string; rating: number; comment?: string }]
}>()

const MAX_COMMENT = 500

const { t } = useI18n()

const score = ref(0)
const hover = ref(0)
const comment = ref('')
const error = ref('')

const targetName = computed(() => props.borrowing?.counterpartName || t('rating.otherParty'))
const bookTitle = computed(() => props.borrowing?.book?.title || t('rating.thisBook'))
const roleLabel = computed(() =>
  props.borrowing?._role === 'owner' ? t('rating.roleBorrower') : t('rating.roleOwner'),
)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    score.value = 0
    hover.value = 0
    comment.value = ''
    error.value = ''
  },
)

const remaining = computed(() => MAX_COMMENT - comment.value.length)

const initials = computed(() => {
  const parts = targetName.value.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase() || '?'
})
const shownScore = computed(() => hover.value || score.value)
const scoreLabel = computed(() =>
  shownScore.value ? t(`rating.scoreLabels.${shownScore.value}`) : t('rating.scoreHint'),
)

function onSubmit() {
  const borrowingId = props.borrowing?._id
  if (!borrowingId) return
  if (score.value < 1 || score.value > 5) {
    error.value = t('rating.scoreRequired')
    return
  }
  if (comment.value.length > MAX_COMMENT) {
    error.value = t('rating.commentTooLong', { max: MAX_COMMENT })
    return
  }
  emit('submit', {
    borrowingId,
    rating: score.value,

    comment: comment.value.trim() || undefined,
  })
}
</script>

<template>
  <LModal
    :open="open"
    size="md"
    :title="t('rating.modalTitle')"
    @update:open="emit('update:open', $event)"
  >
    <form id="rating-form" class="ratef" novalidate @submit.prevent="onSubmit">
      <div class="ratef__who">
        <span class="ratef__avatar" aria-hidden="true">{{ initials }}</span>
        <span class="ratef__whotext">
          <span class="ratef__name">{{ targetName }}</span>
          <span class="ratef__role">{{ roleLabel }}</span>
        </span>
      </div>

      <p class="ratef__book">{{ t('rating.aboutBorrowing', { title: bookTitle }) }}</p>

      <div class="ratef__field">
        <div class="ratef__stars" role="radiogroup" :aria-label="t('rating.starsLabel')">
          <button
            v-for="n in 5"
            :key="n"
            type="button"
            role="radio"
            :aria-checked="score === n"
            :aria-label="n === 1 ? t('rating.star', { n }) : t('rating.stars', { n })"
            class="ratef__star"
            :class="{ 'is-on': n <= (hover || score) }"
            @click="score = n"
            @mouseenter="hover = n"
            @mouseleave="hover = 0"
            @focus="hover = n"
            @blur="hover = 0"
          >
            <Star :size="28" :stroke-width="1.75" aria-hidden="true" />
          </button>
          <span class="ratef__score-text" :class="{ 'is-set': shownScore }">
            {{ scoreLabel }}
          </span>
        </div>
      </div>

      <div class="ratef__field">
        <label for="rating-comment" class="ratef__label">{{ t('rating.comment') }}</label>
        <textarea
          id="rating-comment"
          v-model="comment"
          class="ratef__textarea"
          rows="4"
          :maxlength="MAX_COMMENT"
          :placeholder="t('rating.commentPlaceholder')"
        />
        <span class="ratef__counter">{{ t('rating.charsLeft', { n: remaining }) }}</span>
      </div>

      <p v-if="error" class="ratef__error" role="alert">{{ error }}</p>
    </form>

    <template #footer="{ close }">
      <LButton variant="secondary" :disabled="submitting" @click="close">
        {{ t('common.cancel') }}
      </LButton>
      <LButton type="submit" form="rating-form" :loading="submitting">
        {{ t('rating.submit') }}
      </LButton>
    </template>
  </LModal>
</template>

<style scoped>
.ratef {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.ratef__who {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.ratef__avatar {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--avatar-sm);
  height: var(--avatar-sm);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--fg-inverse);
  background: var(--primary);
  border-radius: var(--radius-pill);
}
.ratef__whotext {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.3;
}
.ratef__name {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--ink);
}
.ratef__role {
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  color: var(--ink-faint);
}
.ratef__book {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--ink-soft);
}
.ratef__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.ratef__label {
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--ink-soft);
}
.ratef__stars {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.ratef__star {
  padding: 2px;
  color: var(--border);
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: color var(--dur) var(--ease);
}
.ratef__star.is-on {
  color: var(--warning);
}
.ratef__star.is-on :deep(svg) {
  fill: currentColor;
}
.ratef__star:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
.ratef__score-text {
  margin-left: var(--space-3);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  color: var(--ink-faint);
}
.ratef__score-text.is-set {
  font-weight: 600;
  color: var(--ink);
}
.ratef__textarea {
  width: 100%;
  padding: var(--space-3);
  font: inherit;
  font-size: var(--text-sm);
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  resize: vertical;
}
.ratef__textarea:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -1px;
}
.ratef__counter {
  align-self: flex-end;
  font-size: var(--text-xs);
  color: var(--ink-faint);
}
.ratef__error {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--danger);
}
</style>
