/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { CityId, TransportMode, TransportSegmentId } from '../data/core'
import { loadJson, saveJson } from './storage'

export type DecisionStatus = 'candidate' | 'decided' | 'rejected'

export type TransportDecision = {
  segmentId: TransportSegmentId
  status: DecisionStatus
  chosenMode?: TransportMode
  reason: string
}

export type StayDecision = {
  cityId: CityId
  status: DecisionStatus
  chosenName?: string
  reason: string
}

export type AttractionDecision = {
  cityId: CityId
  mustSee: string[]
  optional: string[]
  skip: string[]
}

export type ChecklistCategory = 'tickets' | 'stays' | 'transport' | 'backup' | 'other'

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

export type TransportWeights = {
  simplicity: number
  luggage: number
  risk: number
  comfort: number
  cost: number
  flexibility: number
}

export type PlanningState = {
  transportDecisions: Record<TransportSegmentId, TransportDecision>
  stayDecisions: Record<CityId, StayDecision>
  attractionDecisions: Record<CityId, AttractionDecision>
  checklist: ChecklistItem[]
  changelog: ChangelogEntry[]
  transportWeights: TransportWeights
}

export type PlanningActions = {
  setTransportDecision: (segmentId: TransportSegmentId, patch: Partial<TransportDecision>) => void
  setStayDecision: (cityId: CityId, patch: Partial<StayDecision>) => void
  setAttractions: (cityId: CityId, patch: Partial<AttractionDecision>) => void
  addChecklistItem: (text: string, category: ChecklistCategory) => void
  toggleChecklistItem: (id: string) => void
  deleteChecklistItem: (id: string) => void
  addChangelog: (text: string) => void
  deleteChangelog: (id: string) => void
  setTransportWeights: (patch: Partial<TransportWeights>) => void
  replaceState: (next: PlanningState) => void
}

type PlanningContextValue = {
  state: PlanningState
  actions: PlanningActions
}

const PlanningContext = createContext<PlanningContextValue | null>(null)

const STORAGE_KEY = 'tripPlanner.planning.v1'

export function defaultTransportWeights(): TransportWeights {
  return {
    simplicity: 0.25,
    luggage: 0.2,
    risk: 0.2,
    comfort: 0.15,
    cost: 0.1,
    flexibility: 0.1,
  }
}

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
  const persisted = useMemo(
    () => loadJson<PlanningState | null>(STORAGE_KEY, null),
    [],
  )
  const [state, setState] = useState<PlanningState>(persisted ?? initialState)

  useEffect(() => {
    saveJson(STORAGE_KEY, state)
  }, [state])

  const actions = useMemo<PlanningActions>(
    () => ({
      setTransportDecision: (segmentId, patch) => {
        setState((s) => ({
          ...s,
          transportDecisions: {
            ...s.transportDecisions,
            [segmentId]: { ...s.transportDecisions[segmentId], ...patch },
          },
        }))
      },
      setStayDecision: (cityId, patch) => {
        setState((s) => ({
          ...s,
          stayDecisions: {
            ...s.stayDecisions,
            [cityId]: { ...s.stayDecisions[cityId], ...patch },
          },
        }))
      },
      setAttractions: (cityId, patch) => {
        setState((s) => ({
          ...s,
          attractionDecisions: {
            ...s.attractionDecisions,
            [cityId]: { ...s.attractionDecisions[cityId], ...patch },
          },
        }))
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
      setTransportWeights: (patch) => {
        setState((s) => ({ ...s, transportWeights: { ...s.transportWeights, ...patch } }))
      },
      replaceState: (next) => {
        setState(next)
      },
    }),
    [],
  )

  const value = useMemo(() => ({ state, actions }), [state, actions])

  return <PlanningContext.Provider value={value}>{children}</PlanningContext.Provider>
}

export function usePlanning() {
  const ctx = useContext(PlanningContext)
  if (!ctx) throw new Error('usePlanning must be used within PlanningProvider')
  return ctx
}

