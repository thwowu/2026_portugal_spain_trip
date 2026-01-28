/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { loadJson, saveJson } from './storage'

export type MotionSetting = 'standard' | 'low'
export type UiMode = 'standard' | 'senior'
export type FontScale = 0 | 1 | 2

type SettingsState = {
  motion: MotionSetting
  uiMode: UiMode
  fontScale: FontScale
  prefersReducedMotion: boolean
  setMotion: (next: MotionSetting) => void
  setUiMode: (next: UiMode) => void
  setFontScale: (next: FontScale) => void
  resetRecommended: () => void
}

const SettingsContext = createContext<SettingsState | null>(null)

const STORAGE_KEY = 'tripPlanner.settings.v1'

type PersistedSettings = {
  motion: MotionSetting
  uiMode?: UiMode
  fontScale?: FontScale
}

function defaultPersisted(): PersistedSettings {
  // Default for this project: senior-friendly (bigger, clearer, less motion).
  return { motion: 'low', uiMode: 'senior', fontScale: 1 }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const persisted = useMemo(
    () => loadJson<PersistedSettings>(STORAGE_KEY, defaultPersisted()),
    [],
  )
  const [uiMode, setUiMode] = useState<UiMode>(persisted.uiMode ?? 'senior')
  const [motion, setMotion] = useState<MotionSetting>(persisted.motion ?? 'low')
  const [fontScale, setFontScale] = useState<FontScale>(persisted.fontScale ?? 1)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    saveJson<PersistedSettings>(STORAGE_KEY, { motion, uiMode, fontScale })
  }, [motion, uiMode, fontScale])

  useEffect(() => {
    // Let CSS react to UI mode.
    document.documentElement.dataset.ui = uiMode
  }, [uiMode])

  useEffect(() => {
    // Let CSS react to motion setting.
    document.documentElement.dataset.motion = motion
  }, [motion])

  useEffect(() => {
    // Let CSS react to font scale (elder-first: 0=large, 1=larger, 2=largest).
    document.documentElement.dataset.font = String(fontScale)
  }, [fontScale])

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
      fontScale,
      prefersReducedMotion,
      setMotion,
      setUiMode: (next) => {
        // In senior mode, default to low motion (but still allow manual override).
        // Do this in the setter (user action), not in an effect.
        setUiMode(next)
        if (next === 'senior') setMotion('low')
      },
      setFontScale,
      resetRecommended: () => {
        setUiMode('senior')
        setMotion('low')
        setFontScale(1)
      },
    }),
    [motion, uiMode, fontScale, prefersReducedMotion],
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

