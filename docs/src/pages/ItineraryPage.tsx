import { useEffect, useMemo, useRef, useState } from 'react'
import { ILLUSTRATION } from '../illustrations'
import { type ItineraryDay, type ItineraryPhase } from '../data/itinerary'
import { ITINERARY_PHASES } from '../generated'
import { useMotionEnabled } from '../state/settings'
import { FormattedText } from '../components/FormattedText'
import { useProgress } from '../state/progress'
import { useSettings } from '../state/settings'
import { Modal } from '../components/Modal'
import { ItineraryBackground } from '../components/ItineraryBackground'
import { ItineraryScrolly } from '../components/ItineraryScrolly'
import styles from './ItineraryTimeline.module.css'
import { cityIdFromLabel } from '../utils/cityIdFromLabel'
import type { CityId } from '../data/core'

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
  const [viewMode, setViewMode] = useState<'timeline' | 'scrolly'>('timeline')
  const dayRefs = useRef<Map<number, HTMLElement>>(new Map())
  const lastActiveRef = useRef<number>(1)

  const allDays = useMemo(
    () => ITINERARY_PHASES.flatMap((p) => p.days),
    [],
  )

  // Floating quick-jump: build by *city* (not by phase) so cities like
  // "塞維爾 / 格拉納達 / 馬德里" appear as separate entries.
  const phaseToc = useMemo(() => {
    const seen = new Set<string>()
    const toc: { id: string; label: string; firstDay: number }[] = []
    for (const d of allDays) {
      const city = d.cityLabel.trim()
      if (!city || seen.has(city)) continue
      seen.add(city)
      toc.push({ id: `day-${d.day}`, label: city, firstDay: d.day })
    }
    return toc
  }, [allDays])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: don't keep content hidden on older browsers/environments.
      dayRefs.current.forEach((el) => {
        el.dataset.inView = 'true'
      })
      return
    }

    // Separate concerns:
    // - revealObserver: mark cards as "in-view" earlier, so adjacent cards are
    //   effectively preloaded (opacity/transform transition happens sooner).
    // - activeObserver: keep a tighter "active region" for updating activeDay.
    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          ;(e.target as HTMLElement).dataset.inView = e.isIntersecting ? 'true' : 'false'
        }
      },
      // Positive margins = treat elements near viewport as intersecting earlier.
      { root: null, rootMargin: '35% 0px 35% 0px', threshold: 0.01 },
    )

    const activeObserver = new IntersectionObserver(
      (entries) => {
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

    dayRefs.current.forEach((el) => {
      revealObserver.observe(el)
      activeObserver.observe(el)
    })
    return () => {
      revealObserver.disconnect()
      activeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    const prev = lastActiveRef.current
    if (prev !== activeDay) {
      const prevEl = document.getElementById(`day-${prev}`)
      prevEl?.classList.remove('activeDay')
    }
    const el = document.getElementById(`day-${activeDay}`)
    el?.classList.add('activeDay')

    // Preload/reveal adjacent cards a bit earlier so scrolling/jumping feels instant.
    // We only need the opacity/transform transition; content is already in-memory.
    for (const d of [activeDay - 1, activeDay, activeDay + 1]) {
      const node = document.getElementById(`day-${d}`)
      if (node) node.dataset.inView = 'true'
    }

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

  const adjacentDays = useMemo(() => {
    const idx = allDays.findIndex((d) => d.day === activeDay)
    if (idx < 0) return { prev: null as ItineraryDay | null, next: null as ItineraryDay | null }
    return {
      prev: allDays[idx - 1] ?? null,
      next: allDays[idx + 1] ?? null,
    }
  }, [allDays, activeDay])

  const activeCityId = useMemo<CityId>(() => {
    const d = allDays.find((x) => x.day === activeDay)
    return d ? cityIdFromLabel(d.cityLabel) : 'lisbon'
  }, [activeDay, allDays])

  return (
    <div className="pageItinerary">
      {viewMode === 'timeline' ? <ItineraryBackground activeCityId={activeCityId} /> : null}

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
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
                  <button
                    className={`btn ${viewMode === 'timeline' ? 'btnPrimary' : ''}`}
                    onClick={() => setViewMode('timeline')}
                    type="button"
                  >
                    時間軸
                  </button>
                  <button
                    className={`btn ${viewMode === 'scrolly' ? 'btnPrimary' : ''}`}
                    onClick={() => setViewMode('scrolly')}
                    type="button"
                  >
                    地圖跟著走
                  </button>
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

        {viewMode === 'timeline' ? (
          <>
            <Timeline
              phases={ITINERARY_PHASES}
              openDays={openDays}
              onToggleDay={toggleDay}
              setDayRef={(day, el) => {
                if (el) dayRefs.current.set(day, el)
              }}
            />

            <AdjacentDayDock
              motionEnabled={motionEnabled}
              activeDay={activeDay}
              prev={adjacentDays.prev}
              next={adjacentDays.next}
            />
          </>
        ) : (
          // Scrollytelling layout owns the scroll container + fixed map.
          <ItineraryScrolly />
        )}

        {/* Floating quick-jump (hamburger) */}
        {viewMode === 'timeline' ? (
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
        ) : null}

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
    </div>
  )
}

function AdjacentDayDock({
  motionEnabled,
  activeDay,
  prev,
  next,
}: {
  motionEnabled: boolean
  activeDay: number
  prev: ItineraryDay | null
  next: ItineraryDay | null
}) {
  const jump = (day: number) => scrollToId(`day-${day}`, motionEnabled)
  const label = (d: ItineraryDay) => `Day ${d.day}｜${d.cityLabel}｜${d.title}`

  // Avoid showing an empty dock in weird edge states.
  if (!prev && !next) return null

  return (
    <div className={styles.adjacentDock} aria-label="前後一天">
      <button
        type="button"
        className={`card ${styles.adjacentCard} ${styles.adjacentCardTop} ${!prev ? styles.adjacentCardDisabled : ''}`}
        onClick={() => prev && jump(prev.day)}
        disabled={!prev}
        aria-label={prev ? `上一天：${label(prev)}` : '沒有上一天'}
        title={prev ? `上一天：${label(prev)}` : '沒有上一天'}
      >
        <div className="cardInner" style={{ padding: 12 }}>
          <div className={styles.adjacentMeta}>上一天</div>
          <div className={styles.adjacentTitle}>{prev ? `Day ${prev.day}` : '—'}</div>
          <div className={styles.adjacentSub}>{prev ? `${prev.cityLabel}｜${prev.title}` : '已經是第一天'}</div>
        </div>
      </button>

      <button
        type="button"
        className={`card ${styles.adjacentCard} ${styles.adjacentCardBottom} ${!next ? styles.adjacentCardDisabled : ''}`}
        onClick={() => next && jump(next.day)}
        disabled={!next}
        aria-label={next ? `下一天：${label(next)}` : '沒有下一天'}
        title={next ? `下一天：${label(next)}` : '沒有下一天'}
      >
        <div className="cardInner" style={{ padding: 12 }}>
          <div className={styles.adjacentMeta}>下一天</div>
          <div className={styles.adjacentTitle}>{next ? `Day ${next.day}` : '—'}</div>
          <div className={styles.adjacentSub}>{next ? `${next.cityLabel}｜${next.title}` : '已經是最後一天'}</div>
        </div>
      </button>

      {/* Keep a tiny center indicator for screen readers only. */}
      <span aria-hidden="true" style={{ position: 'absolute', left: -9999, top: -9999 }}>
        Day {activeDay}
      </span>
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
              依城市跳到對應日（Day）。
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

