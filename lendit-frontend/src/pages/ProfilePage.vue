<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Eye, EyeOff, Pencil, Check } from '@lucide/vue'
import LInput from '../components/ui/LInput.vue'
import LButton from '../components/ui/LButton.vue'
import LBadge from '../components/ui/LBadge.vue'
import { useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'
import { initials as toInitials } from '../utils/format'
import { errorMessage } from '../lib/query'
import { ApiError } from '../lib/http'

const { t } = useI18n()
const { user, isAdmin, updateMe } = useAuth()
const { success, error } = useToast()

const initials = computed(() => toInitials(user.value))
const roleLabel = computed(() => (isAdmin.value ? t('role.administrator') : t('role.member')))

const profile = reactive({
  firstName: user.value?.firstName || '',
  lastName: user.value?.lastName || '',
  email: user.value?.email || '',
})
const profileErrors = reactive({ firstName: '', lastName: '', email: '' })
const savingProfile = ref(false)

const editingProfile = ref(false)

function startEditProfile() {
  editingProfile.value = true
}

function cancelEditProfile() {
  profile.firstName = user.value?.firstName || ''
  profile.lastName = user.value?.lastName || ''
  profile.email = user.value?.email || ''
  profileErrors.firstName = ''
  profileErrors.lastName = ''
  profileErrors.email = ''
  editingProfile.value = false
}

const profileDirty = computed(
  () =>
    profile.firstName !== user.value?.firstName ||
    profile.lastName !== user.value?.lastName ||
    profile.email !== user.value?.email,
)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function saveProfile() {
  profileErrors.firstName = profile.firstName.trim() ? '' : t('validation.firstName')
  profileErrors.lastName = profile.lastName.trim() ? '' : t('validation.lastName')
  profileErrors.email = EMAIL_RE.test(profile.email.trim()) ? '' : t('profile.emailInvalid')
  if (profileErrors.firstName || profileErrors.lastName || profileErrors.email) return

  savingProfile.value = true
  try {
    await updateMe({
      firstName: profile.firstName.trim(),
      lastName: profile.lastName.trim(),
      email: profile.email.trim(),
    })
    success(t('profile.saved'))
    editingProfile.value = false
  } catch (err) {
    error(errorMessage(err, t('errors.save')))
  } finally {
    savingProfile.value = false
  }
}

const pw = reactive({ current: '', next: '', confirm: '' })
const pwErrors = reactive({ current: '', next: '', confirm: '' })
const savingPw = ref(false)

const pwShown = reactive({ current: false, next: false, confirm: false })

watch([() => pw.next, () => pw.confirm], () => {
  if (!pw.confirm) {
    pwErrors.confirm = ''
    return
  }
  pwErrors.confirm = pw.confirm === pw.next ? '' : t('profile.passwordMismatch')
})

const confirmMatches = computed(
  () => pw.confirm.length > 0 && pw.next.length > 0 && pw.confirm === pw.next,
)

async function savePassword() {
  pwErrors.current = pw.current ? '' : t('profile.currentRequired')
  pwErrors.next = pw.next.length >= 8 ? '' : t('profile.newPasswordLength')
  pwErrors.confirm = pw.confirm === pw.next ? '' : t('profile.passwordMismatch')
  if (pwErrors.current || pwErrors.next || pwErrors.confirm) return

  const current = user.value
  if (!current) return

  savingPw.value = true
  try {
    await updateMe({
      firstName: current.firstName,
      lastName: current.lastName,
      email: current.email,
      currentPassword: pw.current,
      newPassword: pw.next,
    })
    pw.current = ''
    pw.next = ''
    pw.confirm = ''
    success(t('profile.passwordChanged'))
  } catch (err) {
    const msg = errorMessage(err, t('profile.changeFailed'))
    if (err instanceof ApiError && err.status === 401) {
      pwErrors.current = t('profile.currentIncorrect')
    }
    error(msg)
  } finally {
    savingPw.value = false
  }
}
</script>

<template>
  <main class="prof">
    <header class="prof__head">
      <h1 class="prof__title">{{ t('profile.title') }}</h1>
      <p class="prof__sub">{{ t('profile.subtitle') }}</p>
    </header>

    <div class="prof__body">
      <aside v-if="user" class="prof__aside">
        <div class="prof__id">
          <span class="prof__avatar" aria-hidden="true">{{ initials }}</span>
          <p class="prof__name">{{ user.firstName }} {{ user.lastName }}</p>
          <LBadge :variant="isAdmin ? 'accent' : 'neutral'">{{ roleLabel }}</LBadge>
        </div>
      </aside>

      <div class="prof__panels">
        <section class="prof__card" :aria-labelledby="'prof-details'">
          <div class="prof__card-head">
            <div>
              <h2 id="prof-details" class="prof__card-title">{{ t('profile.detailsTitle') }}</h2>
              <p class="prof__card-desc">{{ t('profile.detailsDescription') }}</p>
            </div>
            <button
              v-if="!editingProfile"
              type="button"
              class="prof__edit"
              :title="t('common.edit')"
              :aria-label="t('common.edit')"
              @click="startEditProfile"
            >
              <Pencil :size="16" :stroke-width="2" aria-hidden="true" />
            </button>
          </div>

          <dl v-if="!editingProfile" class="prof__read">
            <div class="prof__row">
              <div class="prof__read-row">
                <dt>{{ t('profile.firstName') }}</dt>
                <dd>{{ user?.firstName }}</dd>
              </div>
              <div class="prof__read-row">
                <dt>{{ t('profile.lastName') }}</dt>
                <dd>{{ user?.lastName }}</dd>
              </div>
            </div>
            <div class="prof__read-row">
              <dt>{{ t('profile.email') }}</dt>
              <dd>{{ user?.email }}</dd>
            </div>
          </dl>

          <form v-else class="prof__form" novalidate @submit.prevent="saveProfile">
            <div class="prof__row">
              <LInput
                v-model="profile.firstName"
                :label="t('profile.firstName')"
                required
                :error="profileErrors.firstName"
              />
              <LInput
                v-model="profile.lastName"
                :label="t('profile.lastName')"
                required
                :error="profileErrors.lastName"
              />
            </div>
            <LInput
              v-model="profile.email"
              :label="t('profile.email')"
              type="email"
              autocomplete="email"
              required
              :error="profileErrors.email"
            />
            <div class="prof__actions">
              <LButton variant="ghost" type="button" @click="cancelEditProfile">
                {{ t('common.cancel') }}
              </LButton>
              <LButton type="submit" :loading="savingProfile" :disabled="!profileDirty">
                {{ savingProfile ? t('common.saving') : t('common.save') }}
              </LButton>
            </div>
          </form>
        </section>

        <section class="prof__card" :aria-labelledby="'prof-password'">
          <div class="prof__card-head">
            <h2 id="prof-password" class="prof__card-title">{{ t('profile.passwordTitle') }}</h2>
            <p class="prof__card-desc">{{ t('profile.passwordDescription') }}</p>
          </div>

          <form class="prof__form" novalidate @submit.prevent="savePassword">
            <LInput
              v-model="pw.current"
              :label="t('profile.currentPassword')"
              :type="pwShown.current ? 'text' : 'password'"
              autocomplete="current-password"
              required
              :error="pwErrors.current"
            >
              <template #suffix>
                <button
                  type="button"
                  class="prof__reveal"
                  :aria-label="
                    pwShown.current ? t('common.hidePassword') : t('common.showPassword')
                  "
                  @click="pwShown.current = !pwShown.current"
                >
                  <Eye v-if="pwShown.current" :size="18" aria-hidden="true" />
                  <EyeOff v-else :size="18" aria-hidden="true" />
                </button>
              </template>
            </LInput>
            <div class="prof__row">
              <LInput
                v-model="pw.next"
                :label="t('profile.newPassword')"
                :type="pwShown.next ? 'text' : 'password'"
                autocomplete="new-password"
                :placeholder="t('validation.passwordHint')"
                required
                :error="pwErrors.next"
              >
                <template #suffix>
                  <button
                    type="button"
                    class="prof__reveal"
                    :aria-label="pwShown.next ? t('common.hidePassword') : t('common.showPassword')"
                    @click="pwShown.next = !pwShown.next"
                  >
                    <Eye v-if="pwShown.next" :size="18" aria-hidden="true" />
                    <EyeOff v-else :size="18" aria-hidden="true" />
                  </button>
                </template>
              </LInput>
              <LInput
                v-model="pw.confirm"
                :label="t('profile.confirmPassword')"
                :type="pwShown.confirm ? 'text' : 'password'"
                autocomplete="new-password"
                required
                :error="pwErrors.confirm"
              >
                <template #suffix>
                  <Check
                    v-if="confirmMatches"
                    class="prof__match"
                    :size="17"
                    :stroke-width="2.5"
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    class="prof__reveal"
                    :aria-label="
                      pwShown.confirm ? t('common.hidePassword') : t('common.showPassword')
                    "
                    @click="pwShown.confirm = !pwShown.confirm"
                  >
                    <Eye v-if="pwShown.confirm" :size="18" aria-hidden="true" />
                    <EyeOff v-else :size="18" aria-hidden="true" />
                  </button>
                </template>
              </LInput>
            </div>
            <div class="prof__actions">
              <LButton type="submit" variant="secondary" :loading="savingPw">
                {{ savingPw ? t('profile.changing') : t('profile.changePassword') }}
              </LButton>
            </div>
          </form>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.prof {
  max-width: 58rem;
  margin: 0 auto;
  padding: var(--page-pad-y) var(--page-pad-x);
}
.prof__head {
  margin-bottom: var(--space-5);
}
.prof__title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-2xl);
  letter-spacing: var(--tracking-tight);
}
.prof__sub {
  margin: 0;
  color: var(--ink-soft);
}

