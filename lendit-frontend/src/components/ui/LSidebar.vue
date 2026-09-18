<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight, X } from '@lucide/vue'
import type { NavItem } from './types'

const props = withDefaults(
  defineProps<{
    items: NavItem[]

    active?: string | symbol | null

    collapsed?: boolean

    mobileOpen?: boolean

    title?: string
  }>(),
  {
    active: '',
    collapsed: false,
    mobileOpen: false,
    title: '',
  },
)
const emit = defineEmits<{
  navigate: [key: string]
  'update:collapsed': [value: boolean]
  'update:mobileOpen': [value: boolean]
}>()

const { t } = useI18n()
const titleText = computed(() => props.title || t('app.name'))

const asideEl = ref<HTMLElement | null>(null)

let lastFocused: HTMLElement | null = null

const isMobile = ref(false)
let mq: MediaQueryList | undefined
function syncMobile() {
  isMobile.value = mq?.matches ?? false
}
onMounted(() => {
  mq = window.matchMedia('(max-width: 768px)')
  syncMobile()
  mq.addEventListener('change', syncMobile)
})

function go(key: string) {
  emit('navigate', key)
  emit('update:mobileOpen', false)
}

function focusableInDrawer() {
  if (!asideEl.value) return []
  return [
    ...asideEl.value.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((el) => el.offsetParent !== null)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('update:mobileOpen', false)
    return
  }
  if (e.key !== 'Tab') return
  const items = focusableInDrawer()
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
  () => props.mobileOpen,
  (open) => {
    if (open) {
      lastFocused = document.activeElement as HTMLElement | null
      document.addEventListener('keydown', onKeydown)
      document.body.style.overflow = 'hidden'
      nextTick(() => focusableInDrawer()[0]?.focus())
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
  mq?.removeEventListener('change', syncMobile)
})
</script>

<template>
  <div v-if="mobileOpen" class="l-sidebar__backdrop" @click="emit('update:mobileOpen', false)" />

  <aside
    ref="asideEl"
    class="l-sidebar"
    :class="{ 'is-collapsed': collapsed, 'is-mobile-open': mobileOpen }"
    :aria-label="t('nav.sidebar')"
    :role="isMobile ? 'dialog' : undefined"
    :aria-modal="isMobile && mobileOpen ? 'true' : undefined"
  >
    <div class="l-sidebar__head">
      <span v-show="!collapsed" class="l-sidebar__brand">{{ titleText }}</span>
      <button
        type="button"
        class="l-sidebar__collapse"
        :aria-label="collapsed ? t('nav.expandMenu') : t('nav.collapseMenu')"
        @click="emit('update:collapsed', !collapsed)"
      >
        <component
          :is="collapsed ? ChevronRight : ChevronLeft"
          :size="18"
          :stroke-width="2"
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        class="l-sidebar__close"
        :aria-label="t('nav.closeMenu')"
        @click="emit('update:mobileOpen', false)"
      >
        <X :size="20" :stroke-width="2" aria-hidden="true" />
      </button>
    </div>

    <nav class="l-sidebar__nav" :aria-label="t('nav.mainMenu')">
      <ul class="l-sidebar__list">
        <li v-for="item in items" :key="item.key">
          <button
            type="button"
            class="l-sidebar__item"
            :class="{ 'is-active': item.key === active }"
            :aria-current="item.key === active ? 'page' : undefined"
            :title="collapsed ? item.label : undefined"
            @click="go(item.key)"
          >
            <component
              :is="item.icon"
              :size="20"
              :stroke-width="2"
              class="l-sidebar__icon"
              aria-hidden="true"
            />
            <span v-show="!collapsed" class="l-sidebar__label">{{ item.label }}</span>
          </button>
        </li>
      </ul>
    </nav>

    <div v-if="$slots.footer" class="l-sidebar__footer">
      <slot name="footer" :collapsed="collapsed" />
    </div>
  </aside>
</template>

<style scoped>
.l-sidebar {
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width);

  position: sticky;
  top: 0;
  align-self: flex-start;
  height: var(--screen-height);
  max-height: var(--screen-height);
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  border-right: 1px solid var(--glass-hairline);
  transition: width var(--dur) var(--ease);
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .l-sidebar {
    background: var(--surface-solid);
  }
}
.l-sidebar.is-collapsed {
  width: var(--sidebar-collapsed-width);
}

.l-sidebar__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: var(--sidebar-head-height);
  padding: 0 var(--space-3);
  border-bottom: 1px solid var(--border);
}
.l-sidebar__brand {
  flex: 1;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: var(--text-lg);
  letter-spacing: var(--tracking-tight);
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
}
.is-collapsed .l-sidebar__head {
  justify-content: center;
}

.l-sidebar__collapse,
.l-sidebar__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--control-icon-md);
  height: var(--control-icon-md);
  color: var(--ink-soft);
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
}
.l-sidebar__collapse:hover,
.l-sidebar__close:hover {
  background: var(--bg-subtle);
  color: var(--ink);
}
.l-sidebar__close {
  display: none;
}

.l-sidebar__nav {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3);
}
.l-sidebar__footer {
  padding: var(--space-3);
  border-top: 1px solid var(--border);
}
.l-sidebar__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.l-sidebar__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: var(--control-md);
  padding: 0 var(--space-3);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--ink-soft);
  text-align: left;
  background: none;
  border: 0;
  border-radius: var(--radius);
  cursor: pointer;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
}
.is-collapsed .l-sidebar__item {
  justify-content: center;
  padding: 0;
}
.l-sidebar__item:hover {
  background: var(--bg-subtle);
  color: var(--ink);
}
.l-sidebar__item.is-active {
  background: var(--primary);
  color: var(--fg-inverse);
}
.l-sidebar__icon {
  flex-shrink: 0;
}
.l-sidebar__label {
  white-space: nowrap;
  overflow: hidden;
}

.l-sidebar__backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  background: var(--overlay-soft);
  -webkit-backdrop-filter: blur(var(--overlay-blur));
  backdrop-filter: blur(var(--overlay-blur));
}

@media (max-width: 768px) {
  .l-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    z-index: var(--z-modal);
    width: var(--sidebar-width) !important;
    transform: translateX(-100%);
    transition: transform var(--dur) var(--ease);
    box-shadow: var(--shadow-lg);
  }
  .l-sidebar.is-mobile-open {
    transform: translateX(0);
  }
  .l-sidebar__collapse {
    display: none;
  }
  .l-sidebar__close {
    display: inline-flex;
  }
  .is-collapsed .l-sidebar__head {
    justify-content: space-between;
  }
  .l-sidebar__brand {
    display: inline !important;
  }
  .is-collapsed .l-sidebar__item {
    justify-content: flex-start;
    padding: 0 var(--space-3);
  }
  .l-sidebar__label {
    display: inline !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .l-sidebar {
    transition: none;
  }
}
</style>
