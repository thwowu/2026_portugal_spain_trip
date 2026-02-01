import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ATTRACTIONS_DATA, EXTENSIONS_DATA, ITINERARY_PHASES } from '../generated'
import { CITIES, STAYS_CITY_ORDER } from '../data/core'
import type { CityId } from '../data/core'
import { useProgress } from '../state/progress'
import { useHashScroll } from '../hooks/useHashScroll'
import { useReveal } from '../hooks/useReveal'
import { Lightbox } from '../components/Lightbox'
import { GalleryLightbox, type GalleryImage } from '../components/GalleryLightbox'
import { Modal } from '../components/Modal'
import { ILLUSTRATION } from '../illustrations'
import { PageHero } from '../components/PageHero'
import { RichContent } from '../components/RichContent'
import { firstContentSnippet } from '../utils/richContentSnippet'
import { FormattedInline } from '../components/FormattedText'
import { TextCarouselCard } from '../components/TextCarouselCard'
import { ZigzagTimeline } from '../components/ZigzagTimeline'
import { extractH3CarouselItems, stripCardLinesFromContent } from '../utils/extractCarouselItems'

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

const TOOLBOX_KINDS = new Set(['food', 'safety', 'practical'])

function cityIdFromItineraryCityLabel(label: string): CityId | null {
  const s = (label ?? '').trim().toLowerCase()
  // We match both Chinese and English (in case content changes later).
  if (s.includes('sintra') || s.includes('辛特拉')) return 'sintra'
  if (s.includes('lisbon') || s.includes('里斯本')) return 'lisbon'
  if (s.includes('lagos') || s.includes('拉狗')) return 'lagos'
  if (s.includes('seville') || s.includes('塞維爾')) return 'seville'
  if (s.includes('granada') || s.includes('格拉納達')) return 'granada'
  if (s.includes('madrid') || s.includes('馬德里')) return 'madrid'
  return null
}

// City order should follow the itinerary's day sequence (including day trips like Sintra).
const ITINERARY_CITY_ORDER: CityId[] = (() => {
  const out: CityId[] = []
  const seen = new Set<CityId>()

  for (const phase of ITINERARY_PHASES) {
    for (const d of phase.days) {
      const id = cityIdFromItineraryCityLabel(d.cityLabel)
      if (!id || seen.has(id)) continue
      out.push(id)
      seen.add(id)
    }
  }

  // Ensure we include any attraction cities even if label matching fails.
  for (const c of ATTRACTIONS_DATA) {
    const id = c.cityId as CityId
    if (seen.has(id)) continue
    out.push(id)
    seen.add(id)
  }

  // Final fallback (should never happen): keep the old stays-based order.
  if (out.length === 0) return [...(STAYS_CITY_ORDER as unknown as CityId[])]
  return out
})()

// If a section is extremely long, offer a dedicated reading modal.
// (2500 chars ~= a few screens on mobile; tuned for our current content.)
const LONG_SECTION_MODAL_THRESHOLD_CHARS = 2500

type LongReadModalState = {
  ariaLabel: string
  headerTitle: string
  headerSub?: string
  content: string
}

// Keep Attractions city order aligned with the itinerary.
const DEFAULT_ATTRACTIONS_CITY_ID: CityId | null = (() => {
  for (const id of ITINERARY_CITY_ORDER) {
    if (ATTRACTIONS_DATA.some((c) => c.cityId === id)) return id
  }
  return (ATTRACTIONS_DATA[0]?.cityId as CityId) ?? null
})()

