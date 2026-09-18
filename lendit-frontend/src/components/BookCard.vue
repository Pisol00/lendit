<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Book } from '@lucide/vue'
import LCard from './ui/LCard.vue'
import LBadge from './ui/LBadge.vue'
import { fullName } from '../utils/format'

import type { Book as BookModel } from '../types/api'

const props = withDefaults(
  defineProps<{
    book: BookModel

    interactive?: boolean
  }>(),
  { interactive: true },
)
defineEmits<{ select: [book: BookModel] }>()

const MAX_TAGS = 2

const { t } = useI18n()
const ownerName = computed(() => fullName(props.book.owner))

const visibleTags = computed(() => (props.book.tags || []).slice(0, MAX_TAGS))
const extraTagCount = computed(() => Math.max((props.book.tags?.length || 0) - MAX_TAGS, 0))

const isAvailable = computed(() => (props.book.quantity ?? 0) > 0)
</script>

<template>
  <LCard
    :interactive="interactive"
    padding="none"
    class="book"
    :class="{ 'book--interactive': interactive }"
    @click="interactive && $emit('select', book)"
  >
    <div class="book__cover">
      <img
        v-if="book.cover"
        :src="book.cover"
        :alt="t('book.coverAlt', { title: book.title })"
        class="book__img"
      />
      <Book v-else :size="26" :stroke-width="1.5" class="book__placeholder" aria-hidden="true" />
      <span class="book__stock" :class="{ 'is-out': !isAvailable }">
        {{ isAvailable ? t('book.available') : t('book.unavailable') }}
      </span>
    </div>

    <div class="book__body">
      <h3 class="book__title" :title="book.title">{{ book.title }}</h3>
      <p class="book__author">{{ book.author }}</p>

      <div v-if="book.tags?.length" class="book__tags">
        <LBadge v-for="tag in visibleTags" :key="tag" variant="accent">{{ tag }}</LBadge>
        <LBadge v-if="extraTagCount" variant="accent" :title="book.tags.slice(MAX_TAGS).join(', ')"
          >+{{ extraTagCount }}</LBadge
        >
      </div>

      <p v-if="!$slots.actions" class="book__owner">
        <span>{{ t('book.owner') }}</span> {{ ownerName }}
      </p>
      <div v-else class="book__actions"><slot name="actions" /></div>
    </div>
  </LCard>
</template>

<style scoped>
.book {
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.book--interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.book__cover {
  position: relative;
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--bg-subtle);
  color: var(--ink-faint);
}

.book__stock {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  padding: 2px var(--space-2);
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--success);
  background: var(--success-tint);
  border-radius: var(--radius-pill);
  backdrop-filter: blur(4px);
}
.book__stock.is-out {
  color: var(--ink-soft);
  background: var(--bg-subtle);
}
.book__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 300ms var(--ease);
}
.book--interactive:hover .book__img {
  transform: scale(1.04);
}

.book__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-4) var(--space-4);
  flex: 1;
}
.book__title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  line-height: var(--leading-snug);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.book__author {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--ink-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.book__tags {
  display: flex;
  flex-wrap: nowrap;
  gap: var(--space-1);
  margin-top: var(--space-2);
  overflow: hidden;
}

.book__tags :deep(.l-badge) {
  flex-shrink: 0;
  padding: 1px 7px;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--ink-soft);
  background: var(--bg-subtle);
  border-radius: var(--radius-sm);
}

.book__owner {
  margin: auto 0 0;
  padding-top: var(--space-3);
  font-size: var(--text-xs);
  color: var(--ink-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.book__owner span {
  color: var(--ink-faint);
}

.book__actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

@media (prefers-reduced-motion: reduce) {
  .book--interactive:hover .book__img {
    transform: none;
  }
}
</style>
