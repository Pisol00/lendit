<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, Check, X, Search } from '@lucide/vue'
import type { SelectOption } from './types'

type OptionValue = string | number

type OptionInput = OptionValue | SelectOption

const props = withDefaults(
  defineProps<{
    modelValue?: OptionValue[]
    options: OptionInput[]

    placeholder?: string
    searchPlaceholder?: string

    label?: string
    disabled?: boolean
  }>(),
  {
    modelValue: () => [],
    placeholder: '',
    searchPlaceholder: '',
    label: '',
    disabled: false,
  },
)
const emit = defineEmits<{
  'update:modelValue': [value: OptionValue[]]
}>()

const { t } = useI18n()
const placeholderText = computed(() => props.placeholder || t('common.all'))
const searchPlaceholderText = computed(() => props.searchPlaceholder || t('common.search'))

const uid = useId()
const listId = `l-ms-list-${uid}`

const open = ref(false)
const activeIndex = ref(-1)
const query = ref('')
const rootEl = ref<HTMLElement | null>(null)
const triggerEl = ref<HTMLButtonElement | null>(null)
const menuEl = ref<HTMLElement | null>(null)
const listEl = ref<HTMLElement | null>(null)
const searchEl = ref<HTMLInputElement | null>(null)

const menuStyle = ref({})
function updatePosition() {
  const t = triggerEl.value
  if (!t) return
  const r = t.getBoundingClientRect()
  const gap = 4
  const maxH = 300
  const below = window.innerHeight - r.bottom
  const openUp = below < maxH + gap && r.top > below
  menuStyle.value = {
    position: 'fixed',
    left: `${r.left}px`,
    width: `${r.width}px`,
    ...(openUp
      ? { bottom: `${window.innerHeight - r.top + gap}px` }
      : { top: `${r.bottom + gap}px` }),
  }
}

const opts = computed<SelectOption[]>(() =>
  props.options.map((o) =>
    typeof o === 'object' && o !== null ? o : { value: o, label: String(o) },
  ),
)

const filteredOpts = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (q) {
    return opts.value.filter((o) => o.label.toLowerCase().includes(q))
  }
  const selected = opts.value.filter((o) => isSelected(o.value))
  const rest = opts.value.filter((o) => !isSelected(o.value))
  return [...selected, ...rest]
})

const selectedCount = computed(() => props.modelValue.length)

const MAX_NAMED = 2
const selectedLabels = computed(() =>
  props.modelValue
    .map((v) => opts.value.find((o) => o.value === v)?.label ?? String(v))
    .filter(Boolean),
)
const triggerText = computed(() => {
  if (!selectedCount.value) return placeholderText.value
  return selectedLabels.value.slice(0, MAX_NAMED).join(', ')
})
const overflowCount = computed(() => Math.max(selectedCount.value - MAX_NAMED, 0))
function isSelected(v: OptionValue) {
  return props.modelValue.includes(v)
}

function openMenu() {
  if (props.disabled) return
  open.value = true
  activeIndex.value = 0
  updatePosition()
  nextTick(() => searchEl.value?.focus())
}
function closeMenu(focusTrigger = true) {
  open.value = false
  activeIndex.value = -1
  query.value = ''
  if (focusTrigger) nextTick(() => triggerEl.value?.focus())
}
function toggleOpen() {
  if (open.value) closeMenu()
  else openMenu()
}

function toggleValue(v: OptionValue) {
  if (v === undefined) return
  const next = isSelected(v) ? props.modelValue.filter((x) => x !== v) : [...props.modelValue, v]
  emit('update:modelValue', next)
}
function clearAll() {
  emit('update:modelValue', [])
}

function scrollActiveIntoView() {
  listEl.value?.children[activeIndex.value]?.scrollIntoView({ block: 'nearest' })
}
function move(delta: number) {
  const n = filteredOpts.value.length
  if (!n) return
  activeIndex.value = (activeIndex.value + delta + n) % n
  scrollActiveIntoView()
}

