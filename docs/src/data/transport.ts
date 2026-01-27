import type { TransportMode, TransportSegmentId } from './core'

export type TransportOption = {
  mode: TransportMode
  title: string
  summary: string
  steps: string[]
  bookingLinks: Array<{ label: string; href: string }>
  luggageNotes: string[]
  riskNotes: string[]
  screenshots: Array<{ label: string; src: string }>
}

export type TransportSegment = {
  id: TransportSegmentId
  label: string
  tldr: {
    recommended: TransportMode
    because: string
    reminders: string[]
  }
  options: TransportOption[]
  planB?: string[]
}

// Content data is generated from `src/content/transport.*.md`.
export { TRANSPORT_DATA } from '../generated/transport'

