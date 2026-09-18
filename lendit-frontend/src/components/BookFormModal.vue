<script setup lang="ts">
import { reactive, ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import LModal from './ui/LModal.vue'
import LInput from './ui/LInput.vue'
import LButton from './ui/LButton.vue'
import LMultiSelect from './ui/LMultiSelect.vue'
import { useTags } from '../composables/useTags'
import type { Book } from '../types/api'
import type { BookPayload } from '../composables/useBooks'

const props = withDefaults(
  defineProps<{
    open?: boolean

    book?: Book | null
    submitting?: boolean
  }>(),
  { open: false, book: null, submitting: false },
)
const emit = defineEmits<{
  'update:open': [open: boolean]
  submit: [payload: BookPayload]
}>()

const { t } = useI18n()

const { tags: tagOptions, fetchTags } = useTags()
onMounted(() => fetchTags().catch(() => {}))

type FieldName = 'title' | 'author' | 'publisher' | 'isbn'

interface FormState {
  title: string
  author: string
  publisher: string
  edition: string
  isbn: string
  cover: string
  quantity: string
  tags: string[]
}

const isEdit = ref(false)
const form = reactive<FormState>({
  title: '',
  author: '',
  publisher: '',
  edition: '',
  isbn: '',
  cover: '',
  quantity: '',
  tags: [],
})
type ErrorState = Record<FieldName | 'edition' | 'quantity', string>
const errors = reactive<ErrorState>({
  title: '',
  author: '',
  publisher: '',
  isbn: '',
  edition: '',
  quantity: '',
})

function reset(book: Book | null) {
  isEdit.value = !!book
  form.title = book?.title || ''
  form.author = book?.author || ''
  form.publisher = book?.publisher || ''
  form.edition = book?.edition != null ? String(book.edition) : ''
  form.isbn = book?.isbn || ''
  form.cover = book?.cover || ''
  form.quantity = book?.quantity != null ? String(book.quantity) : '1'
  form.tags = [...(book?.tags || [])]
  ;(Object.keys(errors) as (keyof ErrorState)[]).forEach((k) => (errors[k] = ''))
}

watch(
  () => props.open,
  (open) => {
    if (open) reset(props.book)
  },
)

const MIN_TEXT_LENGTH = 3

function checkText(value: string, field: FieldName) {
  const trimmed = value.trim()
  if (!trimmed) return t(`bookForm.${field}Required`)
  if (trimmed.length < MIN_TEXT_LENGTH) return t(`bookForm.${field}TooShort`)
  return ''
}

function validate() {
  errors.title = checkText(form.title, 'title')
  errors.author = checkText(form.author, 'author')
  errors.publisher = checkText(form.publisher, 'publisher')
  errors.isbn = checkText(form.isbn, 'isbn')

  const edition = Number(form.edition)
  errors.edition = Number.isInteger(edition) && edition >= 1 ? '' : t('bookForm.editionInvalid')
  const quantity = Number(form.quantity)
  errors.quantity = Number.isInteger(quantity) && quantity >= 1 ? '' : t('bookForm.quantityInvalid')
  return !Object.values(errors).some(Boolean)
}

function onSubmit() {
  if (!validate()) return
  emit('submit', {
    title: form.title.trim(),
    author: form.author.trim(),
    publisher: form.publisher.trim(),
    edition: Number(form.edition),
    isbn: form.isbn.trim(),
    cover: form.cover.trim(),
    quantity: Number(form.quantity),
    tags: form.tags,
  })
}
</script>

<template>
  <LModal
    :open="open"
    size="md"
    :title="isEdit ? t('bookForm.editTitle') : t('bookForm.addTitle')"
    @update:open="emit('update:open', $event)"
  >
    <form id="book-form" class="bookform" novalidate @submit.prevent="onSubmit">
      <fieldset class="bookform__group">
        <legend class="bookform__legend">{{ t('bookForm.sectionBook') }}</legend>
        <LInput v-model="form.title" :label="t('bookForm.title')" required :error="errors.title" />
        <LInput
          v-model="form.author"
          :label="t('bookForm.author')"
          required
          :error="errors.author"
        />
        <LInput
          v-model="form.publisher"
          :label="t('bookForm.publisher')"
          required
          :error="errors.publisher"
        />
      </fieldset>

      <fieldset class="bookform__group">
        <legend class="bookform__legend">{{ t('bookForm.sectionEdition') }}</legend>
        <div class="bookform__row">
          <LInput v-model="form.isbn" :label="t('bookForm.isbn')" required :error="errors.isbn" />
          <LInput
            v-model="form.edition"
            :label="t('bookForm.edition')"
            type="number"
            min="1"
            :placeholder="t('bookForm.editionPlaceholder')"
            required
            :error="errors.edition"
          />
          <LInput
            v-model="form.quantity"
            :label="t('bookForm.quantity')"
            type="number"
            min="1"
            required
            :error="errors.quantity"
          />
        </div>
      </fieldset>

      <fieldset class="bookform__group">
        <legend class="bookform__legend">{{ t('bookForm.sectionExtras') }}</legend>
        <LInput
          v-model="form.cover"
          :label="t('bookForm.coverLabel')"
          :optional-text="t('bookForm.optional')"
          placeholder="https://…"
          :hint="t('bookForm.coverHint')"
        />
        <div class="bookform__field">
          <span class="bookform__label">{{ t('bookForm.tags') }}</span>
          <LMultiSelect
            v-model="form.tags"
            :options="tagOptions"
            :placeholder="t('bookForm.selectTags')"
            :label="t('bookForm.tags')"
          />
        </div>
      </fieldset>
    </form>

    <template #footer="{ close }">
      <LButton variant="secondary" :disabled="submitting" @click="close">
        {{ t('common.cancel') }}
      </LButton>
      <LButton type="submit" form="book-form" :loading="submitting">
        {{ submitting ? t('common.saving') : isEdit ? t('common.save') : t('bookForm.addBook') }}
      </LButton>
    </template>
  </LModal>
</template>

<style scoped>
.bookform {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.bookform :deep(.l-field) {
  gap: 5px;
}

.bookform__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}
.bookform__group + .bookform__group {
  padding-top: var(--space-1);
}
.bookform__legend {
  padding: 0;
  margin-bottom: var(--space-1);
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.bookform__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 6rem 6rem;
  gap: var(--space-3);
}

.bookform__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.bookform__label {
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ink);
}

@media (max-width: 480px) {
  .bookform__row {
    grid-template-columns: 1fr 1fr;
  }

  .bookform__row > :first-child {
    grid-column: 1 / -1;
  }
}
</style>
