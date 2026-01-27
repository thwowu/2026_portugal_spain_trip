import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SettingsProvider } from './state/settings.tsx'
import { PlanningProvider, defaultTransportWeights } from './state/planning.tsx'
import { CITIES, TRANSPORT_SEGMENTS, type CityId, type TransportSegmentId } from './data/core.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <PlanningProvider
        initialState={{
          transportDecisions: TRANSPORT_SEGMENTS.reduce(
            (acc, s) => {
              acc[s.id] = { segmentId: s.id, status: 'candidate', reason: '' }
              return acc
            },
            {} as Record<TransportSegmentId, { segmentId: TransportSegmentId; status: 'candidate'; reason: string }>,
          ),
          stayDecisions: (Object.keys(CITIES) as CityId[]).reduce(
            (acc, cityId) => {
              acc[cityId] = { cityId, status: 'candidate', reason: '' }
              return acc
            },
            {} as Record<CityId, { cityId: CityId; status: 'candidate'; reason: string }>,
          ),
          attractionDecisions: (Object.keys(CITIES) as CityId[]).reduce(
            (acc, cityId) => {
              acc[cityId] = { cityId, mustSee: [], optional: [], skip: [] }
              return acc
            },
            {} as Record<
              CityId,
              { cityId: CityId; mustSee: string[]; optional: string[]; skip: string[] }
            >,
          ),
          checklist: [],
          changelog: [],
          transportWeights: defaultTransportWeights(),
        }}
      >
        <App />
      </PlanningProvider>
    </SettingsProvider>
  </StrictMode>,
)
