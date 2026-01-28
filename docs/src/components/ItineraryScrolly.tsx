import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ItineraryDay } from '../data/itinerary'
import { ITINERARY_PHASES } from '../generated'
import { ItineraryLeafletMap } from './ItineraryLeafletMap'
import { useMotionEnabled } from '../state/settings'
import { useProgress } from '../state/progress'
import { FormattedText } from './FormattedText'
import { Modal } from './Modal'
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
  const { actions: progressActions } = useProgress()
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
  const [selectedDay, setSelectedDay] = useState<ItineraryDay | null>(null)
  const stepRefs = useRef<Map<number, HTMLElement>>(new Map())
  const ioRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const d = days[activeStep]
    if (d) progressActions.markItineraryDaySeen(d.day)
  }, [activeStep, days, progressActions])

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

    ioRef.current = io
    stepRefs.current.forEach((el) => io.observe(el))
    return () => {
      io.disconnect()
      ioRef.current = null
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Don't hijack keys when user is interacting with form controls or any modal/dialog.
      // (E.g. settings slider uses ArrowLeft/ArrowRight.)
      const target = event.target instanceof HTMLElement ? event.target : null
      if (target) {
        const tag = target.tagName
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          target.isContentEditable ||
          target.closest('[role="dialog"]')
        ) {
          return
        }
      }

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
              if (el) {
                stepRefs.current.set(idx, el)
                // Ensure the card is observed even if refs settle after the effect.
                ioRef.current?.observe(el)
              } else {
                stepRefs.current.delete(idx)
              }
            }}
            tabIndex={-1}
            onMouseEnter={() => setHoveredStep(idx)}
            onMouseLeave={() => setHoveredStep(null)}
            onFocus={() => setHoveredStep(idx)}
            onBlur={() => setHoveredStep(null)}
          >
            <div className="cardInner">
              <h3 className="itDayHeading">{`Day ${d.day}${d.dateLabel ? `｜${d.dateLabel}` : ''}`}</h3>
              <h4 className="itCityHeading">{d.cityLabel}</h4>
              <p className="itTitleText">{d.title}</p>
              <p className="itSummaryText">{dayCardText(d)}</p>
              <div className="itActions">
                <button
                  type="button"
                  className="btn btnPrimary btnSm"
                  onClick={() => setSelectedDay(d)}
                  aria-haspopup="dialog"
                  aria-label={`展開細節：Day ${d.day}`}
                >
                  展開細節
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <Modal
        open={selectedDay !== null}
        ariaLabel={selectedDay ? `Day ${selectedDay.day}｜細節` : '行程細節'}
        onClose={() => setSelectedDay(null)}
        overlayClassName="modalOverlay modalOverlayHigh"
        cardClassName="card modalCard"
        cardStyle={{ maxWidth: 'min(860px, 100%)' }}
      >
        {selectedDay ? (
          <div className="cardInner">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 950, fontSize: 'var(--text-xl)', lineHeight: 1.15 }}>
                  Day {selectedDay.day}
                  {selectedDay.dateLabel ? `｜${selectedDay.dateLabel}` : ''}
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {selectedDay.cityLabel} · {selectedDay.title}
                </div>
              </div>
              <button className="btn" onClick={() => setSelectedDay(null)}>
                關閉
              </button>
            </div>

            <hr className="hr" />

            <div style={{ display: 'grid', gap: 10 }}>
              {selectedDay.details.morning ? (
                <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
                  <div className="cardInner">
                    <div style={{ fontWeight: 800 }}>早</div>
                    <div style={{ marginTop: 6 }}>
                      <FormattedText text={selectedDay.details.morning} />
                    </div>
                  </div>
                </div>
              ) : null}
              {selectedDay.details.noon ? (
                <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
                  <div className="cardInner">
                    <div style={{ fontWeight: 800 }}>中</div>
                    <div style={{ marginTop: 6 }}>
                      <FormattedText text={selectedDay.details.noon} />
                    </div>
                  </div>
                </div>
              ) : null}
              {selectedDay.details.evening ? (
                <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
                  <div className="cardInner">
                    <div style={{ fontWeight: 800 }}>晚</div>
                    <div style={{ marginTop: 6 }}>
                      <FormattedText text={selectedDay.details.evening} />
                    </div>
                  </div>
                </div>
              ) : null}
              {selectedDay.details.notes?.length ? (
                <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
                  <div className="cardInner">
                    <div style={{ fontWeight: 800 }}>備註</div>
                    <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 18 }}>
                      {selectedDay.details.notes.map((n, idx) => (
                        <li key={idx} style={{ marginTop: idx === 0 ? 0 : 6 }}>
                          <FormattedText text={n} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              {!selectedDay.details.morning &&
              !selectedDay.details.noon &&
              !selectedDay.details.evening &&
              !selectedDay.details.notes?.length ? (
                <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
                  <div className="cardInner">
                    <div style={{ fontWeight: 800 }}>尚無細節</div>
                    <div className="muted" style={{ marginTop: 6 }}>
                      你可以在 <code>docs/src/content/itinerary.md</code> 的該天區塊加入 <code>- details:</code> 來補上早/中/晚或備註。
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

