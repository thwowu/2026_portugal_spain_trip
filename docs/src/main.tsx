import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SettingsProvider } from './state/settings.tsx'
import { createDefaultPlanningState, PlanningProvider } from './state/planning.tsx'

// Default to senior-friendly UI immediately (avoid first-paint flash).
document.documentElement.dataset.ui = 'senior'
document.documentElement.dataset.motion = 'low'
document.documentElement.dataset.font = '1'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <PlanningProvider initialState={createDefaultPlanningState()}>
        <App />
      </PlanningProvider>
    </SettingsProvider>
  </StrictMode>,
)
