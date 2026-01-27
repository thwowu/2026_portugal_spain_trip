import { useEffect, useMemo, useRef, useState } from 'react'
import { ILLUSTRATION } from '../illustrations'
import { type ItineraryDay, type ItineraryPhase } from '../data/itinerary'
import { ITINERARY_PHASES } from '../generated'
import { useMotionEnabled } from '../state/settings'
import { FormattedText } from '../components/FormattedText'
import { useProgress } from '../state/progress'
import { useSettings } from '../state/settings'
import { Modal } from '../components/Modal'
import styles from './ItineraryTimeline.module.css'

function tagLabel(tag: ItineraryDay['tags'][number]) {
  switch (tag) {
    case 'travel_day':
      return '交通日'
    case 'wow':
      return 'WOW'
    case 'easy':
      return '走路少'
    case 'ticket':
      return '可能要預約'
    case 'rain_ok':
      return '雨天可行'
    default:
      return tag
  }
}

function scrollToId(id: string, motionEnabled: boolean) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: motionEnabled ? 'smooth' : 'auto', block: 'start' })
}

export function ItineraryPage() {
  const motionEnabled = useMotionEnabled()
  const { actions: progressActions } = useProgress()
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({})
  const [activeDay, setActiveDay] = useState<number>(1)
  const [tocOpen, setTocOpen] = useState(false)
  const dayRefs = useRef<Map<number, HTMLElement>>(new Map())
  const lastActiveRef = useRef<number>(1)

  const allDays = useMemo(
    () => ITINERARY_PHASES.flatMap((p) => p.days),
    [],
  )

  const phaseToc = useMemo(
    () =>
      ITINERARY_PHASES.map((p) => ({
        id: p.id,
        label: p.label,
        firstDay: p.days[0]?.day ?? 1,
      })),
    [],
  )

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: don't keep content hidden on older browsers/environments.
      dayRefs.current.forEach((el) => {
        el.dataset.inView = 'true'
      })
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // Toggle "in-view" for entry animations (CSS handles reduced-motion).
        for (const e of entries) {
          ;(e.target as HTMLElement).dataset.inView = e.isIntersecting ? 'true' : 'false'
        }

        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0))
        const first = visible[0]
        if (!first) return
        const day = Number((first.target as HTMLElement).dataset.day)
        if (!Number.isNaN(day)) setActiveDay(day)
      },
      { root: null, rootMargin: '-40% 0px -55% 0px', threshold: [0, 0.1] },
    )

    dayRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const prev = lastActiveRef.current
    if (prev !== activeDay) {
      const prevEl = document.getElementById(`day-${prev}`)
      prevEl?.classList.remove('activeDay')
    }
    const el = document.getElementById(`day-${activeDay}`)
    el?.classList.add('activeDay')
    lastActiveRef.current = activeDay
  }, [activeDay])

  useEffect(() => {
    progressActions.markItineraryDaySeen(activeDay)
  }, [activeDay, progressActions])

  const toggleDay = (day: number) => {
    setOpenDays((s) => ({ ...s, [day]: !s[day] }))
  }

  const expandAll = () => setOpenDays(Object.fromEntries(allDays.map((d) => [d.day, true])))
  const collapseAll = () => setOpenDays({})

  return (
    <div className="container">
      <div className="card">
        <div className="cardInner">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 14 }}>
            <div>
              <div style={{ fontWeight: 950, fontSize: 'var(--text-2xl)', lineHeight: 1.1 }}>
                Day 1–15 總行程
              </div>
              <div className="muted" style={{ marginTop: 10 }}>
                像「流程圖」一樣往下滑：先看每一天摘要，需要再展開。
              </div>
              <div className="chipRow" style={{ marginTop: 12 }}>
                <button className="btn btnPrimary" onClick={expandAll}>
                  展開全部
                </button>
                <button className="btn" onClick={collapseAll}>
                  收合全部
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <img
                src={ILLUSTRATION.cover3d.src}
                alt={ILLUSTRATION.cover3d.alt}
                style={{ width: 120, height: 120, objectFit: 'contain' }}
              />
            </div>
          </div>

          <hr className="hr" />
        </div>
      </div>

      <div style={{ height: 12 }} />

      <Timeline phases={ITINERARY_PHASES} openDays={openDays} onToggleDay={toggleDay} setDayRef={(day, el) => {
        if (el) dayRefs.current.set(day, el)
      }} />

      {/* Floating quick-jump (hamburger) */}
      <button
        type="button"
        className="btn btnPrimary"
        onClick={() => setTocOpen(true)}
        aria-haspopup="dialog"
        aria-label="快速跳轉"
        title="快速跳轉"
        style={{
          position: 'fixed',
          right: 'calc(env(safe-area-inset-right, 0px) + 14px)',
          bottom: 'calc(var(--bottomnav-h, 84px) + env(safe-area-inset-bottom, 0px) + 12px)',
          width: 52,
          height: 52,
          borderRadius: 16,
          display: 'grid',
          placeItems: 'center',
          zIndex: 30,
          boxShadow: '0 18px 46px rgba(0,0,0,0.22)',
          padding: 0,
        }}
      >
        <span aria-hidden="true" style={{ display: 'grid', gap: 5 }}>
          <span style={{ width: 20, height: 2, borderRadius: 99, background: 'white', display: 'block' }} />
          <span style={{ width: 20, height: 2, borderRadius: 99, background: 'white', display: 'block' }} />
          <span style={{ width: 20, height: 2, borderRadius: 99, background: 'white', display: 'block' }} />
        </span>
      </button>

      {tocOpen && (
        <QuickJumpModal
          phaseToc={phaseToc}
          onClose={() => setTocOpen(false)}
          onPick={(id) => {
            scrollToId(id, motionEnabled)
            setTocOpen(false)
          }}
        />
      )}
    </div>
  )
}

