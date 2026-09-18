<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  Search,
  Library,
  ArrowLeftRight,
  LayoutDashboard,
  Users,
  Tags,
  Star,
  Menu,
  LogOut,
} from '@lucide/vue'
import LSidebar from './ui/LSidebar.vue'
import { useAuth } from '../composables/useAuth'
import { fullName as toFullName, initials as toInitials } from '../utils/format'

const props = defineProps({
  active: { type: [String, Symbol, null], default: 'browse' },
})
const emit = defineEmits<{ logout: [] }>()

const { t } = useI18n()
const router = useRouter()

const COLLAPSE_KEY = 'lendit:sidebar-collapsed'
const collapsed = ref(localStorage.getItem(COLLAPSE_KEY) === '1')
watch(collapsed, (v) => localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0'))
const mobileOpen = ref(false)
const contentEl = ref<HTMLElement | null>(null)

const { user, isAdmin } = useAuth()
const initials = computed(() => toInitials(user.value))
const fullName = computed(() => toFullName(user.value, ''))
const roleLabel = computed(() => (isAdmin.value ? t('role.administrator') : t('role.member')))

const navItems = computed(() =>
  isAdmin.value
    ? [
        { key: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
        { key: 'admin-accounts', label: t('nav.members'), icon: Users },
        { key: 'admin-ratings', label: t('nav.reviews'), icon: Star },
        { key: 'admin-tags', label: t('nav.tags'), icon: Tags },
      ]
    : [
        { key: 'browse', label: t('nav.browse'), icon: Search },
        { key: 'my-books', label: t('nav.myBooks'), icon: Library },
        { key: 'borrowings', label: t('nav.borrowings'), icon: ArrowLeftRight },
      ],
)

const activeKey = computed(() => props.active)
watch(
  () => props.active,
  async () => {
    await nextTick()
    contentEl.value?.scrollTo({ top: 0 })
  },
)

const titleMap = computed<Record<string, string>>(() => ({
  ...Object.fromEntries(navItems.value.map((i) => [i.key, i.label])),
  book: t('nav.bookDetail'),
  profile: t('nav.profile'),
  account: t('nav.account'),
}))

const activeLabel = () =>
  (typeof activeKey.value === 'string' ? titleMap.value[activeKey.value] : '') || t('app.name')

function navigate(key: string) {
  router.push({ name: key })
}

function openMyProfile() {
  if (!user.value?._id) return router.push({ name: 'profile' })
  router.push({ name: 'account', params: { id: user.value._id } })
}
</script>

<template>
  <div class="layout flex min-h-svh max-h-svh overflow-hidden">
    <LSidebar
      v-model:collapsed="collapsed"
      v-model:mobile-open="mobileOpen"
      :items="navItems"
      :active="activeKey"
      @navigate="navigate"
    >
      <template #footer="{ collapsed: isCollapsed }">
        <div class="user" :class="{ 'user--collapsed': isCollapsed }">
          <button
            type="button"
            class="user__profile"
            :title="isCollapsed ? fullName : t('nav.account')"
            :aria-label="t('nav.account')"
            @click="openMyProfile()"
          >
            <span class="user__avatar" aria-hidden="true">{{ initials }}</span>
            <span v-show="!isCollapsed" class="user__meta">
              <span class="user__name">{{ fullName }}</span>
              <span class="user__role">{{ roleLabel }}</span>
            </span>
          </button>

          <button
            type="button"
            class="user__logout"
            :aria-label="t('nav.signOut')"
            :title="t('nav.signOut')"
            @click="emit('logout')"
          >
            <LogOut :size="18" :stroke-width="2" aria-hidden="true" />
          </button>
        </div>
      </template>
    </LSidebar>

    <div class="layout__main">
      <header class="layout__topbar">
        <button
          type="button"
          class="layout__menu-btn"
          :aria-label="t('nav.openMenu')"
          @click="mobileOpen = true"
        >
          <Menu :size="22" :stroke-width="2" aria-hidden="true" />
        </button>
        <span class="layout__topbar-title">{{ activeLabel() }}</span>
      </header>

      <main ref="contentEl" class="layout__content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: var(--screen-height);
  max-height: var(--screen-height);
  overflow: hidden;
}
.layout__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  max-height: var(--screen-height);
  display: flex;
  flex-direction: column;
}

.layout__topbar {
  display: none;
  align-items: center;
  gap: var(--space-3);
  height: var(--topbar-height);
  padding: 0 var(--space-4);
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  border-bottom: 1px solid var(--glass-hairline);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}
.layout__menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--control-icon-lg);
  height: var(--control-icon-lg);
  margin-left: calc(-1 * var(--space-2));
  color: var(--ink);
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.layout__menu-btn:hover {
  background: var(--bg-subtle);
}
.layout__topbar-title {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: var(--text-lg);
  color: var(--ink);
}

.layout__content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  max-height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.user {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.user__profile {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 1;
  min-width: 0;
  padding: var(--space-2);
  border-radius: var(--radius);
  text-align: left;
  background: none;
  border: 0;
  cursor: pointer;
  transition: background var(--dur) var(--ease);
}
.user__profile:hover {
  background: var(--bg-subtle);
}

.user__avatar {
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
.user__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}
.user__name {
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user__role {
  font-size: var(--text-xs);
  color: var(--ink-faint);
}

.user__logout {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--control-icon-lg);
  height: var(--control-icon-lg);
  padding: 0;
  color: var(--ink-soft);
  background: none;
  border: 0;
  border-radius: var(--radius);
  cursor: pointer;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
}
.user__logout:hover {
  background: var(--danger-tint);
  color: var(--danger);
}

.user--collapsed {
  flex-direction: column;
}
.user--collapsed .user__profile,
.user--collapsed .user__logout {
  justify-content: center;
  width: 100%;
  padding: var(--space-2) 0;
  gap: 0;
}

@media (max-width: 768px) {
  .layout__topbar {
    display: flex;
  }
}
</style>
