<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, Check } from '@lucide/vue'
import type { SelectOption } from './types'

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    options: SelectOption[]

    placeholder?: string

    label?: string
    disabled?: boolean
  }>(),
  {
    modelValue: null,
    placeholder: '',
    label: '',
    disabled: false,
  },
)
const emit = defineEmits<{
  'update:modelValue': [value: string | number | null]
}>()

const { t } = useI18n()
const placeholderText = computed(() => props.placeholder || t('common.select'))

const uid = useId()
const listId = `l-select-list-${uid}`

const open = ref(false)
const activeIndex = ref(-1)
const rootEl = ref<HTMLElement | null>(null)
const triggerEl = ref<HTMLButtonElement | null>(null)
const listEl = ref<HTMLElement | null>(null)

const selectedIndex = computed(() => props.options.findIndex((o) => o.value === props.modelValue))
const selectedLabel = computed(() =>
  selectedIndex.value >= 0 ? (props.options[selectedIndex.value]?.label ?? '') : '',
)

function openMenu() {
  if (props.disabled) return
  open.value = true
  activeIndex.value = selectedIndex.value >= 0 ? selectedIndex.value : 0
  nextTick(scrollActiveIntoView)
}
function closeMenu(focusTrigger = true) {
  open.value = false
  activeIndex.value = -1
  if (focusTrigger) nextTick(() => triggerEl.value?.focus())
}
function toggle() {
  if (open.value) closeMenu()
  else openMenu()
}
function selectIndex(i: number) {
  const opt = props.options[i]
  if (!opt) return
  emit('update:modelValue', opt.value)
  closeMenu()
}

function scrollActiveIntoView() {
  const el = listEl.value?.children[activeIndex.value]
  el?.scrollIntoView({ block: 'nearest' })
}
function move(delta: number) {
  const n = props.options.length
  if (!n) return
  activeIndex.value = (activeIndex.value + delta + n) % n
  scrollActiveIntoView()
}

function onTriggerKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowDown':
    case 'ArrowUp':
    case 'Enter':
    case ' ':
      e.preventDefault()
      if (open.value) selectIndex(activeIndex.value)
      else openMenu()
      break
    case 'Escape':
      if (open.value) {
        e.preventDefault()
        closeMenu()
      }
      break
  }
}
function onListKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      move(1)
      break
    case 'ArrowUp':
      e.preventDefault()
      move(-1)
      break
    case 'Home':
      e.preventDefault()
      activeIndex.value = 0
      scrollActiveIntoView()
      break
    case 'End':
      e.preventDefault()
      activeIndex.value = props.options.length - 1
      scrollActiveIntoView()
      break
    case 'Enter':
    case ' ':
      e.preventDefault()
      selectIndex(activeIndex.value)
      break
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
  if (open.value && rootEl.value && !rootEl.value.contains(e.target as Node | null)) {
    closeMenu(false)
  }
}
watch(open, (v) => {
  if (v) {
    document.addEventListener('pointerdown', onDocPointer)
    nextTick(() => listEl.value?.focus())
  } else {
    document.removeEventListener('pointerdown', onDocPointer)
  }
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointer))
</script>

<template>
  <div ref="rootEl" class="l-select" :class="{ 'is-open': open, 'is-disabled': disabled }">
    <button
      ref="triggerEl"
      type="button"
      class="l-select__trigger"
      :disabled="disabled"
      :aria-label="label || undefined"
      :aria-haspopup="'listbox'"
      :aria-expanded="open"
      :aria-controls="open ? listId : undefined"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <span class="l-select__value" :class="{ 'is-placeholder': !selectedLabel }">
        {{ selectedLabel || placeholderText }}
      </span>
      <ChevronDown :size="16" :stroke-width="2" class="l-select__chevron" aria-hidden="true" />
    </button>

    <ul
      v-show="open"
      :id="listId"
      ref="listEl"
      class="l-select__list"
      role="listbox"
      tabindex="-1"
      :aria-activedescendant="activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined"
      @keydown="onListKeydown"
    >
      <li
        v-for="(opt, i) in options"
        :id="`${listId}-opt-${i}`"
        :key="opt.value"
        class="l-select__option"
        :class="{ 'is-active': i === activeIndex, 'is-selected': opt.value === modelValue }"
        role="option"
        :aria-selected="opt.value === modelValue"
        @click="selectIndex(i)"
        @mousemove="activeIndex = i"
      >
        <span class="l-select__option-label">{{ opt.label }}</span>
        <Check v-if="opt.value === modelValue" :size="15" :stroke-width="2.5" aria-hidden="true" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.l-select {
  position: relative;
}

.l-select__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
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
.l-select__trigger:focus-visible {
  outline: none;
  border-color: var(--control-border-focus);
  box-shadow: var(--focus-ring);
}
.is-disabled .l-select__trigger {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--bg-subtle);
}

.l-select__value {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.l-select__value.is-placeholder {
  color: var(--ink-faint);
}

.l-select__chevron {
  flex-shrink: 0;
  color: var(--ink-soft);
  transition: transform var(--dur) var(--ease);
}
.is-open .l-select__chevron {
  transform: rotate(180deg);
}

.l-select__list {
  position: absolute;
  z-index: var(--z-dropdown);
  top: calc(100% + var(--space-1));
  left: 0;
  right: 0;
  margin: 0;
  padding: var(--space-1);
  list-style: none;
  max-height: 16rem;
  overflow-y: auto;
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  box-shadow: var(--glass-shadow);
  outline: none;
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .l-select__list {
    background: var(--surface-solid);
    border-color: var(--border);
  }
}

.l-select__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  color: var(--ink);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.l-select__option.is-active {
  background: var(--bg-subtle);
}
.l-select__option.is-selected {
  color: var(--accent);
  font-weight: 500;
}
.l-select__option-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
