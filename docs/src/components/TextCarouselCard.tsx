import type { CSSProperties } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FormattedInline } from './FormattedText'
import { withBaseUrl } from '../utils/asset'
import { prefersReducedMotion } from '../utils/motion'

export type TextCarouselItem = {
  title: string
  summary: string
  imageSrc?: string
  onOpen?: () => void
}

function computeItemsPerView() {
  if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return 3
  if (window.matchMedia('(max-width: 520px)').matches) return 1
  if (window.matchMedia('(max-width: 860px)').matches) return 2
  return 3
}

export function TextCarouselCard({
  title,
  subtitle,
  items,
  testId,
}: {
  title: string
  subtitle?: string
  items: TextCarouselItem[]
  testId?: string
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])
  const prevBtnRef = useRef<HTMLButtonElement | null>(null)
  const nextBtnRef = useRef<HTMLButtonElement | null>(null)
  const [itemsPerView, setItemsPerView] = useState<number>(() => computeItemsPerView())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{
    active: boolean
    pointerId: number | null
    startX: number
    startScrollLeft: number
    didDrag: boolean
    suppressClick: boolean
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
    didDrag: false,
    suppressClick: false,
  })

  useEffect(() => {
    const onResize = () => setItemsPerView(computeItemsPerView())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // When we show multiple items at once, the "last meaningful start index" is
  // (items.length - itemsPerView). This prevents the Next button from becoming
  // misleading / no-op on wide viewports.
  const maxStartIndex = useMemo(() => Math.max(0, items.length - itemsPerView), [items.length, itemsPerView])
  // Derive a safe index instead of synchronously setting state in an effect.
  // This avoids cascading renders and keeps UI logic stable when the viewport changes.
  const safeIndex = Math.min(maxStartIndex, Math.max(0, currentIndex))
  const canGoPrev = safeIndex > 0
  const canGoNext = safeIndex < maxStartIndex

  const scrollToIndex = useCallback((idx: number, behavior?: ScrollBehavior) => {
    const viewport = viewportRef.current
    const el = itemRefs.current[idx]
    if (!viewport || !el) return

    // More reliable than `scrollIntoView` for horizontal carousels (notably Safari/iOS).
    const left = el.offsetLeft
    const b: ScrollBehavior = behavior ?? (prefersReducedMotion() ? 'auto' : 'smooth')
    try {
      viewport.scrollTo({ left, behavior: b })
    } catch {
      // Fallback for older browsers
      el.scrollIntoView({
        behavior: b,
        block: 'nearest',
        inline: 'start',
      })
    }
  }, [])

  const stepBy = useCallback(
    (delta: -1 | 1) => {
      setCurrentIndex((i) => {
        const next = Math.min(maxStartIndex, Math.max(0, i + delta))
        // Use instant jumps for button/keyboard navigation to avoid a feedback loop where
        // a scroll listener briefly "wins" before smooth scrolling moves the viewport.
        if (next !== i) scrollToIndex(next, 'auto')
        return next
      })
    },
    [maxStartIndex, scrollToIndex],
  )

  // Defensive: in some mobile browsers, React's synthetic click on these small nav buttons
  // can be flaky under heavy scroll/gesture interaction. Attach native listeners so the
  // arrows always work.
  useEffect(() => {
    const prevEl = prevBtnRef.current
    const nextEl = nextBtnRef.current
    if (!prevEl || !nextEl) return

    const onPrev = (e: MouseEvent) => {
      if (!canGoPrev) return
      e.preventDefault()
      stepBy(-1)
    }
    const onNext = (e: MouseEvent) => {
      if (!canGoNext) return
      e.preventDefault()
      stepBy(1)
    }

    prevEl.addEventListener('click', onPrev)
    nextEl.addEventListener('click', onNext)
    return () => {
      prevEl.removeEventListener('click', onPrev)
      nextEl.removeEventListener('click', onNext)
    }
  }, [canGoNext, canGoPrev, stepBy])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const left = viewport.scrollLeft
        let best = 0
        let bestDist = Number.POSITIVE_INFINITY
        for (let i = 0; i < itemRefs.current.length; i++) {
          const el = itemRefs.current[i]
          if (!el) continue
          const dist = Math.abs(el.offsetLeft - left)
          if (dist < bestDist) {
            bestDist = dist
            best = i
          }
        }
        setCurrentIndex((prev) => (prev === best ? prev : best))
      })
    }

    viewport.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      viewport.removeEventListener('scroll', onScroll)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return
      if (target?.closest('[role="dialog"]')) return

      if (e.key === 'ArrowLeft') {
        if (!canGoPrev) return
        e.preventDefault()
        stepBy(-1)
      }
      if (e.key === 'ArrowRight') {
        if (!canGoNext) return
        e.preventDefault()
        stepBy(1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canGoNext, canGoPrev, stepBy])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    // Only left-click should start a drag.
    if (e.button !== 0) return

    // If the user is interacting with a control inside a card (e.g. the "詳情…" button
    // or a nested link), do not start a drag session. Otherwise, a tiny pointer move
    // can be interpreted as a drag and suppress the click.
    const target = e.target as HTMLElement | null
    if (target?.closest('button, a, input, textarea, select, [role="button"]')) return

    const viewport = viewportRef.current
    if (!viewport) return

    dragRef.current.active = true
    dragRef.current.pointerId = e.pointerId
    dragRef.current.startX = e.clientX
    dragRef.current.startScrollLeft = viewport.scrollLeft
    dragRef.current.didDrag = false
    setIsDragging(false)

    // Keep receiving move/up even if pointer leaves the viewport.
    try {
      viewport.setPointerCapture(e.pointerId)
    } catch {
      // ignore (older browsers)
    }
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const viewport = viewportRef.current
    if (!viewport) return
    if (!dragRef.current.active) return
    if (dragRef.current.pointerId !== e.pointerId) return

    const dx = e.clientX - dragRef.current.startX
    const DRAG_THRESHOLD_PX = 6

    if (!dragRef.current.didDrag) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX) return
      dragRef.current.didDrag = true
      setIsDragging(true)
    }

    // Prevent text selection and native drag behaviors while dragging.
    e.preventDefault()
    viewport.scrollLeft = dragRef.current.startScrollLeft - dx
  }, [])

  const endDrag = useCallback((pointerId: number) => {
    const viewport = viewportRef.current
    if (viewport) {
      try {
        viewport.releasePointerCapture(pointerId)
      } catch {
        // ignore
      }
    }

    const didDrag = dragRef.current.didDrag
    dragRef.current.active = false
    dragRef.current.pointerId = null
    dragRef.current.startX = 0
    dragRef.current.startScrollLeft = 0
    dragRef.current.didDrag = false
    setIsDragging(false)

    if (didDrag) {
      // Suppress the synthetic click fired after a drag.
      dragRef.current.suppressClick = true
      window.setTimeout(() => {
        dragRef.current.suppressClick = false
      }, 0)
    }
  }, [])

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== 'mouse') return
      if (!dragRef.current.active) return
      if (dragRef.current.pointerId !== e.pointerId) return
      endDrag(e.pointerId)
    },
    [endDrag],
  )

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== 'mouse') return
      if (!dragRef.current.active) return
      if (dragRef.current.pointerId !== e.pointerId) return
      endDrag(e.pointerId)
    },
    [endDrag],
  )

  const onClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current.suppressClick) return
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const headerSubtitle = useMemo(() => {
    const s = (subtitle ?? '').trim()
    if (!s) return null
    return s
  }, [subtitle])

  if (items.length === 0) return null

  return (
    <section className="card textCarousel" data-testid={testId}>
      <div className="cardInner textCarouselInner">
        <div className="textCarouselHeader">
          <div className="textCarouselHeaderText">
            <div className="textCarouselTitle">{title}</div>
            {headerSubtitle ? <div className="muted textCarouselSubtitle">{headerSubtitle}</div> : null}
          </div>
          <div className="textCarouselHeaderActions" role="group" aria-label="切換卡片">
            <button
              type="button"
              className="btn textCarouselNavBtn"
              onClick={() => canGoPrev && stepBy(-1)}
              disabled={!canGoPrev}
              aria-label="上一張"
              data-testid={testId ? `${testId}-prev` : undefined}
              ref={prevBtnRef}
            >
              ←
            </button>
            <button
              type="button"
              className="btn textCarouselNavBtn"
              onClick={() => canGoNext && stepBy(1)}
              disabled={!canGoNext}
              aria-label="下一張"
              data-testid={testId ? `${testId}-next` : undefined}
              ref={nextBtnRef}
            >
              →
            </button>
          </div>
        </div>

        <div
          ref={viewportRef}
          className={`textCarouselViewport ${isDragging ? 'isDragging' : ''}`}
          aria-label="可左右滑動的卡片列"
          style={{ ['--items-per-view' as never]: itemsPerView } as CSSProperties}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onClickCapture={onClickCapture}
        >
          <div className="textCarouselTrack">
            {items.map((it, idx) => {
              const hasImage = !!it.imageSrc
              return (
                <div
                  key={`${it.title}-${idx}`}
                  className={`textCarouselItem ${hasImage ? 'textCarouselItemHasImage' : 'textCarouselItemNoImage'}`}
                  ref={(el) => {
                    itemRefs.current[idx] = el
                  }}
                >
                  {hasImage ? (
                    <div className="textCarouselMedia" aria-hidden="true">
                      <img src={withBaseUrl(it.imageSrc ?? '')} alt="" loading="lazy" draggable={false} />
                    </div>
                  ) : null}
                  <div className="textCarouselBody">
                    <div className="textCarouselItemTitle clamp2">
                      <FormattedInline text={it.title} />
                    </div>
                    <div className="muted textCarouselItemSummary clamp3">
                      <FormattedInline text={it.summary} />
                    </div>
                    {it.onOpen ? (
                      <div className="textCarouselItemActions">
                        <button
                          type="button"
                          className="btn btnPrimary"
                          onClick={it.onOpen}
                          aria-label={`詳情：${it.title}`}
                        >
                          詳情…
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="muted textCarouselHint">
          {itemsPerView === 1 ? '左右滑動或用 ←/→ 切換；點「詳情…」看完整。' : '用 ←/→ 切換；點「詳情…」看完整。'}
        </div>
      </div>
    </section>
  )
}

