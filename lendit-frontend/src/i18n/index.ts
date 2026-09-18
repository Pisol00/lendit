import { createI18n } from 'vue-i18n'
import en from '../locales/en.json'

export const DEFAULT_LOCALE = 'en'
export const FALLBACK_LOCALE = 'en'

export type MessageSchema = typeof en

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: DEFAULT_LOCALE,
  fallbackLocale: FALLBACK_LOCALE,
  messages: { en },
})

export default i18n
