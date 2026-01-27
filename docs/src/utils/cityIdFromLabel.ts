import type { CityId } from '../data/core'

export function cityIdFromLabel(cityLabel: string): CityId {
  const s = (cityLabel ?? '').trim()
  if (s.includes('辛特拉') || s.toLowerCase().includes('sintra')) return 'sintra'
  if (s.includes('拉各斯') || s.toLowerCase().includes('lagos')) return 'lagos'
  if (s.includes('塞維爾') || s.toLowerCase().includes('seville')) return 'seville'
  if (s.includes('格拉納達') || s.toLowerCase().includes('granada')) return 'granada'
  if (s.includes('馬德里') || s.toLowerCase().includes('madrid')) return 'madrid'
  return 'lisbon'
}

