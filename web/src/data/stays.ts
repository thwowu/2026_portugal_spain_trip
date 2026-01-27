import type { CityId } from './core'

export type StayOption = {
  name: string
  why: string[]
  risks: string[]
  links: Array<{ label: string; href: string }>
  statusHint?: 'primary' | 'secondary' | 'backup'
}

export type MarkdownTable = {
  headers: string[]
  rows: Array<{ label: string; values: string[] }>
}

export type StayScoringModel = {
  weights: Array<{ criterion: string; weight: number }>
  table: MarkdownTable
}

export type CityStay = {
  cityId: CityId
  title: string
  options: StayOption[]
  publicTransportHowToBuy: string[]
  moneySavingTips: string[]
  riskMatrix: MarkdownTable
  scoringModel: StayScoringModel
}

// Content data is generated from `src/content/data/stays.v1.json`.
export { STAYS_DATA } from '../generated/stays'

