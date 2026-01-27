import type { CityId } from '../data/core'

export type LatLng = { lat: number; lng: number }

/**
 * Approximate city centroids (for Leaflet / OSM).
 * These do not need to be perfect; they're used for a visual scrollytelling map.
 */
export const MAP_CITY_LATLNG: Record<CityId, LatLng> = {
  lisbon: { lat: 38.7223, lng: -9.1393 },
  sintra: { lat: 38.8029, lng: -9.3817 },
  lagos: { lat: 37.1028, lng: -8.6742 },
  seville: { lat: 37.3891, lng: -5.9845 },
  granada: { lat: 37.1773, lng: -3.5986 },
  madrid: { lat: 40.4168, lng: -3.7038 },
}

