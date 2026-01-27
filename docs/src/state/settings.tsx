/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { loadJson, saveJson } from './storage'

export type MotionSetting = 'standard' | 'low'
export type UiMode = 'standard' | 'senior'

type SettingsState = {
  motion: MotionSetting
  uiMode: UiMode
  prefersReducedMotion: boolean
  setMotion: (next: MotionSetting) => void
  setUiMode: (next: UiMode) => void
}

const SettingsContext = createContext<SettingsState | null>(null)

const STORAGE_KEY = 'tripPlanner.settings.v1'

type PersistedSettings = {
  motion: MotionSetting
  uiMode?: UiMode
}

function defaultPersisted(): PersistedSettings {
  // Default for this project: senior-friendly (bigger, clearer, less motion).
  return { motion: 'low', uiMode: 'senior' }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const persisted = useMemo(
    () => loadJson<PersistedSettings>(STORAGE_KEY, defaultPersisted()),
    [],
  )
  const [uiMode, setUiMode] = useState<UiMode>(persisted.uiMode ?? 'senior')
  const [motion, setMotion] = useState<MotionSetting>(persisted.motion ?? 'low')
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    saveJson<PersistedSettings>(STORAGE_KEY, { motion, uiMode })
  }, [motion, uiMode])

  useEffect(() => {
    // Let CSS react to UI mode.
    document.documentElement.dataset.ui = uiMode
  }, [uiMode])

  useEffect(() => {
    const mql = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mql) return
    const onChange = () => setPrefersReducedMotion(!!mql.matches)
    onChange()
    mql.addEventListener?.('change', onChange)
    return () => {
      mql.removeEventListener?.('change', onChange)
    }
  }, [])

  const value = useMemo<SettingsState>(
    () => ({
      motion,
      uiMode,
      prefersReducedMotion,
      setMotion,
      setUiMode: (next) => {
        // In senior mode, default to low motion (but still allow manual override).
        // Do this in the setter (user action), not in an effect.
        setUiMode(next)
        if (next === 'senior') setMotion('low')
      },
    }),
    [motion, uiMode, prefersReducedMotion],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

export function useMotionEnabled(): boolean {
  const { motion, prefersReducedMotion } = useSettings()
  return motion === 'standard' && !prefersReducedMotion
}

