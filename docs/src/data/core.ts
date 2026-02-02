export type CityId = 'lisbon' | 'lagos' | 'seville' | 'granada' | 'madrid' | 'sintra'

export const CITIES: Record<CityId, { label: string }> = {
  lisbon: { label: '里斯本 Lisbon' },
  sintra: { label: '辛特拉 Sintra' },
  lagos: { label: '拉狗 Lagos' },
  seville: { label: '塞維爾 Seville' },
  granada: { label: '格拉納達 Granada' },
  madrid: { label: '馬德里 Madrid' },
}

// Order cities in the same sequence as the itinerary.
// Note: Sintra is a day trip (no separate stays page), so it's intentionally omitted.
export const STAYS_CITY_ORDER: Array<Exclude<CityId, 'sintra'>> = [
  'lisbon',
  'lagos',
  'seville',
  'granada',
  'madrid',
]

export type TransportSegmentId =
  | 'lisbon-lagos'
  | 'lagos-seville'
  | 'seville-granada'
  | 'granada-madrid'

export type TransportMode = 'train' | 'bus'

export const TRANSPORT_SEGMENTS: Array<{
  id: TransportSegmentId
  from: CityId
  to: CityId
  label: string
}> = [
  { id: 'lisbon-lagos', from: 'lisbon', to: 'lagos', label: '里斯本 → 拉格斯' },
  { id: 'lagos-seville', from: 'lagos', to: 'seville', label: '拉格斯 → 塞維爾' },
  { id: 'seville-granada', from: 'seville', to: 'granada', label: '塞維爾 → 格拉納達' },
  { id: 'granada-madrid', from: 'granada', to: 'madrid', label: '格拉納達 → 馬德里' },
]

