/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { CityId, TransportSegmentId } from '../data/core'
import { loadJson, saveJson } from './storage'

export type ProgressState = {
  transportSeen: Partial<Record<TransportSegmentId, boolean>>
  staysSeen: Partial<Record<CityId, boolean>>
  attractionsSeen: Partial<Record<CityId, boolean>>
  itinerarySeenDays: Partial<Record<number, boolean>>
}

type ProgressActions = {
  markTransportSeen: (id: TransportSegmentId) => void
  markStaySeen: (cityId: CityId) => void
  markAttractionsSeen: (cityId: CityId) => void
  markItineraryDaySeen: (day: number) => void
  clearAllSeen: () => void
}

type ProgressContextValue = { state: ProgressState; actions: ProgressActions }

const ProgressContext = createContext<ProgressContextValue | null>(null)
const STORAGE_KEY = 'tripPlanner.progress.v1'

function defaultState(): ProgressState {
  return { transportSeen: {}, staysSeen: {}, attractionsSeen: {}, itinerarySeenDays: {} }
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const persisted = useMemo(() => loadJson<ProgressState>(STORAGE_KEY, defaultState()), [])
  const [state, setState] = useState<ProgressState>(persisted)

  useEffect(() => {
    saveJson(STORAGE_KEY, state)
  }, [state])

  const actions = useMemo<ProgressActions>(
    () => ({
      markTransportSeen: (id) =>
        setState((s) => (s.transportSeen[id] ? s : { ...s, transportSeen: { ...s.transportSeen, [id]: true } })),
      markStaySeen: (cityId) =>
        setState((s) => (s.staysSeen[cityId] ? s : { ...s, staysSeen: { ...s.staysSeen, [cityId]: true } })),
      markAttractionsSeen: (cityId) =>
        setState((s) =>
          s.attractionsSeen[cityId] ? s : { ...s, attractionsSeen: { ...s.attractionsSeen, [cityId]: true } },
        ),
      markItineraryDaySeen: (day) =>
        setState((s) =>
          s.itinerarySeenDays[day] ? s : { ...s, itinerarySeenDays: { ...s.itinerarySeenDays, [day]: true } },
        ),
      clearAllSeen: () => setState(defaultState()),
    }),
    [],
  )

  const value = useMemo(() => ({ state, actions }), [state, actions])
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}

