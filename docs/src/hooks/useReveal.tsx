import { useEffect, useRef } from 'react'
import { useMotionEnabled } from '../state/settings'

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const motionEnabled = useMotionEnabled()

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reveal = () => el.classList.add('revealed')

    if (!motionEnabled) {
      reveal()
      return
    }
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: don't keep content hidden on older browsers/environments.
      reveal()
      return
    }

    // iOS Safari quirk: IntersectionObserver may not fire immediately for elements
    // already in view on initial load. Add a cheap manual "in-viewport" check so
    // the first card never stays stuck at opacity: 0.
    const maybeRevealIfInViewport = () => {
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight || 0
      if (vh <= 0) return
      // Treat "mostly in view" as visible (accounts for sticky top bars).
      if (rect.bottom > 0 && rect.top < vh * 0.98) reveal()
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          ;(e.target as HTMLElement).classList.add('revealed')
          io.unobserve(e.target)
        }
      },
      { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
    )
    io.observe(el)

    // Run after layout is settled (fonts/images/sticky bars).
    const raf = requestAnimationFrame(maybeRevealIfInViewport)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [motionEnabled])

  return ref
}

