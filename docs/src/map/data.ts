import type { CityId, TransportSegmentId } from '../data/core'

export type Point = { x: number; y: number }

// Coordinates are in the pixel space of `public/map/map.png` (same dimensions as `public/map/map.jpg`).
// They are starter values (good enough for first pass); we can fine-tune later.
export const MAP_CITIES: Record<CityId, { label: string; pt: Point }> = {
  lisbon: { label: 'Lisbon', pt: { x: 120, y: 310 } },
  sintra: { label: 'Sintra', pt: { x: 128, y: 286 } }, // near Lisbon
  lagos: { label: 'Lagos', pt: { x: 165, y: 650 } },
  seville: { label: 'Seville', pt: { x: 520, y: 585 } },
  granada: { label: 'Granada', pt: { x: 860, y: 640 } },
  madrid: { label: 'Madrid', pt: { x: 870, y: 120 } },
}

export type RouteDef = {
  id: TransportSegmentId
  from: CityId
  to: CityId
  // optional control point for a gentle curve
  c?: Point
}

export const MAP_ROUTES: RouteDef[] = [
  { id: 'lisbon-lagos', from: 'lisbon', to: 'lagos', c: { x: 70, y: 520 } },
  { id: 'lagos-seville', from: 'lagos', to: 'seville', c: { x: 310, y: 700 } },
  { id: 'seville-granada', from: 'seville', to: 'granada', c: { x: 720, y: 560 } },
  { id: 'granada-madrid', from: 'granada', to: 'madrid', c: { x: 980, y: 360 } },
]

export function pathD(from: Point, to: Point, c?: Point): string {
  if (!c) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`
  return `M ${from.x} ${from.y} Q ${c.x} ${c.y} ${to.x} ${to.y}`
}

