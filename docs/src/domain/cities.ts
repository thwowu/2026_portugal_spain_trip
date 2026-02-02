import type { CityId } from '../data/core'
import type { ItineraryPhase } from '../data/itinerary'

function cityIdFromItineraryCityLabel(label: string): CityId | null {
  const s = (label ?? '').trim().toLowerCase()

  // Match both Chinese and English (content is authored bilingual-ish).
  if (s.includes('sintra') || s.includes('辛特拉')) return 'sintra'
  if (s.includes('lisbon') || s.includes('里斯本')) return 'lisbon'
  // Lagos is sometimes authored as 拉各斯; older content may use 拉狗.
  if (s.includes('lagos') || s.includes('拉格斯') || s.includes('拉各斯') || s.includes('拉狗')) return 'lagos'
  if (s.includes('seville') || s.includes('塞維爾')) return 'seville'
  if (s.includes('granada') || s.includes('格拉納達')) return 'granada'
  if (s.includes('madrid') || s.includes('馬德里')) return 'madrid'

  return null
}

export function computeItineraryCityOrder(args: {
  itineraryPhases: ItineraryPhase[]
  extraCityIds: CityId[]
  fallbackOrder: CityId[]
}): CityId[] {
  const { itineraryPhases, extraCityIds, fallbackOrder } = args

  const out: CityId[] = []
  const seen = new Set<CityId>()

  for (const phase of itineraryPhases) {
    for (const d of phase.days) {
      const id = cityIdFromItineraryCityLabel(d.cityLabel)
      if (!id || seen.has(id)) continue
      out.push(id)
      seen.add(id)
    }
  }

  // Ensure we include any relevant cities even if label matching fails.
  for (const id of extraCityIds) {
    if (seen.has(id)) continue
    out.push(id)
    seen.add(id)
  }

  // Final fallback (should never happen): keep the previous order stable.
  return out.length > 0 ? out : [...fallbackOrder]
}

export function computeDefaultAttractionsCityId(args: {
  itineraryCityOrder: CityId[]
  attractionsCityIds: CityId[]
}): CityId | null {
  const { itineraryCityOrder, attractionsCityIds } = args
  const attractionsSet = new Set(attractionsCityIds)

  for (const id of itineraryCityOrder) {
    if (attractionsSet.has(id)) return id
  }

  return attractionsCityIds[0] ?? null
}

