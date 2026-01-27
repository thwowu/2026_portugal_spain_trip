import { useEffect, useRef } from 'react'
import { useMotionEnabled } from '../state/settings'

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const motionEnabled = useMotionEnabled()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!motionEnabled) {
      el.classList.add('revealed')
      return
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
    return () => io.disconnect()
  }, [motionEnabled])

  return ref
}

