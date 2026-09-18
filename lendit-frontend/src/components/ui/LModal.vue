<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from '@lucide/vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },

  closeLabel: { type: String, default: '' },
  size: { type: String, default: 'sm' },
})
const emit = defineEmits<{
  'update:open': [open: boolean]
  close: []
}>()

const { t } = useI18n()
const closeText = computed(() => props.closeLabel || t('common.close'))

const dialogEl = ref<HTMLElement | null>(null)
let lastFocused: HTMLElement | null = null

function close() {
  emit('update:open', false)
  emit('close')
}

function focusable(): HTMLElement[] {
  if (!dialogEl.value) return []
  return [
    ...dialogEl.value.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((el) => el.offsetParent !== null)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    close()
    return
  }
  if (e.key !== 'Tab') return
  const items = focusable()
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  if (!first || !last) return
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      lastFocused = document.activeElement as HTMLElement | null
      document.addEventListener('keydown', onKeydown)
      document.body.style.overflow = 'hidden'
      nextTick(() => focusable()[0]?.focus())
    } else {
      document.removeEventListener('keydown', onKeydown)
      document.body.style.overflow = ''
      lastFocused?.focus?.()
      lastFocused = null
    }
  },
)
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="l-modal">
        <div
          ref="dialogEl"
          class="l-modal__dialog"
          :class="`l-modal__dialog--${size}`"
          role="dialog"
          aria-modal="true"
          :aria-label="title || undefined"
        >
          <header v-if="title || $slots.header" class="l-modal__head">
            <slot name="header"
              ><h2 class="l-modal__title">{{ title }}</h2></slot
            >
            <button type="button" class="l-modal__close" :aria-label="closeText" @click="close">
              <X :size="18" :stroke-width="2" aria-hidden="true" />
            </button>
          </header>

          <div class="l-modal__body"><slot /></div>

          <footer v-if="$slots.footer" class="l-modal__footer">
            <slot name="footer" :close="close" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.l-modal {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: var(--overlay);
  -webkit-backdrop-filter: blur(var(--overlay-blur));
  backdrop-filter: blur(var(--overlay-blur));
}
.l-modal__dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: var(--modal-sm);
  max-height: calc(var(--screen-height) - var(--space-6));
  background: var(--surface);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(180%);
  backdrop-filter: blur(var(--glass-blur)) saturate(180%);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.l-modal__dialog--sm {
  max-width: var(--modal-sm);
}
.l-modal__dialog--md {
  max-width: var(--modal-md);
}
.l-modal__dialog--lg {
  max-width: var(--modal-lg);
}
.l-modal__head {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-5) 0;
}
.l-modal__title {
  margin: 0;
  font-size: var(--text-xl);
}
.l-modal__close {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--control-icon-sm);
  height: var(--control-icon-sm);
  margin: -4px -4px 0 0;
  color: var(--ink-soft);
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
}
.l-modal__close:hover {
  background: var(--bg-subtle);
  color: var(--ink);
}

.l-modal__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-4) var(--space-5);
  color: var(--ink-soft);
}
.l-modal__footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5) var(--space-5);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--dur) var(--ease);
}
.modal-enter-active .l-modal__dialog,
.modal-leave-active .l-modal__dialog {
  transition:
    transform var(--dur) var(--ease),
    opacity var(--dur) var(--ease);
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .l-modal__dialog,
.modal-leave-to .l-modal__dialog {
  transform: translateY(8px) scale(0.98);
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .modal-enter-from .l-modal__dialog,
  .modal-leave-to .l-modal__dialog {
    transform: none;
  }
}
</style>
