import type { Component } from 'vue'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export interface SelectOption {
  value: string | number
  label: string
}

export interface NavItem {
  key: string
  label: string

  icon: Component
}
