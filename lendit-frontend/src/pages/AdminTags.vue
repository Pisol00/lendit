<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Trash2, Hash, TriangleAlert, Search } from '@lucide/vue'
import LInput from '../components/ui/LInput.vue'
import LButton from '../components/ui/LButton.vue'
import LModal from '../components/ui/LModal.vue'
import LEmpty from '../components/ui/LEmpty.vue'
import LSkeleton from '../components/ui/LSkeleton.vue'
import { useToast } from '../composables/useToast'
import { useTags } from '../composables/useTags'
import { errorMessage } from '../lib/query'

const { t } = useI18n()
const { success, info, error: toastError } = useToast()
const { tags, tagDetails, fetchTags, createTag, deleteTag } = useTags()

const loading = ref(false)
onMounted(load)

const loadError = ref('')
async function load() {
  loading.value = true
  loadError.value = ''
  try {
    await fetchTags()
  } catch (err) {
    loadError.value = errorMessage(err, t('errors.loadTags'))
    toastError(loadError.value)
  } finally {
    loading.value = false
  }
}

const newTag = ref('')
const tagError = ref('')
const adding = ref(false)
const addOpen = ref(false)

const search = ref('')

const sortedTags = computed(() =>
  [...tagDetails.value].sort((a, b) => a.name.localeCompare(b.name)),
)
const visibleTags = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return sortedTags.value
  return sortedTags.value.filter((row) => row.name.includes(q))
})

function openAdd() {
  newTag.value = ''
  tagError.value = ''
  addOpen.value = true
}

async function addTag() {
  const name = newTag.value.trim().toLowerCase()
  tagError.value = ''
  if (!name) return

  if (!/^[a-z0-9]{3,20}$/.test(name)) {
    tagError.value = t('admin.tags.invalid')
    return
  }
  if (tags.value.includes(name)) {
    tagError.value = t('admin.tags.duplicate')
    return
  }
  adding.value = true
  try {
    await createTag(name)
    newTag.value = ''
    addOpen.value = false
    await fetchTags()
    success(t('admin.tags.added', { name }))
  } catch (err) {
    tagError.value = errorMessage(err, t('admin.tags.addFailed'))
  } finally {
    adding.value = false
  }
}

const confirmOpen = ref(false)
const pendingTag = ref<string | null>(null)
const removing = ref(false)
function askRemove(name: string) {
  pendingTag.value = name
  confirmOpen.value = true
}
async function confirmRemove() {
  const name = pendingTag.value
  if (!name) return
  removing.value = true
  try {
    await deleteTag(name)
    await fetchTags()
    confirmOpen.value = false
    pendingTag.value = null
    info(t('admin.tags.deleted', { name }))
  } catch (err) {
    toastError(errorMessage(err, t('admin.tags.deleteFailed')))
  } finally {
    removing.value = false
  }
}
</script>

