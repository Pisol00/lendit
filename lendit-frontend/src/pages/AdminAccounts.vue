<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, Trash2, Ban, CircleCheck, Users } from '@lucide/vue'
import LInput from '../components/ui/LInput.vue'
import LButton from '../components/ui/LButton.vue'
import LBadge from '../components/ui/LBadge.vue'
import LModal from '../components/ui/LModal.vue'
import LEmpty from '../components/ui/LEmpty.vue'
import LPagination from '../components/ui/LPagination.vue'
import LSkeleton from '../components/ui/LSkeleton.vue'
import { TriangleAlert } from '@lucide/vue'
import { useToast } from '../composables/useToast'
import { useAccounts } from '../composables/useAccounts'
import { formatDate, initials } from '../utils/format'
import { errorMessage } from '../lib/query'
import type { Account } from '../types/api'

const { t } = useI18n()
const { info, error: toastError } = useToast()
const { accounts, pagination, loading, error, fetchAccounts, setStatus, removeAccount } =
  useAccounts()

const fmtDate = formatDate
const search = ref('')
const page = ref(1)
const limit = 10

function load() {
  fetchAccounts({ search: search.value.trim(), page: page.value, limit }).catch(() => {})
}

onMounted(load)

let searchT: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  page.value = 1
  clearTimeout(searchT)
  searchT = setTimeout(load, 300)
})
watch(page, load)

const canManage = (acc: Account) => acc.role === 'member'

async function toggleActive(acc: Account) {
  try {
    await setStatus(acc._id, !acc.isActive)
    info(
      !acc.isActive
        ? t('admin.members.activated', { name: acc.firstName })
        : t('admin.members.suspendedToast', { name: acc.firstName }),
    )
    load()
  } catch (err) {
    toastError(errorMessage(err, t('admin.members.statusFailed')))
  }
}

const confirmOpen = ref(false)
const pendingAccount = ref<Account | null>(null)
const removing = ref(false)
function askDelete(acc: Account) {
  pendingAccount.value = acc
  confirmOpen.value = true
}
async function confirmDelete() {
  const acc = pendingAccount.value
  if (!acc) return
  removing.value = true
  try {
    await removeAccount(acc._id)
    confirmOpen.value = false
    pendingAccount.value = null
    info(t('admin.members.deleted', { name: acc.firstName }))
    load()
  } catch (err) {
    toastError(errorMessage(err, t('admin.members.deleteFailed')))
  } finally {
    removing.value = false
  }
}
</script>

