import i18n from '../i18n/index'

const t = (key: string, named?: Record<string, unknown>) =>
  named ? i18n.global.t(key, named) : i18n.global.t(key)

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: '2-digit',
})

const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

export interface PersonLike {
  firstName?: string
  lastName?: string
}

export interface OverdueLike {
  status?: string
  dueDate?: string | Date
}

type DateInput = string | number | Date | null | undefined

export function formatDate(d: DateInput): string {
  return d ? dateFmt.format(new Date(d)) : '—'
}

export function formatDateTime(d: DateInput): string {
  return d ? dateTimeFmt.format(new Date(d)) : '—'
}

export function fullName(person: PersonLike | null | undefined, fallback?: string): string {
  const fb = fallback ?? t('common.notSpecified')
  if (!person) return fb
  return [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || fb
}

export function initials(person: PersonLike | null | undefined): string {
  if (!person) return '?'
  return ((person.firstName?.[0] || '') + (person.lastName?.[0] || '')).trim() || '?'
}

export function isOverdue(borrowing: OverdueLike | null | undefined): boolean {
  if (borrowing?.status !== 'borrowing' || !borrowing?.dueDate) return false
  return new Date(borrowing.dueDate) < new Date()
}

export function overdueDuration(borrowing: OverdueLike | null | undefined): string {
  if (!isOverdue(borrowing) || !borrowing?.dueDate) return ''

  const diffMinutes = Math.max(
    1,
    Math.floor((Date.now() - new Date(borrowing.dueDate).getTime()) / 60000),
  )
  if (diffMinutes < 60) return t('format.overdueMinutes', { n: diffMinutes })

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return t('format.overdueHours', { n: diffHours })

  return t('format.overdueDays', { n: Math.floor(diffHours / 24) })
}
