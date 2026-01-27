import type { CityId } from './core'

export type AttractionsSection = {
  title: string
  items: string[]
}

export type CityAttractions = {
  cityId: CityId
  title: string
  sections: Array<
    | { kind: 'must' | 'easy' | 'rain' | 'views' | 'routes' | 'skip' | 'practical'; title: string; items: string[] }
    | { kind: 'food' | 'photo' | 'safety'; title: string; items: string[] }
  >
  extensions?: string[]
}

// Content data is generated from `src/content/data/attractions.v1.json`.
export { ATTRACTIONS_DATA } from '../generated/attractions'

