<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Book, Pencil, Trash2 } from '@lucide/vue'
import LCard from './ui/LCard.vue'
import LBadge from './ui/LBadge.vue'
import LButton from './ui/LButton.vue'

import type { Book as BookModel } from '../types/api'

const props = defineProps<{ book: BookModel }>()
defineEmits<{
  edit: [book: BookModel]
  delete: [book: BookModel]
}>()

const TAG_LIMITS: [query: string, limit: number][] = [
  ['(max-width: 440px)', 0],
  ['(max-width: 820px)', 1],
]
const DEFAULT_TAGS = 2

const maxTags = ref(DEFAULT_TAGS)
const watched: [MediaQueryList, number][] = []

function syncTags() {
  const hit = watched.find(([mq]) => mq.matches)
  maxTags.value = hit ? hit[1] : DEFAULT_TAGS
}

onMounted(() => {
  for (const [query, limit] of TAG_LIMITS) {
    const mq = window.matchMedia(query)
    mq.addEventListener('change', syncTags)
    watched.push([mq, limit])
  }
  syncTags()
})
onUnmounted(() => {
  for (const [mq] of watched) mq.removeEventListener('change', syncTags)
})

const { t } = useI18n()
const visibleTags = computed(() => (props.book.tags || []).slice(0, maxTags.value))
const extraTagCount = computed(() => Math.max((props.book.tags?.length || 0) - maxTags.value, 0))
const copies = computed(() => props.book.quantity ?? 0)
</script>

<template>
  <LCard padding="none" class="mbc">
    <div class="mbc__cover">
      <img
        v-if="book.cover"
        :src="book.cover"
        :alt="t('book.coverAlt', { title: book.title })"
        class="mbc__img"
      />
      <Book v-else :size="24" :stroke-width="1.5" class="mbc__placeholder" aria-hidden="true" />

      <span class="mbc__copies">{{ t('book.copiesValue', copies) }}</span>
    </div>

    <div class="mbc__body">
      <h3 class="mbc__title" :title="book.title">{{ book.title }}</h3>
      <p class="mbc__author">{{ book.author }}</p>

      <div class="mbc__meta">
        <span v-if="book.edition" class="mbc__edition">
          {{ t('book.editionValue', { n: book.edition }) }}
        </span>
        <span v-if="book.edition && visibleTags.length" class="mbc__dot" aria-hidden="true"></span>
        <div v-if="visibleTags.length" class="mbc__tags">
          <LBadge v-for="tag in visibleTags" :key="tag" variant="accent">{{ tag }}</LBadge>
          <LBadge
            v-if="extraTagCount"
            variant="accent"
            :title="book.tags.slice(maxTags).join(', ')"
          >
            +{{ extraTagCount }}
          </LBadge>
        </div>
      </div>

      <div class="mbc__actions">
        <LButton variant="secondary" size="sm" class="mbc__edit" @click="$emit('edit', book)">
          <Pencil :size="15" :stroke-width="2" aria-hidden="true" /> {{ t('common.edit') }}
        </LButton>
        <button
          type="button"
          class="mbc__del"
          :aria-label="t('myBooks.deleteNamed', { title: book.title })"
          :title="t('common.delete')"
          @click="$emit('delete', book)"
        >
          <Trash2 :size="16" :stroke-width="2" aria-hidden="true" />
        </button>
      </div>
    </div>
  </LCard>
</template>

<style scoped>
.mbc {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  transition:
    border-color var(--dur) var(--ease),
    box-shadow var(--dur) var(--ease);
}
.mbc:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}

.mbc__cover {
  position: relative;
  aspect-ratio: 2 / 1;
  max-height: 7.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--bg-subtle);
  color: var(--ink-faint);
}
.mbc__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mbc__copies {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  padding: 2px var(--space-2);
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--ink);
  background: color-mix(in srgb, var(--surface) 86%, transparent);
  border-radius: var(--radius-pill);
  backdrop-filter: blur(4px);
}

.mbc__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-4) var(--space-4);
  flex: 1;
}

.mbc__title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  line-height: var(--leading-snug);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.mbc__author {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--ink-soft);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mbc__meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
  min-height: 1.375rem;
  overflow: hidden;
}
.mbc__edition {
  flex-shrink: 0;
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  color: var(--ink-faint);
  white-space: nowrap;
}
.mbc__dot {
  flex-shrink: 0;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--border-strong);
}
.mbc__tags {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  min-width: 0;
}

.mbc__tags :deep(.l-badge:not(:last-child)) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mbc__tags :deep(.l-badge) {
  padding: 1px 7px;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--ink-soft);
  background: var(--bg-subtle);
  border-radius: var(--radius-sm);
}

.mbc__tags :deep(.l-badge__dot) {
  display: none;
}

.mbc__actions {
  display: flex;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-3);
}
.mbc__edit {
  flex: 1;
}
.mbc__del {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--control-icon-md);
  height: var(--control-icon-md);
  color: var(--ink-soft);
  background: none;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  cursor: pointer;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease),
    border-color var(--dur) var(--ease);
}
.mbc__del:hover {
  background: var(--danger-tint);
  color: var(--danger);
  border-color: var(--danger);
}
</style>