<template>
  <main class="admin">
    <header class="admin__head">
      <div>
        <h1 class="admin__title">{{ t('admin.tags.title') }}</h1>
        <p class="admin__sub">{{ t('admin.tags.subtitle', { count: tags.length }) }}</p>
      </div>
    </header>

    <div class="admin__controls">
      <div class="admin__search">
        <LInput
          v-model="search"
          type="search"
          :placeholder="t('admin.tags.searchPlaceholder')"
          :aria-label="t('admin.tags.searchLabel')"
        >
          <template #prefix><Search :size="18" :stroke-width="2" aria-hidden="true" /></template>
        </LInput>
      </div>
      <LButton @click="openAdd">
        <Plus :size="18" :stroke-width="2" aria-hidden="true" /> {{ t('admin.tags.addTag') }}
      </LButton>
    </div>

    <LEmpty
      v-if="loadError"
      tone="error"
      :icon="TriangleAlert"
      :title="t('errors.loadTags')"
      :hint="loadError"
    >
      <template #action>
        <LButton variant="secondary" @click="load()">{{ t('common.tryAgain') }}</LButton>
      </template>
    </LEmpty>

    <ul v-else-if="loading" class="taglist" role="presentation">
      <li v-for="n in 6" :key="n" class="taglist__row taglist__row--skeleton">
        <LSkeleton width="9rem" />
        <LSkeleton width="4rem" />

        <LSkeleton width="1.875rem" height="1.875rem" radius="var(--radius)" />
      </li>
    </ul>
    <ul v-else-if="visibleTags.length" class="taglist">
      <li v-for="row in visibleTags" :key="row.name" class="taglist__row">
        <span class="taglist__name">
          <Hash :size="15" :stroke-width="2.5" class="taglist__hash" aria-hidden="true" />
          {{ row.name }}
        </span>

        <span class="taglist__count">
          {{ t('admin.tags.bookCount', row.bookCount) }}
        </span>

        <button
          type="button"
          class="taglist__del"
          :aria-label="t('admin.tags.deleteTagNamed', { name: row.name })"
          :title="t('admin.tags.deleteTag')"
          @click="askRemove(row.name)"
        >
          <Trash2 :size="16" :stroke-width="2" aria-hidden="true" />
        </button>
      </li>
    </ul>
    <LEmpty
      v-else-if="search.trim()"
      :icon="Search"
      :title="t('admin.tags.noMatch')"
      :hint="t('admin.tags.noMatchHint')"
    />
    <LEmpty v-else :icon="Hash" :title="t('admin.tags.empty')" :hint="t('admin.tags.emptyHint')" />

    <LModal v-model:open="addOpen" :title="t('admin.tags.addTitle')">
      <form id="add-tag-form" novalidate @submit.prevent="addTag">
        <LInput
          v-model="newTag"
          :label="t('admin.tags.newLabel')"
          :placeholder="t('admin.tags.newPlaceholder')"
          :hint="t('admin.tags.rule')"
          :error="tagError"
        >
          <template #prefix><Hash :size="16" :stroke-width="2" aria-hidden="true" /></template>
        </LInput>
      </form>
      <template #footer="{ close }">
        <LButton variant="secondary" :disabled="adding" @click="close">
          {{ t('common.cancel') }}
        </LButton>
        <LButton type="submit" form="add-tag-form" :loading="adding">
          {{ t('admin.tags.addTag') }}
        </LButton>
      </template>
    </LModal>

    <LModal v-model:open="confirmOpen" :title="t('admin.tags.deleteTitle')">
      <p>
        {{ t('admin.tags.deleteConfirm') }}
        <strong class="confirm__name">{{ pendingTag }}</strong>
      </p>
      <p class="confirm__warn">
        <TriangleAlert :size="16" :stroke-width="2" aria-hidden="true" />
        {{ t('admin.tags.deleteWarn') }}
      </p>
      <template #footer="{ close }">
        <LButton variant="secondary" :disabled="removing" @click="close">
          {{ t('common.cancel') }}
        </LButton>
        <LButton variant="danger" :loading="removing" @click="confirmRemove">
          {{ t('admin.tags.deleteTag') }}
        </LButton>
      </template>
    </LModal>
  </main>
</template>

<style scoped>
@import '../styles/admin.css';

.taglist {
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.taglist__row--skeleton {
  pointer-events: none;
}
.taglist__row--skeleton .l-skeleton {
  height: 0.875rem;
}
.taglist__row {
  display: grid;

  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
  transition: background var(--dur) var(--ease);
}
.taglist__row:last-child {
  border-bottom: none;
}
.taglist__row:hover {
  background: var(--bg-subtle);
}

.taglist__name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-ui);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--ink);
}
.taglist__hash {
  color: var(--accent);
}

.taglist__count {
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.taglist__del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--control-icon-xs);
  height: var(--control-icon-xs);
  color: var(--ink-faint);
  background: none;
  border: 1px solid var(--border-transparent);
  border-radius: var(--radius);
  cursor: pointer;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease),
    border-color var(--dur) var(--ease);
}
.taglist__del:hover {
  background: var(--danger-tint);
  color: var(--danger);
  border-color: var(--danger);
}

.confirm__name {
  color: var(--ink);
}
.confirm__warn {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  margin: var(--space-3) 0 0;
  padding: var(--space-3);
  font-size: var(--text-sm);
  color: var(--danger);
  background: var(--danger-tint);
  border-radius: var(--radius);
}
.confirm__warn svg {
  flex-shrink: 0;
  margin-top: 1px;
}
</style>