export function AttractionsPage() {
  const { actions: progressActions } = useProgress()
  useHashScroll()
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [active, setActive] = useState<{ cityId: string; tripId: string } | null>(null)
  const [longRead, setLongRead] = useState<LongReadModalState | null>(null)
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null)
  const [gallery, setGallery] = useState<{ title: string; images: GalleryImage[]; index: number } | null>(null)
  const [activeCityId, setActiveCityId] = useState<CityId | null>(DEFAULT_ATTRACTIONS_CITY_ID)
  const [activeTabByCity, setActiveTabByCity] = useState<Record<string, string>>({})
  const [cityProgress, setCityProgress] = useState(0)

  const extensionsByCity = useMemo(() => {
    const m = new Map<string, (typeof EXTENSIONS_DATA)[number]>()
    for (const c of EXTENSIONS_DATA) m.set(c.cityId, c)
    return m
  }, [])

  const orderedAttractions = useMemo(() => {
    const byId = new Map<CityId, (typeof ATTRACTIONS_DATA)[number]>()
    for (const c of ATTRACTIONS_DATA) byId.set(c.cityId as CityId, c)

    const ordered: (typeof ATTRACTIONS_DATA) = []
    // 1) Primary order: same as itinerary day sequence
    for (const id of ITINERARY_CITY_ORDER) {
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
    // Avoid stealing keys when modals/lightboxes are open.
    if (active || longRead || lightbox || gallery) return

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
  }, [active, gallery, lightbox, longRead, nextCityId, prevCityId, scrollToCity])

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

  return (
    <div className="container pageAttractions">
      <h1 className="srOnly">景點（Attractions）</h1>
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
          const visibleSections = c.sections.filter((s) => !TOOLBOX_KINDS.has(s.kind))
          const defaultKind = visibleSections[0]?.kind ?? c.sections[0]?.kind
          const wantedKind = activeTabByCity[cityKey] ?? defaultKind
          const activeKind = TOOLBOX_KINDS.has(wantedKind) ? defaultKind : wantedKind
          const activeSection = c.sections.find((s) => s.kind === activeKind) ?? visibleSections[0] ?? c.sections[0]
          const sectionContent = activeSection?.content ?? ''
          const cleanedSectionContent = stripCardLinesFromContent(sectionContent)
          const canOpenLongRead = !!cleanedSectionContent.trim() && cleanedSectionContent.trim().length >= LONG_SECTION_MODAL_THRESHOLD_CHARS

          const toolboxSections = {
            food: c.sections.find((s) => s.kind === 'food'),
            safety: c.sections.find((s) => s.kind === 'safety'),
            practical: c.sections.find((s) => s.kind === 'practical'),
          }

          return (
            <RevealSection
              key={c.cityId}
              id={`attr-${c.cityId}`}
              cityId={c.cityId as CityId}
              onSeen={progressActions.markAttractionsSeen}
              testId={`attr-city-${c.cityId}`}
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
                      <div className="attrCitySub">用章節切換快速掃重點（不做每段卡片）。</div>
                    </div>
                  </div>
                </div>

                <div className="attrCityCardMain">
                  {!activeSection ? null : (
                    <>
                      <div className="attrTabs" role="tablist" aria-label={`${c.title} 章節`}>
                        {visibleSections.map((s) => {
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

                        {!cleanedSectionContent.trim() ? (
                          <div className="muted" style={{ marginTop: 8 }}>
                            （此章節目前尚無內容）
                          </div>
                        ) : (
                          <>
                            {activeSection.kind === 'routes' ? (
                              <>
                                <ZigzagTimeline
                                  testId={`routes-timeline-${c.cityId}`}
                                  items={extractH3CarouselItems(sectionContent, { snippetMaxLen: 140 }).map((it) => ({
                                    title: it.title,
                                    summary: it.summary,
                                    content: it.content,
                                    onOpen: () =>
                                      setLongRead({
                                        ariaLabel: `${c.title}｜${activeSection.title}｜${it.title}`,
                                        headerTitle: it.title,
                                        headerSub: c.title,
                                        content: it.content,
                                      }),
                                  }))}
                                />
                                <div style={{ marginTop: 10 }}>
                                  <button
                                    type="button"
                                    className="btn"
                                    onClick={() =>
                                      setLongRead({
                                        ariaLabel: `${c.title}｜${activeSection.title}`,
                                        headerTitle: activeSection.title,
                                        headerSub: c.title,
                                        content: cleanedSectionContent,
                                      })
                                    }
                                  >
                                    看完整段落…
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                {(() => {
                                  const items = extractH3CarouselItems(sectionContent, { snippetMaxLen: 140 })
                                  if (items.length < 3) return null
                                  return (
                                    <div style={{ marginTop: 10 }}>
                                      <TextCarouselCard
                                        title="快速掃重點"
                                        subtitle="左右滑動；需要細節再點開。"
                                        items={items.map((it) => ({
                                          title: it.title,
                                          summary: it.summary,
                                          imageSrc: it.imageSrc,
                                          onOpen: () =>
                                            setLongRead({
                                              ariaLabel: `${c.title}｜${activeSection.title}｜${it.title}`,
                                              headerTitle: it.title,
                                              headerSub: c.title,
                                              content: it.content,
                                            }),
                                        }))}
                                        testId={`attr-carousel-${c.cityId}-${activeSection.kind}`}
                                      />
                                      <div style={{ marginTop: 10 }}>
                                        <button
                                          type="button"
                                          className="btn"
                                          onClick={() =>
                                            setLongRead({
                                              ariaLabel: `${c.title}｜${activeSection.title}`,
                                              headerTitle: activeSection.title,
                                              headerSub: c.title,
                                              content: cleanedSectionContent,
                                            })
                                          }
                                        >
                                          看完整段落…
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })()}

                                {canOpenLongRead && extractH3CarouselItems(sectionContent).length < 3 ? (
                                  <div style={{ marginBottom: 10 }}>
                                    <button
                                      type="button"
                                      className="btn"
                                      onClick={() =>
                                        setLongRead({
                                          ariaLabel: `${c.title}｜${activeSection.title}`,
                                          headerTitle: activeSection.title,
                                          headerSub: c.title,
                                          content: cleanedSectionContent,
                                        })
                                      }
                                    >
                                      開啟詳情…
                                    </button>
                                  </div>
                                ) : null}

                                {extractH3CarouselItems(sectionContent).length < 3 ? (
                                  <RichContent
                                    content={cleanedSectionContent}
                                    className="longformGrid prose attrProse"
                                    onOpenImage={(src, title) => setLightbox({ src, title })}
                                    onOpenGallery={(images, title) => setGallery({ images, title, index: 0 })}
                                  />
                                ) : null}
                              </>
                            )}
                          </>
                        )}
                      </div>

                      <div className="attrToolbox" data-testid={`attr-toolbox-${c.cityId}`}>
                        <div className="attrToolboxHeader">
                          <div className="attrToolboxTitle">工具箱</div>
                          <div className="muted attrToolboxSub">Food / Safety / Practical（點開看完整）</div>
                        </div>
                        <div className="attrToolboxRow" aria-label={`${c.title} 工具箱（左右滑動）`}>
                          {(
                            [
                              { kind: 'food', title: '吃什麼', section: toolboxSections.food },
                              { kind: 'safety', title: '安全提醒', section: toolboxSections.safety },
                              { kind: 'practical', title: '實用資訊', section: toolboxSections.practical },
                            ] as const
                          ).map((t) => {
                            const content = stripCardLinesFromContent(t.section?.content ?? '')
                            const excerpt = firstContentSnippet(content, 90)
                            return (
                              <button
                                key={`${c.cityId}-${t.kind}`}
                                type="button"
                                className="card attrToolboxCard"
                                onClick={() =>
                                  setLongRead({
                                    ariaLabel: `${c.title}｜${t.title}`,
                                    headerTitle: t.title,
                                    headerSub: c.title,
                                    content,
                                  })
                                }
                                aria-label={`${t.title}（開啟）`}
                              >
                                <div className="cardInner attrToolboxCardInner">
                                  <div className="attrToolboxCardTitle">{t.title}</div>
                                  {excerpt ? (
                                    <div className="muted attrToolboxCardExcerpt clamp3">
                                      <FormattedInline text={excerpt} />
                                    </div>
                                  ) : null}
                                  <div className="attrToolboxCardMeta muted">點開看完整…</div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
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
          onOpenImage={(src, title) => setLightbox({ src, title })}
          onOpenGallery={(images, title) => setGallery({ images, title, index: 0 })}
        />
      )}

      {longRead && (
        <ModalSplitCard
          ariaLabel={longRead.ariaLabel}
          headerTitle={longRead.headerTitle}
          headerSub={longRead.headerSub}
          onClose={() => setLongRead(null)}
          cardStyle={{ maxWidth: 'min(860px, 100%)' }}
          bodyTestId="attractions-longread-body"
          progressTestId="attractions-longread-progress"
          footer={
            <>
              <button className="btn" type="button" onClick={() => setLongRead(null)}>
                關閉
              </button>
              <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                （ESC 也可關閉）
              </div>
            </>
          }
        >
          <RichContent
            content={stripCardLinesFromContent(longRead.content)}
            className="longformGrid prose attrProse"
            showToc
            onOpenImage={(src, title) => setLightbox({ src, title })}
            onOpenGallery={(images, title) => setGallery({ images, title, index: 0 })}
          />
        </ModalSplitCard>
      )}

      <GalleryLightbox
        open={!!gallery}
        title={gallery?.title}
        images={gallery?.images ?? []}
        initialIndex={gallery?.index ?? 0}
        onClose={() => setGallery(null)}
      />

      <Lightbox
        open={!!lightbox}
        src={lightbox?.src ?? ''}
        alt={lightbox?.title ?? '圖片'}
        title={lightbox?.title}
        onClose={() => setLightbox(null)}
      />
    </div>
  )
}

function ModalSplitCard({
  ariaLabel,
  headerTitle,
  headerSub,
  onClose,
  overlayClassName = 'modalOverlay modalOverlayHigh',
  cardStyle,
  bodyTestId,
  progressTestId,
  footer,
  children,
}: {
  ariaLabel: string
  headerTitle: string
  headerSub?: string
  onClose: () => void
  overlayClassName?: string
  cardStyle?: React.CSSProperties
  bodyTestId?: string
  progressTestId?: string
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  const [scrollProgress, setScrollProgress] = useState(0)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  const computeProgress = () => {
    const el = bodyRef.current
    if (!el) return
    const denom = el.scrollHeight - el.clientHeight
    const p = denom <= 0 ? 1 : Math.min(1, Math.max(0, el.scrollTop / denom))
    setScrollProgress(p)
  }

  useEffect(() => {
    const raf = window.requestAnimationFrame(computeProgress)
    return () => window.cancelAnimationFrame(raf)
    // Recompute on open/content change signaled via ariaLabel changes.
  }, [ariaLabel])

  return (
    <Modal
      open
      ariaLabel={ariaLabel}
      onClose={onClose}
      overlayClassName={overlayClassName}
      cardClassName="card modalCard modalCardSplit"
      cardStyle={cardStyle}
    >
      <div className="modalCardSplitHeader">
        <div className="modalCardSplitHeaderTitle">{headerTitle}</div>
        {headerSub ? <div className="modalCardSplitHeaderSub">{headerSub}</div> : null}
      </div>

      <div ref={bodyRef} className="modalCardSplitBody" onScroll={computeProgress} data-testid={bodyTestId}>
        {children}
      </div>

      <div className="modalCardSplitProgressTrack" aria-hidden="true">
        <div
          className="modalCardSplitProgressFill"
          style={{ width: `${Math.round(scrollProgress * 100)}%` }}
          data-testid={progressTestId}
        />
      </div>

      <div className="modalCardSplitFooter">
        {footer ?? (
          <>
            <button className="btn" type="button" onClick={onClose}>
              關閉
            </button>
            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
              （ESC 也可關閉）
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

function ExtensionModal({
  cityId,
  tripId,
  data,
  onClose,
  onOpenImage,
  onOpenGallery,
}: {
  cityId: string
  tripId: string
  data: (typeof EXTENSIONS_DATA)[number] | undefined
  onClose: () => void
  onOpenImage?: (src: string, title: string) => void
  onOpenGallery?: (images: GalleryImage[], title: string) => void
}) {
  const trip = data?.trips.find((t) => t.id === tripId)
  if (!trip) return null

  return (
    <ModalSplitCard
      ariaLabel={trip.title}
      headerTitle={trip.title}
      headerSub={CITIES[cityId as keyof typeof CITIES]?.label}
      onClose={onClose}
      cardStyle={{ maxWidth: 'min(860px, 100%)' }}
      bodyTestId="extensions-modal-body"
      progressTestId="extensions-modal-progress"
    >
      <div style={{ display: 'grid', gap: 10 }}>
        {trip.sections.map((s) => (
          <section key={s.key} className="card expStatic" style={{ boxShadow: 'none' }} aria-label={s.title}>
            <div className="expHeader expHeaderRow">
              <span className="expHeaderTitle">
                <span className="attrSectionTitleRow">
                  <span className="attrSectionTitleText">{s.title}</span>
                </span>
              </span>
            </div>
            <div className="expStaticBody">
              {(() => {
                const raw = s.content ?? ''
                const items = extractH3CarouselItems(raw, { snippetMaxLen: 140 })
                if (items.length >= 2) {
                  return (
                    <ZigzagTimeline
                      items={items.map((it) => ({
                        title: it.title,
                        summary: it.summary,
                        content: it.content,
                      }))}
                    />
                  )
                }
                return (
                  <RichContent
                    content={stripCardLinesFromContent(raw)}
                    className="longformGrid prose attrProse"
                    onOpenImage={onOpenImage}
                    onOpenGallery={onOpenGallery}
                  />
                )
              })()}
            </div>
          </section>
        ))}
      </div>
    </ModalSplitCard>
  )
}

function RevealSection({
  id,
  cityId,
  onSeen,
  testId,
  children,
}: {
  id: string
  cityId: CityId
  onSeen: (cityId: CityId) => void
  testId?: string
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
    <section id={id} data-city-id={cityId} data-testid={testId} className="reveal attrCitySection" ref={ref}>
      {children}
    </section>
  )
}

