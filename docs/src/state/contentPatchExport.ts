import { z } from 'zod'
import { CONTENT_SCHEMA_VERSION } from '../generated'
import { CITIES, TRANSPORT_SEGMENTS } from '../data/core'
import type { PlanningState } from './planning'

export const CONTENT_PATCH_EXPORT_VERSION = 1 as const

export type ContentPatchTarget = {
  domain: 'attractions' | 'stays' | 'transport' | 'itinerary'
  id: string
  file: string // repo-relative (docs/src/...)
  anchors: string[] // stable-ish anchors for humans/LLM
}

export type ContentPatchExportV1 = {
  version: typeof CONTENT_PATCH_EXPORT_VERSION
  createdAt: string
  meta: {
    contentSchemaVersion: typeof CONTENT_SCHEMA_VERSION
    note: string
  }
  targets: ContentPatchTarget[]
  payload: { planning: PlanningState }
}

const ContentPatchExportV1Schema = z.object({
  version: z.literal(CONTENT_PATCH_EXPORT_VERSION),
  createdAt: z.string().min(1),
  meta: z.object({
    contentSchemaVersion: z.literal(CONTENT_SCHEMA_VERSION),
    note: z.string().min(1),
  }),
  targets: z.array(
    z.object({
      domain: z.enum(['attractions', 'stays', 'transport', 'itinerary']),
      id: z.string().min(1),
      file: z.string().min(1),
      anchors: z.array(z.string().min(1)),
    }),
  ),
  payload: z.object({
    // Keep this permissive; the app can evolve fields over time.
    planning: z.unknown(),
  }),
})

export function createContentPatchExportV1(planning: PlanningState): ContentPatchExportV1 {
  const targets: ContentPatchTarget[] = []

  // Attractions: per city file + section anchors.
  for (const cityId of Object.keys(CITIES)) {
    targets.push({
      domain: 'attractions',
      id: String(cityId),
      file: `src/content/attractions.${cityId}.md`,
      anchors: [
        '# <city title>',
        '## must',
        '## easy',
        '## rain',
        '## views',
        '## routes',
        '## skip',
        '## practical',
        '## food',
        '## photo',
        '## safety',
      ],
    })
  }

  // Stays: per city file.
  for (const cityId of Object.keys(CITIES)) {
    targets.push({
      domain: 'stays',
      id: String(cityId),
      file: `src/content/stays.${cityId}.md`,
      anchors: ['# <city stays title>', '## options', '## publicTransportHowToBuy', '## moneySavingTips'],
    })
  }

  // Transport: per segment file + per-mode anchors (mode is stable).
  for (const seg of TRANSPORT_SEGMENTS) {
    targets.push({
      domain: 'transport',
      id: seg.id,
      file: `src/content/transport.${seg.id}.md`,
      anchors: [
        '# <segment title>',
        '## tldr',
        '## options',
        '### train | ...',
        '### bus | ...',
        '## planB',
      ],
    })
  }

  // Itinerary: single file, day headings are stable by "day N".
  targets.push({
    domain: 'itinerary',
    id: 'itinerary',
    file: 'src/content/itinerary.md',
    anchors: ['# Itinerary', '## phase <id> | <label>', '### day N | date | city | title'],
  })

  return {
    version: CONTENT_PATCH_EXPORT_VERSION,
    createdAt: new Date().toISOString(),
    meta: {
      contentSchemaVersion: CONTENT_SCHEMA_VERSION,
      note:
        'This file is meant for AI-assisted updates. Use targets.file + anchors to apply changes into src/content/*.md, then run npm run content:build.',
    },
    targets,
    payload: { planning },
  }
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function defaultContentPatchExportFileName(createdAtIso: string) {
  const d = new Date(createdAtIso)
  const y = d.getFullYear()
  const m = pad2(d.getMonth() + 1)
  const day = pad2(d.getDate())
  const hh = pad2(d.getHours())
  const mm = pad2(d.getMinutes())
  return `tripPlanner-content-patch-v${CONTENT_PATCH_EXPORT_VERSION}-${y}${m}${day}-${hh}${mm}.json`
}

export function parseContentPatchExportV1(input: unknown): ContentPatchExportV1 | null {
  const r = ContentPatchExportV1Schema.safeParse(input)
  if (!r.success) return null
  return r.data as ContentPatchExportV1
}

