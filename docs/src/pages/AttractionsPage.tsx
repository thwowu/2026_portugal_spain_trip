import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ATTRACTIONS_DATA, EXTENSIONS_DATA } from '../generated'
import { CITIES, STAYS_CITY_ORDER } from '../data/core'
import type { CityId } from '../data/core'
import { useProgress } from '../state/progress'
import { useHashScroll } from '../hooks/useHashScroll'
import { useReveal } from '../hooks/useReveal'
import { Modal } from '../components/Modal'
import { ILLUSTRATION } from '../illustrations'
import { PageHero } from '../components/PageHero'
import { RichContent } from '../components/RichContent'
import { firstContentSnippet } from '../utils/richContentSnippet'
import { useMotionEnabled } from '../state/settings'
import { AttractionsSpotCards } from '../components/AttractionsSpotCards'

const SECTION_TAB_LABEL: Record<string, string> = {
  must: '必去',
  easy: '輕鬆',
  rain: '雨備',
  views: '視角',
  routes: '路線',
  skip: '跳過',
  practical: '實用',
  food: '吃',
  photo: '拍照',
  safety: '安全',
}

// Keep Attractions city order aligned with the itinerary (same as stays).
// Note: we intentionally omit Sintra here (day trip; no attractions.<sintra>.md).
const DEFAULT_ATTRACTIONS_CITY_ID: CityId | null = (() => {
  for (const id of STAYS_CITY_ORDER) {
    if (ATTRACTIONS_DATA.some((c) => c.cityId === id)) return id
  }
  return (ATTRACTIONS_DATA[0]?.cityId as CityId) ?? null
})()

