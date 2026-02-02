/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo } from 'react'
import { CITIES, type CityId, type TransportSegmentId } from '../data/core'
import { usePersistedJsonState } from './persist'

export type DecisionStatus = 'candidate' | 'decided' | 'rejected'

export type AttractionDecision = {
  cityId: CityId
  mustSee: string[]
  optional: string[]
  skip: string[]
}

export type ChecklistCategory = 'tickets' | 'stays' | 'transport' | 'backup' | 'other'

export type TransportDecision = {
  segmentId: TransportSegmentId
  choice: 'train' | 'bus' | null
  reason: string
}

export type ChecklistItem = {
  id: string
  text: string
  category: ChecklistCategory
  done: boolean
  createdAt: string
}

export type ChangelogEntry = {
  id: string
  createdAt: string
  text: string
}

export type PlanningState = {
  attractionDecisions: Record<CityId, AttractionDecision>
  transportDecisions: Partial<Record<TransportSegmentId, TransportDecision>>
  checklist: ChecklistItem[]
  changelog: ChangelogEntry[]
}

export type PlanningActions = {
  setAttractions: (cityId: CityId, patch: Partial<AttractionDecision>) => void
  setTransportDecision: (segmentId: TransportSegmentId, patch: Partial<TransportDecision>) => void
  addChecklistItem: (text: string, category: ChecklistCategory) => void
  toggleChecklistItem: (id: string) => void
  deleteChecklistItem: (id: string) => void
  addChangelog: (text: string) => void
  deleteChangelog: (id: string) => void
  replaceState: (next: PlanningState) => void
}

type PlanningContextValue = {
  state: PlanningState
  actions: PlanningActions
}

const PlanningContext = createContext<PlanningContextValue | null>(null)

const STORAGE_KEY = 'tripPlanner.planning.v1'

function id() {
  return Math.random().toString(36).slice(2, 10)
}

export function PlanningProvider({
  children,
  initialState,
}: {
  children: React.ReactNode
  initialState: PlanningState
}) {
  const [state, setState] = usePersistedJsonState<PlanningState>(STORAGE_KEY, () => initialState)

  const actions = useMemo<PlanningActions>(
    () => ({
      setAttractions: (cityId, patch) => {
        setState((s) => ({
          ...s,
          attractionDecisions: {
            ...s.attractionDecisions,
            [cityId]: { ...s.attractionDecisions[cityId], ...patch },
          },
        }))
      },
      setTransportDecision: (segmentId, patch) => {
        setState((s) => {
          const cur = s.transportDecisions[segmentId] ?? { segmentId, choice: null, reason: '' }
          return {
            ...s,
            transportDecisions: {
              ...s.transportDecisions,
              [segmentId]: { ...cur, ...patch },
            },
          }
        })
      },
      addChecklistItem: (text, category) => {
        const item: ChecklistItem = {
          id: id(),
          text: text.trim(),
          category,
          done: false,
          createdAt: new Date().toISOString(),
        }
        setState((s) => ({ ...s, checklist: [item, ...s.checklist] }))
      },
      toggleChecklistItem: (itemId) => {
        setState((s) => ({
          ...s,
          checklist: s.checklist.map((c) =>
            c.id === itemId ? { ...c, done: !c.done } : c,
          ),
        }))
      },
      deleteChecklistItem: (itemId) => {
        setState((s) => ({ ...s, checklist: s.checklist.filter((c) => c.id !== itemId) }))
      },
      addChangelog: (text) => {
        const entry: ChangelogEntry = {
          id: id(),
          createdAt: new Date().toISOString(),
          text: text.trim(),
        }
        setState((s) => ({ ...s, changelog: [entry, ...s.changelog] }))
      },
      deleteChangelog: (entryId) => {
        setState((s) => ({ ...s, changelog: s.changelog.filter((e) => e.id !== entryId) }))
      },
      replaceState: (next) => {
        setState(next)
      },
    }),
    [setState],
  )

  const value = useMemo(() => ({ state, actions }), [state, actions])

  return <PlanningContext.Provider value={value}>{children}</PlanningContext.Provider>
}

export function usePlanning() {
  const ctx = useContext(PlanningContext)
  if (!ctx) throw new Error('usePlanning must be used within PlanningProvider')
  return ctx
}

export function createDefaultPlanningState(): PlanningState {
  return {
    attractionDecisions: (Object.keys(CITIES) as CityId[]).reduce(
      (acc, cityId) => {
        acc[cityId] = { cityId, mustSee: [], optional: [], skip: [] }
        return acc
      },
      {} as Record<CityId, { cityId: CityId; mustSee: string[]; optional: string[]; skip: string[] }>,
    ),
    transportDecisions: {},
    checklist: [],
    changelog: [],
  }
}

