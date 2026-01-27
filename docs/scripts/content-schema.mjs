import { z } from 'zod'

export const CityIdSchema = z.enum([
  'lisbon',
  'lagos',
  'seville',
  'granada',
  'madrid',
  'sintra',
])

export const TransportSegmentIdSchema = z.enum([
  'lisbon-lagos',
  'lagos-seville',
  'seville-granada',
  'granada-madrid',
])

export const TransportModeSchema = z.enum(['train', 'bus'])

export const ItineraryTagSchema = z.enum(['travel_day', 'wow', 'easy', 'ticket', 'rain_ok'])

const OptionalTimeOfDaySchema = z.object({
  morning: z.string().min(1).optional(),
  noon: z.string().min(1).optional(),
  evening: z.string().min(1).optional(),
})

const ItineraryDetailsSchema = z
  .object({
    morning: z.string().min(1).optional(),
    noon: z.string().min(1).optional(),
    evening: z.string().min(1).optional(),
    notes: z.array(z.string().min(1)).optional(),
  })
  .passthrough()

export const ItineraryDaySchema = z.object({
  day: z.number().int().min(1),
  // Allow empty when itinerary headings omit the date segment.
  dateLabel: z.string(),
  cityLabel: z.string().min(1),
  title: z.string().min(1),
  tags: z.array(ItineraryTagSchema),
  summary: OptionalTimeOfDaySchema,
  details: ItineraryDetailsSchema,
})

export const ItineraryPhaseSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  days: z.array(ItineraryDaySchema).min(1),
})

export const ItineraryFileSchema = z.object({
  version: z.literal(1),
  phases: z.array(ItineraryPhaseSchema).min(1),
})

const RatingSchema = z
  .number()
  .int()
  .min(1)
  .max(5)

export const TransportOptionSchema = z.object({
  mode: TransportModeSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  steps: z.array(z.string().min(1)),
  bookingLinks: z.array(z.object({ label: z.string().min(1), href: z.string().url() })),
  luggageNotes: z.array(z.string().min(1)),
  riskNotes: z.array(z.string().min(1)),
  screenshots: z.array(z.object({ label: z.string().min(1), src: z.string().min(1) })),
})

export const TransportSegmentSchema = z.object({
  id: TransportSegmentIdSchema,
  label: z.string().min(1),
  tldr: z.object({
    recommended: TransportModeSchema,
    because: z.string().min(1),
    reminders: z.array(z.string().min(1)),
  }),
  options: z.array(TransportOptionSchema).min(1),
  planB: z.array(z.string().min(1)).optional(),
})

export const TransportFileSchema = z.object({
  version: z.literal(1),
  segments: z.array(TransportSegmentSchema).min(1),
})

export const StayOptionSchema = z.object({
  name: z.string().min(1),
  why: z.array(z.string().min(1)),
  risks: z.array(z.string().min(1)),
  links: z.array(z.object({ label: z.string().min(1), href: z.string().url() })),
  statusHint: z.enum(['primary', 'secondary', 'backup']).optional(),
})

export const MarkdownTableSchema = z.object({
  headers: z.array(z.string().min(1)).min(1),
  rows: z
    .array(
      z.object({
        label: z.string().min(1),
        values: z.array(z.string()),
      }),
    )
    .min(1),
})

export const ScoringWeightSchema = z.object({
  criterion: z.string().min(1),
  weight: z.number().min(0).max(1),
})

export const StayScoringModelSchema = z.object({
  weights: z.array(ScoringWeightSchema).min(1),
  table: MarkdownTableSchema,
})

export const CityStaySchema = z.object({
  cityId: CityIdSchema,
  title: z.string().min(1),
  options: z.array(StayOptionSchema).min(1),
  publicTransportHowToBuy: z.array(z.string().min(1)),
  moneySavingTips: z.array(z.string().min(1)),
  scoringModel: StayScoringModelSchema,
})

export const StaysFileSchema = z.object({
  version: z.literal(1),
  cities: z.array(CityStaySchema).min(1),
})

export const AttractionKindSchema = z.enum([
  'must',
  'easy',
  'rain',
  'views',
  'routes',
  'skip',
  'practical',
  'food',
  'photo',
  'safety',
])

export const AttractionsSectionSchema = z.object({
  kind: AttractionKindSchema,
  title: z.string().min(1),
  // Paragraph-first authoring: store the raw markdown block for the section.
  // (Can be empty if a section exists but is intentionally left blank.)
  content: z.string(),
})

export const CityAttractionsSchema = z.object({
  cityId: CityIdSchema,
  title: z.string().min(1),
  sections: z.array(AttractionsSectionSchema).min(1),
  extensions: z.array(z.string().min(1)).optional(),
})

export const AttractionsFileSchema = z.object({
  version: z.literal(1),
  cities: z.array(CityAttractionsSchema).min(1),
})

export const ExtensionsSectionSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
})

export const ExtensionTripSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sections: z.array(ExtensionsSectionSchema).min(1),
})

export const CityExtensionsSchema = z.object({
  cityId: CityIdSchema,
  title: z.string().min(1),
  trips: z.array(ExtensionTripSchema).min(1),
})

export const ExtensionsFileSchema = z.object({
  version: z.literal(1),
  cities: z.array(CityExtensionsSchema).min(1),
})

