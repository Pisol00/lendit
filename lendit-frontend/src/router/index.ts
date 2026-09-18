import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuth } from '../composables/useAuth'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean

    member?: boolean

    admin?: boolean
  }
}

import LoginPage from '../pages/LoginPage.vue'
import BrowseBooks from '../pages/BrowseBooks.vue'
import Dashboard from '../pages/Dashboard.vue'
import BookDetail from '../pages/BookDetail.vue'
import BorrowingsPage from '../pages/BorrowingsPage.vue'
import ProfilePage from '../pages/ProfilePage.vue'

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: LoginPage, meta: { public: true } },
  {
    path: '/register',
    name: 'register',
    component: () => import('../pages/RegisterPage.vue'),
    meta: { public: true },
  },

  { path: '/browse', name: 'browse', component: BrowseBooks, meta: { member: true } },

  { path: '/books/:id', name: 'book', component: BookDetail, props: true, meta: { member: true } },
  { path: '/borrowings', name: 'borrowings', component: BorrowingsPage, meta: { member: true } },
  {
    path: '/my-books',
    name: 'my-books',
    component: () => import('../pages/MyBooks.vue'),
    meta: { member: true },
  },

  { path: '/profile', name: 'profile', component: ProfilePage },

  {
    path: '/accounts/:id',
    name: 'account',
    component: () => import('../pages/AccountProfile.vue'),
    props: true,
  },

  { path: '/dashboard', name: 'dashboard', component: Dashboard, meta: { admin: true } },

  {
    path: '/admin/accounts',
    name: 'admin-accounts',
    component: () => import('../pages/AdminAccounts.vue'),
    meta: { admin: true },
  },
  {
    path: '/admin/ratings',
    name: 'admin-ratings',
    component: () => import('../pages/AdminRatings.vue'),
    meta: { admin: true },
  },
  {
    path: '/admin/tags',
    name: 'admin-tags',
    component: () => import('../pages/AdminTags.vue'),
    meta: { admin: true },
  },

  { path: '/', name: 'home', redirect: () => useAuth().landingRoute() },
  { path: '/:pathMatch(.*)*', redirect: () => useAuth().landingRoute() },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const { isAuthenticated, isAdmin, landingRoute } = useAuth()

  if (!to.meta.public && !isAuthenticated.value) {
    return { name: 'login' }
  }
  if (to.meta.public && isAuthenticated.value) {
    return landingRoute()
  }

  if (to.meta.admin && !isAdmin.value) {
    return { name: 'browse' }
  }

  if (to.meta.member && isAdmin.value) {
    return { name: 'dashboard' }
  }
})

export default router
