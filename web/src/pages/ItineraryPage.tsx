import { useEffect, useMemo, useRef, useState } from 'react'
import { ILLUSTRATION } from '../illustrations'
import { type ItineraryDay, type ItineraryPhase } from '../data/itinerary'
import { ITINERARY_PHASES } from '../generated'
import { useMotionEnabled } from '../state/settings'

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
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({})
  const [activeDay, setActiveDay] = useState<number>(1)
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
    const observer = new IntersectionObserver(
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

  const toggleDay = (day: number) => {
    setOpenDays((s) => ({ ...s, [day]: !s[day] }))
  }

  const expandAll = () => setOpenDays(Object.fromEntries(allDays.map((d) => [d.day, true])))
  const collapseAll = () => setOpenDays({})

  const goPrev = () => scrollToId(`day-${Math.max(1, activeDay - 1)}`, motionEnabled)
  const goNext = () =>
    scrollToId(`day-${Math.min(allDays.length, activeDay + 1)}`, motionEnabled)

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

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="muted" style={{ fontSize: 13 }}>
              快速跳轉（城市）
            </div>
            {phaseToc.map((p) => (
              <button
                key={p.id}
                className="btn"
                onClick={() => scrollToId(p.id, motionEnabled)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky mini nav */}
      <div
        className="card"
        style={{
          position: 'sticky',
          top: 66,
          zIndex: 9,
          marginTop: 12,
          boxShadow: '0 6px 18px rgba(18, 17, 14, 0.06)',
        }}
      >
        <div className="cardInner" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontWeight: 900 }}>
            Day {activeDay}
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            {allDays.find((d) => d.day === activeDay)?.cityLabel}
          </div>
          <div style={{ marginLeft: 10 }}>
            <label className="muted" style={{ fontSize: 13, marginRight: 8 }}>
              跳到
            </label>
            <select
              value={String(activeDay)}
              onChange={(e) => {
                const day = Number(e.target.value)
                if (!Number.isNaN(day)) scrollToId(`day-${day}`, motionEnabled)
              }}
              style={{
                borderRadius: 12,
                border: '1px solid var(--hairline)',
                padding: '10px 10px',
                minHeight: 44,
              }}
              aria-label="跳到指定 Day"
            >
              {allDays.map((d) => (
                <option key={d.day} value={String(d.day)}>
                  Day {d.day}｜{d.cityLabel}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <button className="btn" onClick={goPrev} aria-label="上一天">
              上一天
            </button>
            <button className="btn btnPrimary" onClick={goNext} aria-label="下一天">
              下一天
            </button>
          </div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <Timeline phases={ITINERARY_PHASES} openDays={openDays} onToggleDay={toggleDay} setDayRef={(day, el) => {
        if (el) dayRefs.current.set(day, el)
      }} />
    </div>
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
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {phases.map((phase) => (
        <section key={phase.id} id={phase.id}>
          <div className="card" style={{ boxShadow: 'none' }}>
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

          <div style={{ display: 'grid', gap: 12 }}>
            {phase.days.map((d) => (
              <article
                key={d.day}
                id={`day-${d.day}`}
                data-day={d.day}
                ref={(el) => setDayRef(d.day, el)}
                className="card"
                style={{ boxShadow: 'none' }}
              >
                <div className="cardInner">
                  <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr', gap: 12 }}>
                    {/* timeline node */}
                    <div style={{ position: 'relative' }}>
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 99,
                          border: '2px solid var(--accent)',
                          background: 'color-mix(in oklab, var(--accent) 10%, white)',
                          marginTop: 6,
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          left: 6,
                          top: 22,
                          bottom: -10,
                          width: 2,
                          background: 'color-mix(in oklab, var(--accent) 18%, var(--hairline))',
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 900 }}>
                          Day {d.day}｜{d.dateLabel}
                        </div>
                        <div className="muted">{d.cityLabel}</div>
                        <div className="chipRow" style={{ marginLeft: 'auto' }}>
                          {d.tags.map((t) => (
                            <span key={t} className="chip">
                              {tagLabel(t)}
                            </span>
                          ))}
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
                          <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
                            （細節內容之後會從 `葡西之旅建議.md` 自動拆入）
                          </div>
                          <div style={{ display: 'grid', gap: 10 }}>
                            {d.details.morning && (
                              <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
                                <div className="cardInner">
                                  <div style={{ fontWeight: 800 }}>早</div>
                                  <div style={{ marginTop: 6 }}>{d.details.morning}</div>
                                </div>
                              </div>
                            )}
                            {d.details.noon && (
                              <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
                                <div className="cardInner">
                                  <div style={{ fontWeight: 800 }}>中</div>
                                  <div style={{ marginTop: 6 }}>{d.details.noon}</div>
                                </div>
                              </div>
                            )}
                            {d.details.evening && (
                              <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
                                <div className="cardInner">
                                  <div style={{ fontWeight: 800 }}>晚</div>
                                  <div style={{ marginTop: 6 }}>{d.details.evening}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