watch(filteredOpts, (list) => {
  if (activeIndex.value >= list.length) activeIndex.value = list.length ? 0 : -1
})

function onTriggerKeydown(e: KeyboardEvent) {
  if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
    e.preventDefault()
    openMenu()
  } else if (e.key === 'Escape' && open.value) {
    e.preventDefault()
    closeMenu()
  }
}

function onSearchKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      move(1)
      break
    case 'ArrowUp':
      e.preventDefault()
      move(-1)
      break
    case 'Enter': {
      e.preventDefault()

      const opt = filteredOpts.value[activeIndex.value]
      if (opt) toggleValue(opt.value)
      break
    }
    case 'Escape':
      e.preventDefault()
      closeMenu()
      break
    case 'Tab':
      closeMenu(false)
      break
  }
}

function onDocPointer(e: PointerEvent) {
  if (!open.value) return
  if (rootEl.value?.contains(e.target as Node | null)) return
  if (menuEl.value?.contains(e.target as Node | null)) return
  closeMenu(false)
}
function onReposition() {
  if (open.value) updatePosition()
}
watch(open, (v) => {
  if (v) {
    document.addEventListener('pointerdown', onDocPointer)
    window.addEventListener('scroll', onReposition, true)
    window.addEventListener('resize', onReposition)
  } else {
    document.removeEventListener('pointerdown', onDocPointer)
    window.removeEventListener('scroll', onReposition, true)
    window.removeEventListener('resize', onReposition)
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointer)
  window.removeEventListener('scroll', onReposition, true)
  window.removeEventListener('resize', onReposition)
})
</script>

<template>
  <div ref="rootEl" class="l-ms" :class="{ 'is-open': open, 'is-disabled': disabled }">
    <div class="l-ms__control">
      <button
        ref="triggerEl"
        type="button"
        class="l-ms__trigger"
        :class="{ 'has-clear': selectedCount }"
        :disabled="disabled"
        :aria-label="label || undefined"
        aria-haspopup="listbox"
        :aria-expanded="open"
        :aria-controls="open ? listId : undefined"
        @click="toggleOpen"
        @keydown="onTriggerKeydown"
      >
        <span
          class="l-ms__value"
          :class="{ 'is-placeholder': !selectedCount }"
          :title="selectedCount ? selectedLabels.join(', ') : undefined"
        >
          {{ triggerText }}
        </span>
        <span v-if="overflowCount" class="l-ms__count">+{{ overflowCount }}</span>
        <ChevronDown v-else :size="16" :stroke-width="2" class="l-ms__chevron" aria-hidden="true" />
      </button>

      <button
        v-if="selectedCount"
        type="button"
        class="l-ms__clear-x"
        :aria-label="t('ui.clearSelection')"
        @click.stop="clearAll"
      >
        <X :size="15" :stroke-width="2.25" aria-hidden="true" />
      </button>
    </div>

    <Teleport to="body">
      <div v-show="open" ref="menuEl" class="l-ms__menu" :style="menuStyle">
        <div class="l-ms__search">
          <Search :size="15" :stroke-width="2" class="l-ms__search-icon" aria-hidden="true" />
          <input
            ref="searchEl"
            v-model="query"
            type="text"
            class="l-ms__search-input"
            :placeholder="searchPlaceholderText"
            :aria-label="searchPlaceholderText"
            :aria-controls="listId"
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            autocomplete="off"
            @keydown="onSearchKeydown"
          />
        </div>

        <div
          :id="listId"
          ref="listEl"
          class="l-ms__list"
          role="listbox"
          aria-multiselectable="true"
          :aria-activedescendant="activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined"
        >
          <div
            v-for="(opt, i) in filteredOpts"
            :id="`${listId}-opt-${i}`"
            :key="opt.value"
            class="l-ms__option"
            :class="{ 'is-active': i === activeIndex, 'is-selected': isSelected(opt.value) }"
            role="option"
            :aria-selected="isSelected(opt.value)"
            @click="toggleValue(opt.value)"
            @mousemove="activeIndex = i"
          >
            <span class="l-ms__check" aria-hidden="true">
              <Check v-if="isSelected(opt.value)" :size="13" :stroke-width="3" />
            </span>
            <span class="l-ms__option-label">{{ opt.label }}</span>
          </div>

          <p v-if="!filteredOpts.length" class="l-ms__empty">{{ t('ui.noTagsFound') }}</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.l-ms {
  position: relative;
}
.l-ms__control {
  position: relative;
}

