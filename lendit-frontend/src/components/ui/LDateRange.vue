<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight, ChevronDown } from '@lucide/vue'

const props = defineProps({
  start: { type: String, default: '' },
  end: { type: String, default: '' },

  min: { type: String, default: '' },
})
const emit = defineEmits<{
  'update:start': [value: string]
  'update:end': [value: string]
}>()

const { t, locale } = useI18n()

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const parse = (s: string | null | undefined): Date | null => {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  if (y === undefined || m === undefined || d === undefined) return null
  return new Date(y, m - 1, d)
}

const view = ref(parse(props.start) || parse(props.min) || new Date())
view.value = new Date(view.value.getFullYear(), view.value.getMonth(), 1)

watch(
  () => props.start,
  (v) => {
    const d = parse(v)
    if (d) view.value = new Date(d.getFullYear(), d.getMonth(), 1)
  },
)

const hovered = ref('')

const monthLabel = (date: Date) =>
  date.toLocaleString(locale.value, { month: 'long', year: 'numeric' })

function buildDays(monthStart: Date) {
  const first = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1)

  const lead = (first.getDay() + 6) % 7
  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(first.getFullYear(), first.getMonth(), 1 - lead + i)
    const outside = d.getMonth() !== monthStart.getMonth()
    cells.push({
      key: `${ymd(d)}-${i}`,
      value: outside ? '' : ymd(d),
      label: outside ? '' : d.getDate(),
      outside,
    })
  }
  return cells
}

const leftMonth = computed(() => view.value)
const rightMonth = computed(() => new Date(view.value.getFullYear(), view.value.getMonth() + 1, 1))
const panels = computed(() =>
  [leftMonth.value, rightMonth.value].map((m) => ({
    key: ymd(m),
    label: monthLabel(m),
    days: buildDays(m),
  })),
)

const weekdays = computed(() => {
  const monday = new Date(2024, 0, 1)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    return d.toLocaleString(locale.value, { weekday: 'narrow' })
  })
})

const isDisabled = (value: string) => Boolean(props.min) && value < props.min

const previewEnd = computed(() => {
  if (props.end) return props.end
  if (props.start && hovered.value > props.start) return hovered.value
  return ''
})

function dayState(value: string) {
  const inRange = props.start && previewEnd.value && value > props.start && value < previewEnd.value
  return {
    'is-start': value === props.start,
    'is-end': Boolean(previewEnd.value) && value === previewEnd.value,
    'is-in-range': Boolean(inRange),
    'is-disabled': isDisabled(value),
  }
}

function pick(value: string) {
  if (isDisabled(value)) return

  if (value === props.end && value !== props.start) {
    emit('update:end', '')
    return
  }
  if (value === props.start) {
    if (!props.end) {
      emit('update:end', value)
      return
    }

    emit('update:start', '')
    emit('update:end', '')
    return
  }

  if (!props.start || value < props.start) {
    emit('update:start', value)
    emit('update:end', '')
    return
  }
  emit('update:end', value)
}

const canPrev = computed(() => {
  if (!props.min) return true
  const minMonth = parse(props.min)
  if (!minMonth) return true
  return view.value > new Date(minMonth.getFullYear(), minMonth.getMonth(), 1)
})
function step(delta: number) {
  if (delta < 0 && !canPrev.value) return
  view.value = new Date(view.value.getFullYear(), view.value.getMonth() + delta, 1)
}

const MONTHS_AHEAD = 18
const jumpOptions = computed(() => {
  const from = parse(props.min) || new Date()
  const base = new Date(from.getFullYear(), from.getMonth(), 1)
  return Array.from({ length: MONTHS_AHEAD }, (_, i) => {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1)
    return { value: ymd(d), label: monthLabel(d) }
  })
})
const jumpLabel = computed(() => monthLabel(view.value))
const jumpOpen = ref(false)
const jumpEl = ref<HTMLElement | null>(null)

function selectMonth(value: string) {
  const d = parse(value)
  if (d) view.value = new Date(d.getFullYear(), d.getMonth(), 1)
  jumpOpen.value = false
}

function onDocPointer(e: PointerEvent) {
  if (jumpOpen.value && jumpEl.value && !jumpEl.value.contains(e.target as Node | null)) {
    jumpOpen.value = false
  }
}
function onDocKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') jumpOpen.value = false
}
onMounted(() => {
  document.addEventListener('pointerdown', onDocPointer)
  document.addEventListener('keydown', onDocKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointer)
  document.removeEventListener('keydown', onDocKeydown)
})
</script>

