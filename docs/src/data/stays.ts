import type { CityId } from './core'

export type StayOption = {
  name: string
  why: string[]
  risks: string[]
  links: Array<{ label: string; href: string }>
  statusHint?: 'primary' | 'secondary' | 'backup'
}

export type CityStay = {
  cityId: CityId
  title: string
  options: StayOption[]
  publicTransportHowToBuy: string
  moneySavingTips: string
}

// Content data is generated from `src/content/data/stays.v1.json`.
export { STAYS_DATA } from '../generated/stays'