.l-ms__trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: var(--control-md);
  padding: 0 var(--space-3);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  color: var(--ink);
  background: var(--surface-solid);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  cursor: pointer;
  transition:
    border-color var(--dur) var(--ease),
    box-shadow var(--dur) var(--ease);
}
.l-ms__trigger.has-clear {
  padding-right: 2.375rem;
}
.l-ms__trigger:focus-visible {
  outline: none;
  border-color: var(--control-border-focus);
  box-shadow: var(--focus-ring);
}
.is-disabled .l-ms__trigger {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--bg-subtle);
}

.l-ms__value {
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.l-ms__value.is-placeholder {
  color: var(--ink-faint);
}

.l-ms__count {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--fg-inverse);
  background: var(--accent);
  border-radius: var(--radius-pill);
}

.l-ms__chevron {
  flex-shrink: 0;
  color: var(--ink-soft);
  transition: transform var(--dur) var(--ease);
}
.is-open .l-ms__chevron {
  transform: rotate(180deg);
}

.l-ms__clear-x {
  position: absolute;
  top: 50%;
  right: var(--space-2);
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: var(--ink-soft);
  background: var(--transparent);
  border: 0;
  border-radius: var(--radius-round);
  cursor: pointer;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
}
.l-ms__clear-x:hover {
  background: var(--danger-tint);
  color: var(--danger);
}
.l-ms__clear-x:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.l-ms__menu {
  z-index: calc(var(--z-modal) + 10);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  box-shadow: var(--glass-shadow);
}
@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .l-ms__menu {
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(160%);
    backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  }
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .l-ms__menu {
    background: var(--surface-solid);
    border-color: var(--border);
  }
}

.l-ms__search {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: var(--space-2);
  border-bottom: 1px solid var(--glass-hairline);
}
.l-ms__search-icon {
  position: absolute;
  left: calc(var(--space-2) + var(--space-2));
  color: var(--ink-faint);
  pointer-events: none;
}
.l-ms__search-input {
  width: 100%;
  min-height: var(--control-sm);
  padding: 0 var(--space-2) 0 2rem;
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  color: var(--ink);
  background: var(--surface-solid);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  outline: none;
}
.l-ms__search-input:focus {
  border-color: var(--control-border-focus);
}
.l-ms__search-input::placeholder {
  color: var(--ink-faint);
}

.l-ms__list {
  flex: 1;
  min-height: 0;
  padding: var(--space-1);
  max-height: 15rem;
  overflow-y: auto;
  outline: none;
}

.l-ms__empty {
  margin: 0;
  padding: var(--space-3) var(--space-2);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  color: var(--ink-faint);
  text-align: center;
}

.l-ms__option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-2);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  color: var(--ink);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.l-ms__option.is-active {
  background: var(--bg-subtle);
}
.l-ms__option-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.l-ms__check {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: var(--fg-inverse);
  background: var(--surface-solid);
  border: 1.5px solid var(--border-strong);
  border-radius: 5px;
  transition:
    background var(--dur) var(--ease),
    border-color var(--dur) var(--ease);
}
.is-selected .l-ms__check {
  background: var(--accent);
  border-color: var(--control-border-focus);
}
.is-selected .l-ms__option-label {
  font-weight: 500;
}
</style>