<template>
  <div class="l-range">
    <div class="l-range__nav">
      <div ref="jumpEl" class="l-range__jump">
        <button
          type="button"
          class="l-range__jump-trigger"
          :aria-label="t('dateRange.jumpToMonth')"
          :aria-expanded="jumpOpen"
          aria-haspopup="listbox"
          @click="jumpOpen = !jumpOpen"
        >
          {{ jumpLabel }}
          <ChevronDown
            :size="14"
            :stroke-width="2.5"
            class="l-range__jump-chevron"
            aria-hidden="true"
          />
        </button>
        <ul v-show="jumpOpen" class="l-range__jump-menu" role="listbox">
          <li
            v-for="opt in jumpOptions"
            :key="opt.value"
            class="l-range__jump-option"
            :class="{ 'is-selected': opt.label === jumpLabel }"
            role="option"
            :aria-selected="opt.label === jumpLabel"
            @click="selectMonth(opt.value)"
          >
            {{ opt.label }}
          </li>
        </ul>
      </div>
      <button
        type="button"
        class="l-range__step"
        :disabled="!canPrev"
        :aria-label="t('dateRange.prevMonth')"
        @click="step(-1)"
      >
        <ChevronLeft :size="16" :stroke-width="2.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="l-range__step"
        :aria-label="t('dateRange.nextMonth')"
        @click="step(1)"
      >
        <ChevronRight :size="16" :stroke-width="2.5" aria-hidden="true" />
      </button>
    </div>

    <div class="l-range__months" @mouseleave="hovered = ''">
      <div v-for="panel in panels" :key="panel.key" class="l-range__month">
        <p class="l-range__caption">{{ panel.label }}</p>
        <div class="l-range__weekdays" aria-hidden="true">
          <span v-for="(w, i) in weekdays" :key="i">{{ w }}</span>
        </div>
        <div class="l-range__grid">
          <span v-for="day in panel.days" :key="day.key" class="l-range__cell">
            <button
              v-if="!day.outside"
              type="button"
              class="l-range__day"
              :class="dayState(day.value)"
              :disabled="isDisabled(day.value)"
              @click="pick(day.value)"
              @mouseenter="hovered = day.value"
            >
              {{ day.label }}
            </button>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.l-range {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.l-range__nav {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-1);
}

.l-range__clear {
  height: 1.75rem;
  padding: 0 var(--space-2);
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--ink-soft);
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
}
.l-range__clear:hover {
  background: var(--bg-subtle);
  color: var(--ink);
}

.l-range__jump {
  position: relative;
}
.l-range__jump-trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  height: 1.75rem;
  padding: 0 var(--space-2);
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--ink-soft);
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  white-space: nowrap;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
}
.l-range__jump-trigger:hover,
.l-range__jump-trigger[aria-expanded='true'] {
  background: var(--bg-subtle);
  color: var(--ink);
}
.l-range__jump-chevron {
  color: var(--ink-faint);
  transition: transform var(--dur) var(--ease);
}
.l-range__jump-trigger[aria-expanded='true'] .l-range__jump-chevron {
  transform: rotate(180deg);
}
.l-range__jump-menu {
  position: absolute;
  z-index: var(--z-dropdown);
  top: calc(100% + var(--space-1));
  right: 0;
  margin: 0;
  padding: var(--space-1);
  list-style: none;
  min-width: 11rem;
  max-height: 14rem;
  overflow-y: auto;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
}
.l-range__jump-option {
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  color: var(--ink);
  white-space: nowrap;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.l-range__jump-option:hover {
  background: var(--bg-subtle);
}
.l-range__jump-option.is-selected {
  color: var(--fg-inverse);
  background: var(--primary);
  font-weight: 600;
}

.l-range__step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  color: var(--ink-soft);
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
}
.l-range__step:hover:not(:disabled) {
  background: var(--bg-subtle);
  color: var(--ink);
}
.l-range__step:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.l-range__months {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-5);
}
.l-range__caption {
  margin: 0 0 var(--space-3);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ink);
}
.l-range__weekdays,
.l-range__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.l-range__weekdays {
  margin-bottom: var(--space-1);
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  color: var(--ink-faint);
  text-align: center;
}
.l-range__grid {
  gap: 2px 0;
}

.l-range__day {
  width: 100%;
  height: 100%;
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  color: var(--ink);
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
}
.l-range__day:hover:not(:disabled):not(.is-start):not(.is-end) {
  background: var(--bg-subtle);
}

.l-range__cell {
  aspect-ratio: 1;
  display: block;
}
.l-range__day.is-disabled,
.l-range__day:disabled {
  color: var(--ink-faint);
  opacity: 0.4;
  cursor: not-allowed;
}
.l-range__day.is-in-range {
  background: var(--accent-tint);
  border-radius: 0;
}
.l-range__day.is-start,
.l-range__day.is-end {
  color: var(--fg-inverse);
  background: var(--primary);
  font-weight: 600;
}
.l-range__day.is-start {
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
}
.l-range__day.is-end {
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}
.l-range__day.is-start.is-end {
  border-radius: var(--radius-sm);
}

@media (max-width: 560px) {
  .l-range__months {
    grid-template-columns: 1fr;
  }
}
</style>
