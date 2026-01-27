import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useMotionEnabled } from '../state/settings'

export function useHashScroll() {
  const location = useLocation()
  const motionEnabled = useMotionEnabled()

  useEffect(() => {
    const id = location.hash?.replace('#', '')
    if (!id) return
    const el = document.getElementById(id)
    if (!el) return

    el.scrollIntoView({ behavior: motionEnabled ? 'smooth' : 'auto', block: 'start' })
    el.classList.add('hashFlash')
    const t = window.setTimeout(() => el.classList.remove('hashFlash'), 1100)
    return () => window.clearTimeout(t)
  }, [location.hash, motionEnabled])
}

