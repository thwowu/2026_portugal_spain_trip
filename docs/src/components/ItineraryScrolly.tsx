import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ItineraryDay } from '../data/itinerary'
import { ITINERARY_PHASES } from '../generated'
import { ItineraryLeafletMap } from './ItineraryLeafletMap'
import { useMotionEnabled } from '../state/settings'
import { cityIdFromLabel } from '../utils/cityIdFromLabel'

function dayCardText(d: ItineraryDay) {
  const parts: string[] = []
  if (d.summary.morning) parts.push(`早：${d.summary.morning}`)
  if (d.summary.noon) parts.push(`中：${d.summary.noon}`)
  if (d.summary.evening) parts.push(`晚：${d.summary.evening}`)
  return parts.join('\n')
}

export function ItineraryScrolly() {
  const motionEnabled = useMotionEnabled()
  const prefersReducedMotion =
    typeof window !== 'undefined' && typeof window.matchMedia !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  const days = useMemo(() => ITINERARY_PHASES.flatMap((p) => p.days), [])
  const waypoints = useMemo(
    () =>
      days.map((d) => ({
        step: d.day,
        cityId: cityIdFromLabel(d.cityLabel),
        title: `${d.cityLabel}｜${d.title}`,
      })),
    [days],
  )

  const [activeStep, setActiveStep] = useState(0)
  const [hoveredStep, setHoveredStep] = useState<number | null>(null)
  const stepRefs = useRef<Map<number, HTMLElement>>(new Map())

  const jumpToIndex = useCallback((idx: number) => {
    const el = stepRefs.current.get(idx)
    if (!el) return
    setActiveStep(idx)
    el.scrollIntoView({
      behavior: prefersReducedMotion || !motionEnabled ? 'auto' : 'smooth',
      block: 'center',
    })
    el.focus()
  }, [motionEnabled, prefersReducedMotion])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0))
        const first = visible[0]
        if (!first) return
        const idx = Number((first.target as HTMLElement).dataset.stepIndex)
        if (!Number.isNaN(idx)) setActiveStep(idx)
      },
      { root: null, rootMargin: '-40% 0px -55% 0px', threshold: [0, 0.1] },
    )

    stepRefs.current.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const max = days.length - 1
      if (event.key === 'Escape') {
        jumpToIndex(0)
        return
      }

      if (event.key === 'ArrowLeft' && activeStep > 0) {
        event.preventDefault()
        jumpToIndex(activeStep - 1)
        return
      }

      if (event.key === 'ArrowRight' && activeStep < max) {
        event.preventDefault()
        jumpToIndex(activeStep + 1)
        return
      }

      // Number keys: support 1-9 quick jump (keeps it predictable).
      if (event.key >= '1' && event.key <= '9') {
        const day = Number(event.key)
        const idx = days.findIndex((d) => d.day === day)
        if (idx >= 0) {
          event.preventDefault()
          jumpToIndex(idx)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeStep, days, jumpToIndex])

  return (
    <div id="scroll">
      <div className="scroll__graphic">
        <div className="overlay" style={{ width: '100%', height: '100%' }}>
          <ItineraryLeafletMap
            waypoints={waypoints}
            activeStep={activeStep}
            hoveredStep={hoveredStep}
            onPickStepIndex={(idx) => jumpToIndex(idx)}
          />
        </div>
      </div>

      <div className="scroll__text" aria-label="行程卡片（地圖跟著走）">
        {days.map((d, idx) => (
          <article
            key={d.day}
            className="step card"
            data-step={d.day}
            data-step-index={idx}
            ref={(el) => {
              if (el) stepRefs.current.set(idx, el)
            }}
            tabIndex={-1}
            onMouseEnter={() => setHoveredStep(idx)}
            onMouseLeave={() => setHoveredStep(null)}
            onFocus={() => setHoveredStep(idx)}
            onBlur={() => setHoveredStep(null)}
          >
            <div className="cardInner">
              <h3 style={{ margin: 0, fontSize: '1.25em' }}>{`Day ${d.day}${d.dateLabel ? `｜${d.dateLabel}` : ''}`}</h3>
              <h4 style={{ margin: '8px 0 0 0' }}>{d.cityLabel}</h4>
              <p style={{ margin: '10px 0 0 0', whiteSpace: 'pre-wrap' }}>{d.title}</p>
              <p style={{ margin: '10px 0 0 0', whiteSpace: 'pre-wrap' }}>{dayCardText(d)}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

