import type { CSSProperties } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FormattedInline } from './FormattedText'
import { withBaseUrl } from '../utils/asset'

export type TextCarouselItem = {
  title: string
  summary: string
  imageSrc?: string
  onOpen?: () => void
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
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
  const [itemsPerView, setItemsPerView] = useState<number>(() => computeItemsPerView())
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const onResize = () => setItemsPerView(computeItemsPerView())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const canGoPrev = currentIndex > 0
  const canGoNext = currentIndex < Math.max(0, items.length - 1)

  const scrollToIndex = useCallback((idx: number) => {
    const el = itemRefs.current[idx]
    if (!el) return
    el.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'start',
    })
  }, [])

  useEffect(() => {
    scrollToIndex(currentIndex)
  }, [currentIndex, itemsPerView, scrollToIndex])

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
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return
      if (target?.closest('[role="dialog"]')) return

      if (e.key === 'ArrowLeft') {
        if (!canGoPrev) return
        e.preventDefault()
        setCurrentIndex((i) => Math.max(0, i - 1))
      }
      if (e.key === 'ArrowRight') {
        if (!canGoNext) return
        e.preventDefault()
        setCurrentIndex((i) => Math.min(Math.max(0, items.length - 1), i + 1))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canGoNext, canGoPrev, items.length])

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
              onClick={() => canGoPrev && setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={!canGoPrev}
              aria-label="上一張"
              data-testid={testId ? `${testId}-prev` : undefined}
            >
              ←
            </button>
            <button
              type="button"
              className="btn textCarouselNavBtn"
              onClick={() => canGoNext && setCurrentIndex((i) => Math.min(Math.max(0, items.length - 1), i + 1))}
              disabled={!canGoNext}
              aria-label="下一張"
              data-testid={testId ? `${testId}-next` : undefined}
            >
              →
            </button>
          </div>
        </div>

        <div
          ref={viewportRef}
          className="textCarouselViewport"
          aria-label="可左右滑動的卡片列"
          style={{ ['--items-per-view' as never]: itemsPerView } as CSSProperties}
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
                      <img src={withBaseUrl(it.imageSrc ?? '')} alt="" loading="lazy" />
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