function QuickJumpModal({
  phaseToc,
  onClose,
  onPick,
}: {
  phaseToc: { id: string; label: string; firstDay: number }[]
  onClose: () => void
  onPick: (id: string) => void
}) {
  const { state: progress } = useProgress()
  const { showSeenHints } = useSettings()
  return (
    <Modal open ariaLabel="快速跳轉" onClose={onClose} overlayClassName="modalOverlay modalOverlayHigh">
      <div className="cardInner">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 950, fontSize: 'var(--text-xl)', lineHeight: 1.15 }}>快速跳轉</div>
            <div className="muted" style={{ marginTop: 6 }}>
              依城市（phase）跳到對應段落。
            </div>
          </div>
          <button className="btn" onClick={onClose}>
            關閉
          </button>
        </div>

        <hr className="hr" />

        <div className="chipRow">
          {phaseToc.map((p) => (
            <button key={p.id} className="btn" onClick={() => onPick(p.id)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span>{p.label}</span>
                {showSeenHints && progress.itinerarySeenDays[p.firstDay] ? <span className="chip">已看過</span> : null}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

function Timeline({
  phases,
  openDays,
  onToggleDay,
  setDayRef,
}: {
  phases: ItineraryPhase[]
  openDays: Record<number, boolean>
  onToggleDay: (day: number) => void
  setDayRef: (day: number, el: HTMLElement | null) => void
}) {
  const { state: progress } = useProgress()
  const { showSeenHints } = useSettings()
  return (
    <div className={styles.timeline}>
      {phases.map((phase) => (
        <section key={phase.id} id={phase.id}>
          <div
            className="card"
            style={{
              position: 'sticky',
              top: 'calc(var(--topbar-h, 68px) + 8px)', // below the sticky top bar (mobile-safe)
              zIndex: 9,
              boxShadow: 'none',
              background: 'color-mix(in oklab, var(--bg) 84%, white)',
              backdropFilter: 'blur(10px)',
              border: '1px solid var(--hairline)',
            }}
          >
            <div className="cardInner" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img
                src={ILLUSTRATION.map.src}
                alt={ILLUSTRATION.map.alt}
                style={{ width: 34, height: 34, objectFit: 'contain' }}
              />
              <div style={{ fontWeight: 900, fontSize: 'var(--text-lg)' }}>{phase.label}</div>
            </div>
          </div>

          <div style={{ height: 10 }} />

          <div className={styles.phaseDays}>
            {phase.days.map((d) => (
              <div key={d.day} className={`${styles.dayRow} ${d.day % 2 === 0 ? styles.right : styles.left}`}>
                <div className={styles.axis} aria-hidden="true">
                  <div className={styles.marker} />
                </div>

                <article
                  id={`day-${d.day}`}
                  data-day={d.day}
                  ref={(el) => setDayRef(d.day, el)}
                  className={`card ${styles.dayCard}`}
                >
                  <div className="cardInner">
                    <div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 900 }}>
                          Day {d.day}
                          {d.dateLabel ? `｜${d.dateLabel}` : ''}
                        </div>
                        <div className="muted">{d.cityLabel}</div>
                        <div className="chipRow" style={{ marginLeft: 'auto' }}>
                          {d.tags.map((t) => (
                            <span key={t} className="chip">
                              {tagLabel(t)}
                            </span>
                          ))}
                          {showSeenHints && progress.itinerarySeenDays[d.day] ? <span className="chip">已看過</span> : null}
                        </div>
                      </div>

                      <div style={{ marginTop: 6, fontWeight: 800 }}>{d.title}</div>

                      <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                        {d.summary.morning && (
                          <div>
                            <span className="chip">早</span> {d.summary.morning}
                          </div>
                        )}
                        {d.summary.noon && (
                          <div>
                            <span className="chip">中</span> {d.summary.noon}
                          </div>
                        )}
                        {d.summary.evening && (
                          <div>
                            <span className="chip">晚</span> {d.summary.evening}
                          </div>
                        )}
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <button className="btn btnPrimary" onClick={() => onToggleDay(d.day)}>
                          {openDays[d.day] ? '收合細節' : '展開細節'}
                        </button>
                      </div>

                      {openDays[d.day] && (
                        <div style={{ marginTop: 12 }}>
                          <hr className="hr" />
                          <div style={{ display: 'grid', gap: 10 }}>
                            {d.details.morning && (
                              <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
                                <div className="cardInner">
                                  <div style={{ fontWeight: 800 }}>早</div>
                                  <div style={{ marginTop: 6 }}>
                                    <FormattedText text={d.details.morning} />
                                  </div>
                                </div>
                              </div>
                            )}
                            {d.details.noon && (
                              <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
                                <div className="cardInner">
                                  <div style={{ fontWeight: 800 }}>中</div>
                                  <div style={{ marginTop: 6 }}>
                                    <FormattedText text={d.details.noon} />
                                  </div>
                                </div>
                              </div>
                            )}
                            {d.details.evening && (
                              <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
                                <div className="cardInner">
                                  <div style={{ fontWeight: 800 }}>晚</div>
                                  <div style={{ marginTop: 6 }}>
                                    <FormattedText text={d.details.evening} />
                                  </div>
                                </div>
                              </div>
                            )}
                            {d.details.notes?.length ? (
                              <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
                                <div className="cardInner">
                                  <div style={{ fontWeight: 800 }}>備註</div>
                                  <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 18 }}>
                                    {d.details.notes.map((n, idx) => (
                                      <li key={idx} style={{ marginTop: idx === 0 ? 0 : 6 }}>
                                        <FormattedText text={n} />
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            ) : null}

                            {!d.details.morning &&
                              !d.details.noon &&
                              !d.details.evening &&
                              !d.details.notes?.length && (
                                <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
                                  <div className="cardInner">
                                    <div style={{ fontWeight: 800 }}>尚無細節</div>
                                    <div className="muted" style={{ marginTop: 6 }}>
                                      你可以在 <code>docs/src/content/itinerary.md</code> 的該天區塊加入 <code>- details:</code>{' '}
                                      來補上早/中/晚或備註。
                                    </div>
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

