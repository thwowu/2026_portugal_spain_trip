import { z } from 'zod'
import { PLANNING_EXPORT_VERSION } from '../generated'
import type { PlanningState } from './planning'

export type PlanningExportV1 = {
  version: typeof PLANNING_EXPORT_VERSION
  createdAt: string
  payload: { planning: PlanningState }
}

const PlanningExportV1Schema = z.object({
  version: z.literal(PLANNING_EXPORT_VERSION),
  createdAt: z.string().min(1),
  payload: z.object({
    // Keep this permissive; the app can evolve fields over time.
    planning: z.unknown(),
  }),
})

export function createPlanningExportV1(planning: PlanningState): PlanningExportV1 {
  return {
    version: PLANNING_EXPORT_VERSION,
    createdAt: new Date().toISOString(),
    payload: { planning },
  }
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function defaultPlanningExportFileName(createdAtIso: string) {
  const d = new Date(createdAtIso)
  const y = d.getFullYear()
  const m = pad2(d.getMonth() + 1)
  const day = pad2(d.getDate())
  const hh = pad2(d.getHours())
  const mm = pad2(d.getMinutes())
  return `tripPlanner-planning-v${PLANNING_EXPORT_VERSION}-${y}${m}${day}-${hh}${mm}.json`
}

export function downloadJsonFile(filename: string, value: unknown) {
  const json = JSON.stringify(value, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on a timer so the browser has time
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function parsePlanningExportV1(input: unknown): PlanningExportV1 | null {
  const r = PlanningExportV1Schema.safeParse(input)
  if (!r.success) return null
  return r.data as PlanningExportV1
}

export function mergePlanningState(base: PlanningState, incoming: unknown): PlanningState {
  if (!incoming || typeof incoming !== 'object') return base
  const p = incoming as Partial<PlanningState>

  return {
    ...base,
    attractionDecisions: { ...base.attractionDecisions, ...(p.attractionDecisions ?? {}) },
    transportDecisions: { ...base.transportDecisions, ...(p.transportDecisions ?? {}) },
    checklist: Array.isArray(p.checklist) ? (p.checklist as PlanningState['checklist']) : base.checklist,
    changelog: Array.isArray(p.changelog) ? (p.changelog as PlanningState['changelog']) : base.changelog,
  }
}