<template>
  <main class="admin">
    <header class="admin__head">
      <div>
        <h1 class="admin__title">{{ t('admin.members.title') }}</h1>
        <p class="admin__sub">{{ t('admin.members.subtitle') }}</p>
      </div>
    </header>

    <div class="admin__controls">
      <div class="admin__search">
        <LInput
          v-model="search"
          type="search"
          :placeholder="t('admin.members.searchPlaceholder')"
          :aria-label="t('admin.members.searchLabel')"
        >
          <template #prefix><Search :size="18" :stroke-width="2" aria-hidden="true" /></template>
        </LInput>
      </div>
    </div>

    <LEmpty
      v-if="error"
      tone="error"
      :icon="TriangleAlert"
      :title="t('errors.loadAccounts')"
      :hint="error"
    >
      <template #action>
        <LButton variant="secondary" @click="load()">{{ t('common.tryAgain') }}</LButton>
      </template>
    </LEmpty>

    <div v-else-if="loading && !accounts.length" class="admin__table" role="presentation">
      <div class="admin__tr admin__tr--head">
        <span>{{ t('admin.members.colMember') }}</span>
        <span class="admin__th-center">{{ t('admin.members.colRole') }}</span>
        <span class="admin__th-center">{{ t('admin.members.colStatus') }}</span>
        <span class="admin__th-center">{{ t('admin.members.colJoined') }}</span>
        <span class="admin__th-actions">{{ t('admin.members.colActions') }}</span>
      </div>
      <div v-for="n in 6" :key="n" class="admin__tr admin__tr--skeleton">
        <span class="admin__user">
          <LSkeleton variant="circle" width="var(--control-icon-md)" />
          <LSkeleton width="9rem" />
        </span>
        <LSkeleton width="3.5rem" />
        <LSkeleton width="4.5rem" />
        <LSkeleton width="5rem" />
        <LSkeleton width="3rem" height="var(--control-icon-md)" radius="var(--radius)" />
      </div>
    </div>

    <template v-else-if="accounts.length">
      <div class="admin__table" role="table">
        <div class="admin__tr admin__tr--head" role="row">
          <span role="columnheader">{{ t('admin.members.colMember') }}</span>
          <span role="columnheader" class="admin__th-center">{{ t('admin.members.colRole') }}</span>
          <span role="columnheader" class="admin__th-center">{{
            t('admin.members.colStatus')
          }}</span>
          <span role="columnheader" class="admin__th-center">{{
            t('admin.members.colJoined')
          }}</span>
          <span role="columnheader" class="admin__th-actions">
            {{ t('admin.members.colActions') }}
          </span>
        </div>
        <div v-for="acc in accounts" :key="acc._id" class="admin__tr" role="row">
          <span class="admin__user" role="cell">
            <span class="admin__avatar" aria-hidden="true">{{ initials(acc) }}</span>
            <span class="admin__user-text">
              <span class="admin__user-name">{{ acc.firstName }} {{ acc.lastName }}</span>
              <span class="admin__user-email">{{ acc.email }}</span>
            </span>
          </span>
          <span class="admin__cell-center" role="cell">
            <LBadge :variant="acc.role === 'admin' ? 'accent' : 'neutral'">
              {{ acc.role === 'admin' ? t('role.admin') : t('role.member') }}
            </LBadge>
          </span>
          <span class="admin__cell-center" role="cell">
            <LBadge :variant="acc.isActive ? 'success' : 'neutral'">
              {{ acc.isActive ? t('admin.members.active') : t('admin.members.suspended') }}
            </LBadge>
          </span>
          <span class="admin__date admin__cell-center" role="cell">
            {{ fmtDate(acc.createdAt) }}
          </span>
          <span class="admin__actions" role="cell">
            <template v-if="canManage(acc)">
              <button
                type="button"
                class="admin__icon-btn"
                :title="
                  acc.isActive
                    ? t('admin.members.suspendAccount')
                    : t('admin.members.activateAccount')
                "
                :aria-label="
                  acc.isActive
                    ? t('admin.members.suspendAccount')
                    : t('admin.members.activateAccount')
                "
                @click="toggleActive(acc)"
              >
                <Ban v-if="acc.isActive" :size="17" :stroke-width="2" aria-hidden="true" />
                <CircleCheck v-else :size="17" :stroke-width="2" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="admin__icon-btn admin__icon-btn--danger"
                :title="t('admin.members.deleteAccount')"
                :aria-label="t('admin.members.deleteAccount')"
                @click="askDelete(acc)"
              >
                <Trash2 :size="17" :stroke-width="2" aria-hidden="true" />
              </button>
            </template>
            <span v-else class="admin__self">{{ t('common.dash') }}</span>
          </span>
        </div>
      </div>

      <LPagination
        v-if="pagination.totalPages > 1"
        class="admin__pagination"
        :page="page"
        :total-pages="pagination.totalPages"
        @update:page="(p) => (page = p)"
      />
    </template>
    <LEmpty
      v-else-if="search.trim()"
      :icon="Search"
      :title="t('admin.members.empty')"
      :hint="t('admin.members.emptyHint')"
    />
    <LEmpty
      v-else
      :icon="Users"
      :title="t('admin.members.noneTitle')"
      :hint="t('admin.members.noneHint')"
    />

    <LModal v-model:open="confirmOpen" :title="t('admin.members.deleteTitle')">
      <p v-if="pendingAccount">
        {{
          t('admin.members.deleteConfirm', {
            name: `${pendingAccount.firstName} ${pendingAccount.lastName}`,
            email: pendingAccount.email,
          })
        }}
      </p>
      <template #footer="{ close }">
        <LButton variant="secondary" :disabled="removing" @click="close">
          {{ t('common.cancel') }}
        </LButton>
        <LButton variant="danger" :loading="removing" @click="confirmDelete">
          {{ t('admin.members.deleteAccount') }}
        </LButton>
      </template>
    </LModal>
  </main>
</template>

<style scoped>
@import '../styles/admin.css';

.admin__tr {
  grid-template-columns: 1fr 5.5rem 6rem 7.5rem 7rem;
}
@media (max-width: 780px) {
  .admin__tr {
    grid-template-columns: 1fr auto auto auto;
  }
}
@media (max-width: 520px) {
  .admin__tr {
    grid-template-columns: 1fr auto;
  }
}

.confirm__name {
  color: var(--ink);
}
.admin__self {
  color: var(--ink-faint);
}
.admin__pagination {
  margin-top: var(--space-4);
}

.memform {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.memform__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
@media (max-width: 420px) {
  .memform__row {
    grid-template-columns: 1fr;
  }
}
</style>
