import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { titleZhOnly } from '../utils/titleZhOnly'
import { ILLUSTRATION } from '../illustrations'

export type ImageCarouselImage = {
  src: string
  alt?: string
}

type Layout = { cols: number }

function computeLayout(): Layout {
  if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return { cols: 2 }
  if (window.matchMedia('(max-width: 520px)').matches) return { cols: 1 }
  if (window.matchMedia('(max-width: 860px)').matches) return { cols: 2 }
  return { cols: 3 }
}

export function ImageCarouselCard({
  title,
  images,
  onOpenImage,
  testId,
}: {
  title?: string
  images: ImageCarouselImage[]
  onOpenImage?: (src: string, title: string) => void
  testId?: string
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [layout, setLayout] = useState<Layout>(() => computeLayout())
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const onResize = () => setLayout(computeLayout())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const cols = Math.max(1, Math.min(layout.cols, images.length || 1))
  const maxStartIndex = useMemo(() => Math.max(0, images.length - cols), [cols, images.length])
  const safeIndex = Math.min(maxStartIndex, Math.max(0, currentIndex))
  const canGoPrev = safeIndex > 0
  const canGoNext = safeIndex < maxStartIndex

  const headerTitle = useMemo(() => {
    const t = (title ?? '').trim()
    return t ? titleZhOnly(t) : '圖庫'
  }, [title])

  const scrollToIndex = useCallback((idx: number, behavior?: ScrollBehavior) => {
    const viewport = viewportRef.current
    const el = itemRefs.current[idx]
    if (!viewport || !el) return
    try {
      viewport.scrollTo({ left: el.offsetLeft, behavior: behavior ?? 'smooth' })
    } catch {
      el.scrollIntoView({ behavior: behavior ?? 'smooth', block: 'nearest', inline: 'start' })
    }
  }, [])

  const stepBy = useCallback(
    (delta: -1 | 1) => {
      setCurrentIndex((i) => {
        const next = Math.min(maxStartIndex, Math.max(0, i + delta))
        if (next !== i) scrollToIndex(next, 'auto')
        return next
      })
    },
    [maxStartIndex, scrollToIndex],
  )

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

  if (images.length === 0) return null

  return (
    <section className="card imageCarousel" data-testid={testId} aria-label={`${headerTitle}（左右滑動）`}>
      <div className="cardInner imageCarouselInner">
        <div className="imageCarouselHeader">
          <div className="imageCarouselHeaderText">
            <div className="imageCarouselTitle">{headerTitle}</div>
            <div className="muted imageCarouselMeta">
              {Math.min(images.length, safeIndex + 1)}/{images.length}
            </div>
          </div>
          <div className="imageCarouselHeaderActions" role="group" aria-label="切換圖片">
            <button
              type="button"
              className="btn imageCarouselNavBtn"
              onClick={() => canGoPrev && stepBy(-1)}
              disabled={!canGoPrev}
              aria-label="上一張"
            >
              ←
            </button>
            <button
              type="button"
              className="btn imageCarouselNavBtn"
              onClick={() => canGoNext && stepBy(1)}
              disabled={!canGoNext}
              aria-label="下一張"
            >
              →
            </button>
          </div>
        </div>

        <div
          ref={viewportRef}
          className="imageCarouselViewport"
          aria-label="可左右滑動的圖片列"
          style={{ ['--items-per-view' as never]: cols } as React.CSSProperties}
        >
          <div className="imageCarouselTrack">
            {images.map((im, idx) => {
              const alt = (im.alt ?? headerTitle).trim() || headerTitle
              const titleForLightbox = titleZhOnly(`${headerTitle}（${idx + 1}/${images.length}）`)
              return (
                <button
                  key={`${im.src}-${idx}`}
                  type="button"
                  className="imageCarouselItem"
                  ref={(el) => {
                    itemRefs.current[idx] = el
                  }}
                  onClick={() => onOpenImage?.(im.src, titleForLightbox)}
                  aria-label={`查看大圖：${titleForLightbox}`}
                  title="點擊放大"
                >
                  <img
                    className="imageCarouselImg"
                    src={im.src}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    onError={(e) => {
                      // External placeholder services can fail; keep the carousel visually stable.
                      const img = e.currentTarget
                      if (img.dataset.fallbackApplied === '1') return
                      img.dataset.fallbackApplied = '1'
                      img.src = ILLUSTRATION.signpost.src
                    }}
                  />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

