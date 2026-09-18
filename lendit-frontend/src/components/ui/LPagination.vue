<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight } from '@lucide/vue'

const { t } = useI18n()

const props = defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  siblings: { type: Number, default: 1 },
})
const emit = defineEmits<{ 'update:page': [page: number] }>()

const items = computed(() => {
  const total = props.totalPages
  const cur = props.page
  const sib = props.siblings
  if (total <= 1) return [1]

  const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

  const left = Math.max(cur - sib, 1)
  const right = Math.min(cur + sib, total)
  const showLeftDots = left > 2
  const showRightDots = right < total - 1

  const out: (number | string)[] = [1]
  if (showLeftDots) out.push('…')
  for (const p of range(Math.max(left, 2), Math.min(right, total - 1))) out.push(p)
  if (showRightDots) out.push('…')
  if (total > 1) out.push(total)
  return out
})

function go(p: number | string) {
  if (typeof p !== 'number') return
  if (p < 1 || p > props.totalPages || p === props.page) return
  emit('update:page', p)
}
</script>

<template>
  <nav v-if="totalPages > 1" class="l-pg" role="navigation" :aria-label="t('ui.pagination')">
    <button
      type="button"
      class="l-pg__btn l-pg__nav"
      :disabled="page <= 1"
      :aria-label="t('ui.previousPage')"
      @click="go(page - 1)"
    >
      <ChevronLeft :size="18" :stroke-width="2" aria-hidden="true" />
    </button>

    <template v-for="(it, i) in items" :key="i">
      <span v-if="it === '…'" class="l-pg__dots" aria-hidden="true">…</span>
      <button
        v-else
        type="button"
        class="l-pg__btn"
        :class="{ 'is-current': it === page }"
        :aria-current="it === page ? 'page' : undefined"
        :aria-label="t('ui.page', { n: it })"
        @click="go(it)"
      >
        {{ it }}
      </button>
    </template>

    <button
      type="button"
      class="l-pg__btn l-pg__nav"
      :disabled="page >= totalPages"
      :aria-label="t('ui.nextPage')"
      @click="go(page + 1)"
    >
      <ChevronRight :size="18" :stroke-width="2" aria-hidden="true" />
    </button>
  </nav>
</template>

<style scoped>
.l-pg {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  flex-wrap: wrap;
}
.l-pg__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  height: 38px;
  padding: 0 var(--space-2);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--ink-soft);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease),
    border-color var(--dur) var(--ease);
}
.l-pg__btn:hover:not(:disabled):not(.is-current) {
  color: var(--ink);
}
.l-pg__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.l-pg__btn.is-current {
  color: var(--fg-inverse);
  background: var(--primary);
  border-color: var(--primary);
  cursor: default;
}
.l-pg__nav {
  color: var(--ink);
}

.l-pg__dots {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 38px;
  color: var(--ink-faint);
}
</style>
