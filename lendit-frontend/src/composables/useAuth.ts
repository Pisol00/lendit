import { reactive, computed, readonly } from 'vue'
import { http, setTokenGetter } from '../lib/http'
import type { Account, AuthResponse } from '../types/api'

const TOKEN_KEY = 'lendit:token'
const USER_KEY = 'lendit:user'

function loadUser(): Account | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as Account) : null
  } catch {
    return null
  }
}
function loadToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) || null
}

interface AuthState {
  user: Account | null
  token: string | null
}

const state = reactive<AuthState>({
  user: loadUser(),
  token: loadToken(),
})

setTokenGetter(() => state.token)

function persist() {
  if (state.token) sessionStorage.setItem(TOKEN_KEY, state.token)
  else sessionStorage.removeItem(TOKEN_KEY)
  if (state.user) sessionStorage.setItem(USER_KEY, JSON.stringify(state.user))
  else sessionStorage.removeItem(USER_KEY)
}

function clearSession() {
  state.user = null
  state.token = null
  persist()
}

export function useAuth() {
  async function login({ email, password }: { email: string; password: string }) {
    const { token, account } = await http.post<AuthResponse>(
      '/auth/login',
      { email, password },
      { auth: false },
    )
    state.token = token
    state.user = account
    persist()
    return account
  }

  async function register({
    firstName,
    lastName,
    email,
    password,
  }: {
    firstName: string
    lastName: string
    email: string
    password: string
  }) {
    const { token, account } = await http.post<AuthResponse>(
      '/auth/register',
      { firstName, lastName, email, password },
      { auth: false },
    )
    state.token = token
    state.user = account
    persist()
    return account
  }

  async function logout() {
    try {
      if (state.token) await http.post('/auth/logout')
    } catch {
      void 0
    } finally {
      clearSession()
    }
  }

  async function updateMe({
    firstName,
    lastName,
    email,
    currentPassword,
    newPassword,
  }: {
    firstName: string
    lastName: string
    email: string
    currentPassword?: string
    newPassword?: string
  }) {
    const body: Record<string, string | undefined> = { firstName, lastName, email }
    if (newPassword) {
      body.currentPassword = currentPassword
      body.newPassword = newPassword
    }
    const account = await http.put<Account>('/accounts/me', body)
    state.user = account
    persist()
    return account
  }

  function landingRoute() {
    return state.user?.role === 'admin' ? { name: 'dashboard' } : { name: 'browse' }
  }

  return {
    user: readonly(computed(() => state.user)),
    token: readonly(computed(() => state.token)),
    isAuthenticated: computed(() => !!state.token),
    isAdmin: computed(() => state.user?.role === 'admin'),
    login,
    register,
    logout,
    updateMe,
    landingRoute,
  }
}
