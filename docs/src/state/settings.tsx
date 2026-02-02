/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { usePersistedJsonState } from './persist'

export type MotionSetting = 'standard' | 'low'
export type UiMode = 'standard' | 'senior'
export type FontScale = 0 | 1 | 2

export type SettingsState = {
  motion: MotionSetting
  uiMode: UiMode
  fontScale: FontScale
  prefersReducedMotion: boolean
}

export type SettingsActions = {
  setMotion: (next: MotionSetting) => void
  setUiMode: (next: UiMode) => void
  setFontScale: (next: FontScale) => void
  resetRecommended: () => void
}

type SettingsContextValue = {
  state: SettingsState
  actions: SettingsActions
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

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
  const [persisted, setPersisted] = usePersistedJsonState<PersistedSettings>(
    STORAGE_KEY,
    () => defaultPersisted(),
  )

  const uiMode: UiMode = persisted.uiMode ?? 'senior'
  const motion: MotionSetting = persisted.motion ?? 'low'
  const fontScale: FontScale = persisted.fontScale ?? 1
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

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

  const state = useMemo<SettingsState>(
    () => ({ motion, uiMode, fontScale, prefersReducedMotion }),
    [fontScale, motion, prefersReducedMotion, uiMode],
  )

  const actions = useMemo<SettingsActions>(
    () => ({
      setMotion: (next) => setPersisted((s) => ({ ...s, motion: next })),
      setUiMode: (next) =>
        setPersisted((s) => {
          // In senior mode, default to low motion (but still allow manual override).
          // Do this in the setter (user action), not in an effect.
          const nextMotion: MotionSetting = next === 'senior' ? 'low' : (s.motion ?? 'low')
          return { ...s, uiMode: next, motion: nextMotion }
        }),
      setFontScale: (next) => setPersisted((s) => ({ ...s, fontScale: next })),
      resetRecommended: () => setPersisted(defaultPersisted()),
    }),
    [setPersisted],
  )

  const value = useMemo<SettingsContextValue>(() => ({ state, actions }), [actions, state])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

export function useMotionEnabled(): boolean {
  const {
    state: { motion, prefersReducedMotion },
  } = useSettings()
  return motion === 'standard' && !prefersReducedMotion
}

