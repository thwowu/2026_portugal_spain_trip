import { useEffect, useState } from 'react'
import { useMotionEnabled } from '../state/settings'

export function ScrollProgress() {
  const [pct, setPct] = useState(0)
  const motionEnabled = useMotionEnabled()

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const doc = document.documentElement
        const scrollTop = doc.scrollTop
        const scrollHeight = doc.scrollHeight - doc.clientHeight
        const p = scrollHeight <= 0 ? 0 : Math.min(1, Math.max(0, scrollTop / scrollHeight))
        setPct(p)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      style={{
        height: 3,
        width: '100%',
        background: 'transparent',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${Math.round(pct * 100)}%`,
          background: 'color-mix(in oklab, var(--accent) 75%, white)',
          transition: motionEnabled ? 'width 120ms linear' : undefined,
        }}
      />
    </div>
  )
}

