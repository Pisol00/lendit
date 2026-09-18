<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Eye, EyeOff } from '@lucide/vue'
import LButton from '../components/ui/LButton.vue'
import LInput from '../components/ui/LInput.vue'
import { useToast } from '../composables/useToast'
import { useAuth } from '../composables/useAuth'
import { errorMessage } from '../lib/query'

const emit = defineEmits<{ success: [] }>()
const { t } = useI18n()
const { success, error: toastError } = useToast()
const { login } = useAuth()

const REMEMBER_KEY = 'lendit:remembered-email'
const rememberedEmail = localStorage.getItem(REMEMBER_KEY) || ''

const form = reactive({ email: rememberedEmail, password: '' })
const rememberMe = ref(!!rememberedEmail)
const showPassword = ref(false)
const loading = ref(false)

const errors = reactive({ email: '', password: '' })

const ERROR_TOAST_MS = 6000

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

watch(
  () => form.email,
  (value) => {
    if (errors.email && EMAIL_RE.test(value.trim())) errors.email = ''
  },
)

async function onSubmit() {
  const email = form.email.trim()
  errors.email = !email
    ? t('login.emailRequired')
    : EMAIL_RE.test(email)
      ? ''
      : t('validation.emailInvalid')
  errors.password = form.password ? '' : t('login.passwordRequired')
  if (errors.email || errors.password) return

  loading.value = true
  try {
    await login({ email, password: form.password })

    if (rememberMe.value) localStorage.setItem(REMEMBER_KEY, email)
    else localStorage.removeItem(REMEMBER_KEY)
    success(t('login.success'))
    emit('success')
  } catch (err) {
    toastError(errorMessage(err, t('login.failed')), ERROR_TOAST_MS)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login min-h-svh max-h-svh overflow-y-auto">
    <div class="login__card">
      <header class="login__head">
        <h1 class="login__title">{{ t('login.title') }}</h1>
        <p class="login__sub">{{ t('login.subtitle') }}</p>
      </header>

      <form class="login__form" novalidate @submit.prevent="onSubmit">
        <LInput
          v-model="form.email"
          :label="t('login.email')"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
          :error="errors.email"
        />

        <LInput
          v-model="form.password"
          :label="t('login.password')"
          :type="showPassword ? 'text' : 'password'"
          :placeholder="t('login.passwordPlaceholder')"
          autocomplete="current-password"
          :error="errors.password"
        >
          <template #suffix>
            <button
              type="button"
              class="login__toggle"
              :aria-label="showPassword ? t('common.hidePassword') : t('common.showPassword')"
              @click="showPassword = !showPassword"
            >
              <Eye v-if="showPassword" :size="18" aria-hidden="true" />
              <EyeOff v-else :size="18" aria-hidden="true" />
            </button>
          </template>
        </LInput>

        <label class="login__remember">
          <input v-model="rememberMe" type="checkbox" class="login__checkbox" />
          <span>{{ t('login.rememberEmail') }}</span>
        </label>

        <LButton type="submit" size="lg" block :loading="loading">
          {{ t('login.submit') }}
        </LButton>
      </form>

      <p class="login__foot">
        {{ t('register.noAccount') }}
        <RouterLink class="login__link" :to="{ name: 'register' }">
          {{ t('register.signUp') }}
        </RouterLink>
      </p>
    </div>
  </main>
</template>

<style scoped>
.login {
  min-height: var(--screen-height);
  max-height: var(--screen-height);
  overflow-y: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
  background: var(--bg-subtle);
}

.login__card {
  width: 100%;
  max-width: 25rem;
  padding: var(--space-7) var(--space-6);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.login__head {
  margin-bottom: var(--space-6);
  text-align: center;
}
.login__title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-2xl);
}
.login__sub {
  color: var(--ink-soft);
  font-size: var(--text-sm);
  margin: 0;
}

.login__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.login__remember {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: calc(var(--space-2) * -1);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  color: var(--ink-soft);
  cursor: pointer;
  user-select: none;
}

.login__checkbox {
  width: 1rem;
  height: 1rem;
  accent-color: var(--accent);
  cursor: pointer;
}
.login__checkbox:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
  border-radius: var(--radius-sm);
}

.login__toggle {
  display: inline-flex;
  padding: var(--space-1);
  color: var(--ink-faint);
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: color var(--dur) var(--ease);
}
.login__toggle:hover {
  color: var(--ink);
}

.login__foot {
  margin: var(--space-5) 0 0;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--ink-soft);
}
.login__link {
  color: var(--accent);
  font-weight: 600;
}
</style>
