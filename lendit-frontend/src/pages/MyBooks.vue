<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Book } from '@lucide/vue'
import LButton from '../components/ui/LButton.vue'
import LEmpty from '../components/ui/LEmpty.vue'
import LModal from '../components/ui/LModal.vue'
import LPagination from '../components/ui/LPagination.vue'
import LSkeleton from '../components/ui/LSkeleton.vue'
import { TriangleAlert } from '@lucide/vue'
import MyBookCard from '../components/MyBookCard.vue'
import BookFormModal from '../components/BookFormModal.vue'
import { useBooks, type BookPayload } from '../composables/useBooks'
import { useToast } from '../composables/useToast'
import { errorMessage } from '../lib/query'

import type { Book as BookModel } from '../types/api'

const { t } = useI18n()
const { books, pagination, loading, error, fetchBooks, createBook, updateBook, removeBook } =
  useBooks()
const { success, info, error: toastError } = useToast()

const page = ref(1)
const limit = 12

function load() {
  fetchBooks({
    owner: 'me',
    page: page.value,
    limit,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  }).catch(() => {})
}
onMounted(load)

const formOpen = ref(false)
const editing = ref<BookModel | null>(null)
const submitting = ref(false)
function openCreate() {
  editing.value = null
  formOpen.value = true
}
function openEdit(book: BookModel) {
  editing.value = book
  formOpen.value = true
}
async function onSubmit(data: BookPayload) {
  submitting.value = true
  try {
    if (editing.value) {
      await updateBook(editing.value._id, data)
      success(t('myBooks.saved'))
    } else {
      await createBook(data)
      success(t('myBooks.added'))
      page.value = 1
    }
    formOpen.value = false
    load()
  } catch (err) {
    toastError(errorMessage(err, t('errors.save')))
  } finally {
    submitting.value = false
  }
}

const confirmOpen = ref(false)
const pending = ref<BookModel | null>(null)
const removing = ref(false)
function askDelete(book: BookModel) {
  pending.value = book
  confirmOpen.value = true
}
async function confirmDelete() {
  const b = pending.value
  if (!b) return
  removing.value = true
  try {
    await removeBook(b._id)
    confirmOpen.value = false
    pending.value = null
    info(t('myBooks.deleted', { title: b.title }))

    if (books.value.length === 1 && page.value > 1) page.value -= 1
    load()
  } catch (err) {
    toastError(errorMessage(err, t('errors.delete')))
  } finally {
    removing.value = false
  }
}
</script>

<template>
  <main class="mybooks">
    <header class="mybooks__head">
      <div>
        <h1 class="mybooks__title">{{ t('myBooks.title') }}</h1>
        <p class="mybooks__sub">{{ t('myBooks.subtitle', { count: pagination.total }) }}</p>
        <p class="mybooks__count">
          {{ t('myBooks.count', pagination.total) }}
        </p>
      </div>
      <LButton @click="openCreate">
        <Plus :size="18" :stroke-width="2" aria-hidden="true" /> {{ t('myBooks.addBook') }}
      </LButton>
    </header>

    <LEmpty
      v-if="error"
      tone="error"
      :icon="TriangleAlert"
      :title="t('errors.loadMyBooks')"
      :hint="error"
    >
      <template #action>
        <LButton variant="secondary" @click="load">{{ t('common.tryAgain') }}</LButton>
      </template>
    </LEmpty>

    <div v-else-if="loading && !books.length" class="mybooks__grid" role="presentation">
      <div v-for="n in 8" :key="n" class="mb-skeleton">
        <LSkeleton variant="block" class="mb-skeleton__cover" />
        <div class="mb-skeleton__body">
          <LSkeleton width="85%" height="19px" />
          <LSkeleton width="55%" height="13px" />
          <LSkeleton width="40%" height="21px" class="mb-skeleton__author" />
          <LSkeleton width="45%" height="22px" class="mb-skeleton__meta" />

          <div class="mb-skeleton__actions">
            <LSkeleton width="100%" height="var(--control-icon-md)" radius="var(--radius)" />
            <LSkeleton
              width="var(--control-icon-md)"
              height="var(--control-icon-md)"
              radius="var(--radius)"
            />
          </div>
        </div>
      </div>
    </div>

    <template v-else-if="books.length">
      <div class="mybooks__grid">
        <MyBookCard
          v-for="book in books"
          :key="book._id"
          :book="book"
          @edit="openEdit"
          @delete="askDelete"
        />
      </div>

      <LPagination
        v-if="pagination.totalPages > 1"
        class="mybooks__pagination"
        :page="page"
        :total-pages="pagination.totalPages"
        @update:page="(p) => ((page = p), load())"
      />
    </template>

    <LEmpty v-else :icon="Book" :title="t('myBooks.emptyTitle')" :hint="t('myBooks.emptyHint')" />

    <BookFormModal
      v-model:open="formOpen"
      :book="editing"
      :submitting="submitting"
      @submit="onSubmit"
    />

    <LModal v-model:open="confirmOpen" :title="t('myBooks.deleteTitle')">
      <p v-if="pending">
        {{ t('myBooks.deleteConfirm', { title: pending.title }) }}
      </p>
      <template #footer="{ close }">
        <LButton variant="secondary" :disabled="removing" @click="close">
          {{ t('common.cancel') }}
        </LButton>
        <LButton variant="danger" :loading="removing" @click="confirmDelete">
          {{ t('myBooks.deleteTitle') }}
        </LButton>
      </template>
    </LModal>
  </main>
</template>

<style scoped>
.mybooks {
  max-width: var(--page-max);
  margin: 0 auto;
  padding: var(--page-pad-y) var(--page-pad-x);
}
.mybooks__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}
.mybooks__head :deep(.l-btn) {
  flex-shrink: 0;
}
.mybooks__title {
  margin: 0 0 var(--space-1);
  font-size: var(--text-2xl);
  letter-spacing: var(--tracking-tight);
}
.mybooks__sub {
  margin: 0;
  color: var(--ink-soft);
}
.mybooks__count {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  color: var(--ink-soft);
}

.mybooks__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: var(--space-5);
}

.mb-skeleton {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--surface);
}
.mb-skeleton__cover {
  aspect-ratio: 2 / 1;
  max-height: 7.5rem;
  border-radius: 0;
}
.mb-skeleton__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-4) var(--space-4);
}

.mb-skeleton__author {
  margin-top: 2px;
}
.mb-skeleton__meta {
  margin-top: var(--space-2);
}
.mb-skeleton__actions {
  display: flex;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-3);
}
.mb-skeleton__actions > :first-child {
  flex: 1;
}

.mybooks__pagination {
  margin-top: var(--space-5);
}

.mybooks__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-4);
  text-align: center;
  color: var(--ink-faint);
}
.mybooks__empty h3 {
  margin: var(--space-2) 0 0;
  color: var(--ink);
}
.mybooks__empty p {
  color: var(--ink-soft);
  margin: 0 0 var(--space-2);
}

.mb-confirm {
  color: var(--ink);
}

@media (max-width: 900px) {
  .mybooks__grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (min-width: 769px) {
  .mybooks__count {
    display: none;
  }
}
@media (max-width: 768px) {
  .mybooks__title,
  .mybooks__sub {
    display: none;
  }
}
@media (max-width: 540px) {
  .mybooks__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