export function AttractionsPage() {
  const { actions: progressActions } = useProgress()
  useHashScroll()
  const location = useLocation()
  const motionEnabled = useMotionEnabled()
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [active, setActive] = useState<{ cityId: string; tripId: string } | null>(null)
  const [activeCityId, setActiveCityId] = useState<CityId | null>(DEFAULT_ATTRACTIONS_CITY_ID)
  const [activeTabByCity, setActiveTabByCity] = useState<Record<string, string>>({})
  const [cityProgress, setCityProgress] = useState(0)
  const [requestedSpot, setRequestedSpot] = useState<{ cityId: string; kind: string; slug: string } | null>(null)

  const extensionsByCity = useMemo(() => {
    const m = new Map<string, (typeof EXTENSIONS_DATA)[number]>()
    for (const c of EXTENSIONS_DATA) m.set(c.cityId, c)
    return m
  }, [])

  const orderedAttractions = useMemo(() => {
    const byId = new Map<CityId, (typeof ATTRACTIONS_DATA)[number]>()
    for (const c of ATTRACTIONS_DATA) byId.set(c.cityId as CityId, c)

    const ordered: (typeof ATTRACTIONS_DATA) = []
    // 1) Primary order: same as itinerary/stays
    for (const id of STAYS_CITY_ORDER) {
      const c = byId.get(id)
      if (c) {
        ordered.push(c)
        byId.delete(id)
      }
    }
    // 2) Append any remaining cities in the original file order (future-proofing)
    for (const c of ATTRACTIONS_DATA) {
      const id = c.cityId as CityId
      if (!byId.has(id)) continue
      ordered.push(c)
      byId.delete(id)
    }

    return ordered
  }, [])

  const cityOrder = useMemo(() => orderedAttractions.map((c) => c.cityId), [orderedAttractions])
  const activeCityIdx = useMemo(() => {
    if (!activeCityId) return 0
    const idx = cityOrder.indexOf(activeCityId)
    return idx >= 0 ? idx : 0
  }, [activeCityId, cityOrder])

  const scrollToCity = useCallback((cityId: CityId) => {
    const el = document.getElementById(`attr-${cityId}`)
    if (!el) return
    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false
    el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' })
    setActiveCityId(cityId)
  }, [])

  const prevCityId = useMemo(() => {
    const id = cityOrder[activeCityIdx - 1]
    return (id as CityId | undefined) ?? null
  }, [activeCityIdx, cityOrder])

  const nextCityId = useMemo(() => {
    const id = cityOrder[activeCityIdx + 1]
    return (id as CityId | undefined) ?? null
  }, [activeCityIdx, cityOrder])

  useEffect(() => {
    // Track which city section is currently "in view" (for highlighting / quick nav).
    const els = Array.from(
      document.querySelectorAll<HTMLElement>('section.attrCitySection[data-city-id]'),
    ).filter((el) => el.id?.startsWith('attr-'))
    if (els.length === 0) return

    const ratios = new Map<string, number>()
    const pick = () => {
      let bestId: string | null = null
      let bestRatio = 0
      for (const [id, r] of ratios.entries()) {
        if (r > bestRatio) {
          bestRatio = r
          bestId = id
        }
      }
      if (bestId) setActiveCityId(bestId as CityId)
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.cityId
          if (!id) continue
          // Keep a soft signal of visibility; we only pick from intersecting-ish sections.
          ratios.set(id, e.isIntersecting ? e.intersectionRatio : 0)
        }
        pick()
      },
      {
        root: null,
        // Bias toward whichever city is around the middle of the viewport.
        rootMargin: '-35% 0px -55% 0px',
        threshold: [0, 0.08, 0.16, 0.24, 0.32, 0.4, 0.5],
      },
    )

    for (const el of els) io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    // Keyboard quick-nav: ArrowLeft / ArrowRight to jump across cities.
    // Avoid stealing keys when modals are open.
    if (active) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return

      if (e.key === 'ArrowLeft') {
        if (!prevCityId) return
        e.preventDefault()
        scrollToCity(prevCityId)
      }
      if (e.key === 'ArrowRight') {
        if (!nextCityId) return
        e.preventDefault()
        scrollToCity(nextCityId)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, nextCityId, prevCityId, scrollToCity])

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const total = Math.max(1, cityOrder.length)
        if (!activeCityId) {
          setCityProgress(0)
          return
        }

        const idx = Math.max(0, cityOrder.indexOf(activeCityId))
        const section = document.querySelector<HTMLElement>(`section.attrCitySection[data-city-id="${activeCityId}"]`)

        let within = 0
        if (section) {
          const rect = section.getBoundingClientRect()
          const anchor = window.innerHeight * 0.45
          const denom = rect.height || 1
          within = Math.min(1, Math.max(0, (anchor - rect.top) / denom))
        }

        // Continuous progress through cities (including within-city scroll).
        const p = Math.min(1, Math.max(0, (idx + within) / total))
        setCityProgress(p)
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [activeCityId, cityOrder])

  useEffect(() => {
    const raw = (location.hash ?? '').replace('#', '').trim()
    if (!raw) {
      setRequestedSpot(null)
      return
    }
    let id = raw
    try {
      id = decodeURIComponent(raw)
    } catch {
      // ignore decode errors; use raw
    }
    if (!id.startsWith('attr-')) return
    const parts = id.split('-')
    // attr-<cityId>-<kind>-<spotSlug...>
    if (parts.length < 4) {
      setRequestedSpot(null)
      return
    }
    const cityId = parts[1] ?? ''
    const kind = parts[2] ?? ''
    const slug = parts.slice(3).join('-')
    if (!cityId || !kind || !slug) return

    setActiveCityId(cityId as CityId)
    setActiveTabByCity((prev) => ({ ...prev, [cityId]: kind }))
    setRequestedSpot({ cityId, kind, slug })

    // Scroll only after the correct city/tab renders the target element.
    let tries = 0
    const tick = () => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: motionEnabled ? 'smooth' : 'auto', block: 'start' })
        el.classList.add('hashFlash')
        window.setTimeout(() => el.classList.remove('hashFlash'), 1100)
        return
      }
      if (tries++ < 30) window.requestAnimationFrame(tick)
    }
    window.requestAnimationFrame(tick)
  }, [location.hash, motionEnabled])

  return (
    <div className="container pageAttractions">
      <div className="card">
        <div className="cardInner">
          <PageHero
            title="景點"
            subtitle={
              <>
                依城市整理景點與注意事項（必去、走路少、雨天備案、視角點、路線、可跳過、實用資訊、吃什麼、拍照點、安全提醒）。
              </>
            }
            image={{
              src: ILLUSTRATION.heroAttractions.src,
              fallbackSrc: ILLUSTRATION.signpost.src,
              alt: ILLUSTRATION.heroAttractions.alt,
            }}
          />

          <hr className="hr" />
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="attrSectionProgress" aria-label="章節進度（景點）">
        <div className="card attrSectionProgressCard">
          <div className="cardInner attrSectionProgressInner">
            <div className="attrSectionProgressTopRow">
              <div className="attrSectionProgressLabel">
                <span className="attrSectionProgressHint">這段是</span>
                <span className="attrSectionProgressCity">{activeCityId ? CITIES[activeCityId]?.label : '—'}</span>
                <span className="attrSectionProgressMeta">{activeCityId ? `${activeCityIdx + 1}/${cityOrder.length}` : '—'}</span>
              </div>
              <div className="attrSectionProgressNav" role="group" aria-label="切換城市">
                <button
                  type="button"
                  className="btn attrSectionProgressNavBtn"
                  onClick={() => prevCityId && scrollToCity(prevCityId)}
                  disabled={!prevCityId}
                  aria-label="上一個城市"
                  title="上一個城市（←）"
                >
                  ←
                </button>
                <button
                  type="button"
                  className="btn attrSectionProgressNavBtn"
                  onClick={() => nextCityId && scrollToCity(nextCityId)}
                  disabled={!nextCityId}
                  aria-label="下一個城市"
                  title="下一個城市（→）"
                >
                  →
                </button>
              </div>
            </div>
            <div className="attrSectionProgressBar" aria-hidden="true">
              <div className="attrSectionProgressBarFill" style={{ width: `${Math.round(cityProgress * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 10 }} />

      <div style={{ display: 'grid', gap: 14 }}>
        {orderedAttractions.map((c) => {
          const cityKey = c.cityId
          const defaultKind = c.sections[0]?.kind
          const activeKind = activeTabByCity[cityKey] ?? defaultKind
          const activeSection = c.sections.find((s) => s.kind === activeKind) ?? c.sections[0]

          return (
            <RevealSection
              key={c.cityId}
              id={`attr-${c.cityId}`}
              cityId={c.cityId as CityId}
              onSeen={progressActions.markAttractionsSeen}
            >
              <div className="card attrCityCard">
                <div className="attrCityCardHeader">
                  <div
                    className="attrCityCardCover"
                    aria-hidden="true"
                    style={{ backgroundImage: `url(${ILLUSTRATION.heroAttractions.src})` }}
                  />
                  <div className="attrCityCardHeaderInner">
                    <div className="attrCityAvatar" aria-hidden="true">
                      {CITIES[c.cityId as CityId]?.label?.slice(0, 1) ?? '城'}
                    </div>
                    <div className="attrCityHeaderText">
                      <div className="attrCityNameRow">
                        <div className="attrCityName">{c.title}</div>
                      </div>
                      <div className="attrCitySub">用章節切換快速掃重點；每個 ### 會變成可折疊卡片（先看摘要，想看再展開）。</div>
                    </div>
                  </div>
                </div>

                <div className="attrCityCardMain">
                  {!activeSection ? null : (
                    <>
                      <div className="attrTabs" role="tablist" aria-label={`${c.title} 章節`}>
                        {c.sections.map((s) => {
                          const isActive = s.kind === activeSection.kind
                          return (
                            <button
                              key={s.kind}
                              type="button"
                              role="tab"
                              aria-selected={isActive}
                              className={`attrTabBtn ${isActive ? 'attrTabBtnActive' : ''}`}
                              onClick={() => setActiveTabByCity((prev) => ({ ...prev, [cityKey]: s.kind }))}
                            >
                              {SECTION_TAB_LABEL[s.kind] ?? s.title}
                            </button>
                          )
                        })}
                      </div>

                      <div className="attrTabPanel" role="tabpanel">
                        <div className="attrTabTitle">{activeSection.title}</div>
                        {!activeSection.content?.trim() ? (
                          <div className="muted" style={{ marginTop: 8 }}>
                            （此章節目前尚無內容）
                          </div>
                        ) : (
                          <AttractionsSpotCards
                            cityId={c.cityId}
                            kind={activeSection.kind}
                            content={activeSection.content}
                            requestedSpotSlug={
                              requestedSpot &&
                              requestedSpot.cityId === c.cityId &&
                              requestedSpot.kind === activeSection.kind
                                ? requestedSpot.slug
                                : null
                            }
                          />
                        )}
                      </div>
                    </>
                  )}

                {extensionsByCity.has(c.cityId) && (
                  <>
                    <div style={{ height: 10 }} />
                    <button
                      className="btn"
                      onClick={() => setOpen((prev) => ({ ...prev, [c.cityId]: !prev[c.cityId] }))}
                      style={{ width: 'fit-content' }}
                    >
                      {open[c.cityId] ? '收起延伸行程' : '延伸行程（多住/備案/周邊一日遊）'}
                    </button>
                    {open[c.cityId] && (
                      <div style={{ marginTop: 10 }}>
                        <div className="card" style={{ boxShadow: 'none' }}>
                          <div className="cardInner">
                            <div style={{ fontWeight: 900 }}>延伸行程（Extensions）</div>
                            <div className="muted" style={{ marginTop: 8 }}>
                              {extensionsByCity.get(c.cityId)?.trips.map((t) => {
                                const summary =
                                  t.sections.find((s) => s.key === 'summary')?.content ??
                                  t.sections.find((s) => s.key === 'notes')?.content ??
                                  ''
                                const excerpt = firstContentSnippet(summary)
                                return (
                                  <div key={t.id} className="card" style={{ boxShadow: 'none', marginTop: 10 }}>
                                    <div className="cardInner">
                                      <div style={{ fontWeight: 900 }}>{t.title}</div>
                                      {excerpt && (
                                        <div className="muted" style={{ marginTop: 6 }}>
                                          {excerpt}
                                        </div>
                                      )}
                                      <div style={{ marginTop: 10 }}>
                                        <button className="btn" onClick={() => setActive({ cityId: c.cityId, tripId: t.id })}>
                                          詳情…
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                </div>
              </div>
            </RevealSection>
          )
        })}
      </div>

      {active && (
        <ExtensionModal
          cityId={active.cityId}
          tripId={active.tripId}
          onClose={() => setActive(null)}
          data={extensionsByCity.get(active.cityId)}
        />
      )}
    </div>
  )
}

function ExtensionModal({
  cityId,
  tripId,
  data,
  onClose,
}: {
  cityId: string
  tripId: string
  data: (typeof EXTENSIONS_DATA)[number] | undefined
  onClose: () => void
}) {
  const trip = data?.trips.find((t) => t.id === tripId)
  if (!trip) return null

  return (
    <Modal
      open
      ariaLabel={trip.title}
      onClose={onClose}
      overlayClassName="modalOverlay modalOverlayHigh"
      cardClassName="card modalCard"
      cardStyle={{ maxWidth: 'min(860px, 100%)' }}
    >
      <div className="cardInner">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
              {CITIES[cityId as keyof typeof CITIES]?.label}
            </div>
            <div style={{ fontWeight: 950, fontSize: 'var(--text-xl)', lineHeight: 1.15, marginTop: 6 }}>
              {trip.title}
            </div>
          </div>
        </div>

        <hr className="hr" />

        <div style={{ display: 'grid', gap: 10 }}>
          {trip.sections.map((s) => (
            <section
              key={s.key}
              className="card expStatic"
              style={{ boxShadow: 'none' }}
              aria-label={s.title}
            >
              <div className="expHeader expHeaderRow">
                <span className="expHeaderTitle">
                  <span className="attrSectionTitleRow">
                    <span className="attrSectionTitleText">{s.title}</span>
                  </span>
                </span>
              </div>
              <div className="expStaticBody">
                <RichContent
                  content={s.content}
                  className="attrProse"
                />
              </div>
            </section>
          ))}
        </div>
      </div>
    </Modal>
  )
}

function RevealSection({
  id,
  cityId,
  onSeen,
  children,
}: {
  id: string
  cityId: CityId
  onSeen: (cityId: CityId) => void
  children: React.ReactNode
}) {
  const ref = useReveal<HTMLElement>()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          onSeen(cityId)
          io.unobserve(e.target)
        }
      },
      { root: null, rootMargin: '0px 0px -30% 0px', threshold: 0.25 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [onSeen, cityId, ref])
  return (
    <section id={id} data-city-id={cityId} className="reveal attrCitySection" ref={ref}>
      {children}
    </section>
  )
}