.prof__body {
  display: grid;
  grid-template-columns: 14rem 1fr;
  gap: var(--space-5);
  align-items: start;
}

.prof__aside {
  position: sticky;
  top: var(--space-5);
}
.prof__id {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-2);
  padding: var(--space-5) var(--space-4);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.prof__id > :first-child {
  margin-bottom: var(--space-1);
}
.prof__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--avatar-lg);
  height: var(--avatar-lg);
  font-family: var(--font-ui);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--fg-inverse);
  background: var(--primary);
  border-radius: var(--radius-round);
}
.prof__name {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  line-height: var(--leading-snug);
  color: var(--ink);
  overflow-wrap: anywhere;
}

.prof__panels {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  min-width: 0;
}
.prof__card {
  padding: var(--space-5);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.prof__card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.prof__edit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  width: var(--control-icon-xs);
  height: var(--control-icon-xs);
  color: var(--ink-faint);
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: color var(--dur) var(--ease);
}
.prof__edit:hover {
  color: var(--accent);
}

.prof__read {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.prof__read-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}
.prof__read-row dt {
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.01em;
}
.prof__read-row dd {
  display: flex;
  align-items: center;
  min-height: var(--control-md);
  margin: 0;
  padding: 0 var(--space-4);
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--ink);
  background: var(--bg-subtle);
  border: 1px solid transparent;
  border-radius: var(--radius);
  overflow-wrap: anywhere;
}
.prof__card-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
}
.prof__card-desc {
  margin: var(--space-1) 0 0;
  font-size: var(--text-sm);
  color: var(--ink-soft);
}
.prof__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.prof__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
.prof__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding-top: var(--space-1);
}

.prof__match {
  color: var(--success);
  flex-shrink: 0;
}

.prof__reveal {
  display: inline-flex;
  padding: var(--space-1);
  color: var(--ink-faint);
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: color var(--dur) var(--ease);
}
.prof__reveal:hover {
  color: var(--ink);
}

@media (max-width: 860px) {
  .prof__body {
    grid-template-columns: 1fr;
  }
  .prof__aside {
    position: static;
  }

  .prof__id {
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    text-align: left;
    gap: var(--space-2) var(--space-4);
  }
}

@media (max-width: 480px) {
  .prof__row {
    grid-template-columns: 1fr;
  }
}
</style>
