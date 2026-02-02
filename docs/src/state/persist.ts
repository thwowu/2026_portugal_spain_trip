import { useEffect, useState } from 'react'
import { loadJson, saveJson } from './storage'

type Initial<T> = T | (() => T)

function resolveInitial<T>(initial: Initial<T>): T {
  return typeof initial === 'function' ? (initial as () => T)() : initial
}

/**
 * Persisted JSON state (localStorage).
 *
 * - Loads once on mount (safe for SSR guards via `loadJson`).
 * - Writes on every state change.
 */
export function usePersistedJsonState<T>(key: string, initial: Initial<T>) {
  const [state, setState] = useState<T>(() => loadJson<T>(key, resolveInitial(initial)))

  useEffect(() => {
    saveJson(key, state)
  }, [key, state])

  return [state, setState] as const
}

