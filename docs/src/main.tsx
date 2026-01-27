import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SettingsProvider } from './state/settings.tsx'
import { PlanningProvider } from './state/planning.tsx'
import { ProgressProvider } from './state/progress.tsx'
import { CITIES, type CityId } from './data/core.ts'

// Default to senior-friendly UI immediately (avoid first-paint flash).
document.documentElement.dataset.ui = 'senior'
document.documentElement.dataset.motion = 'low'
document.documentElement.dataset.font = '1'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <PlanningProvider
        initialState={{
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
        }}
      >
        <ProgressProvider>
          <App />
        </ProgressProvider>
      </PlanningProvider>
    </SettingsProvider>
  </StrictMode>,
)
