export type ItineraryTag = 'travel_day' | 'wow' | 'easy' | 'ticket' | 'rain_ok'

export type ItineraryDay = {
  day: number
  dateLabel: string
  cityLabel: string
  title: string
  tags: ItineraryTag[]
  summary: {
    morning?: string
    noon?: string
    evening?: string
  }
  details: {
    morning?: string
    noon?: string
    evening?: string
    notes?: string[]
  }
}

export type ItineraryPhase = {
  id: string
  label: string
  days: ItineraryDay[]
}

// Content data is generated from `src/content/data/itinerary.v1.json`.
export { ITINERARY_PHASES } from '../generated/itinerary'

