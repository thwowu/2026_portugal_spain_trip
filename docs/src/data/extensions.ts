import type { CityId } from './core'

export type ExtensionsSection = {
  key: string
  title: string
  items: string[]
}

export type ExtensionTrip = {
  id: string
  title: string
  sections: ExtensionsSection[]
}

export type CityExtensions = {
  cityId: CityId
  title: string
  trips: ExtensionTrip[]
}

// Content data is generated from `src/content/extensions.*.md`.
export { EXTENSIONS_DATA } from '../generated/extensions'

