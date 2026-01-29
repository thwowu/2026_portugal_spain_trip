import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadJson, saveJson } from '../state/storage'
import { firstContentSnippet } from '../utils/richContentSnippet'
import { withBaseUrl } from '../utils/asset'
import { RichContent } from './RichContent'

const STORAGE_KEY = 'tripPlanner.attractions.spotCards.v1'

const GALLERY_TOKEN_RE = /\{\{gallery(?::([^|}]+))?\|([^}]+)\}\}/g
const IMAGE_MD_RE = /^!\[([^\]]*)\]\((.+)\)$/
const MD_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/

type Persisted = {
  openByKey: Record<string, boolean>
}

type MediaItem = { src: string; alt?: string }

type Spot = {
  key: string
  slug: string
  rawHeading: string
  titleText: string
  metaText: string
  mapsHref: string | null
  bodyRaw: string
  bodyForRich: string
  media: MediaItem[]
}

function isSpotHeading(line: string) {
  const t = (line ?? '').trim()
  return /^###\s*\S/.test(t)
}

function stripMarkdownLinks(s: string) {
  // Replace [label](href) with label for stable keying.
  return (s ?? '').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1')
}

function normalizeTitleForKey(s: string) {
  return stripMarkdownLinks(s)
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(s: string) {
  // Keep ASCII alphanumerics; fall back to a short stable hash-like slug if needed.
  const base = normalizeTitleForKey(s).toLowerCase()
  const ascii = base
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (ascii) return ascii
  // Non-latin titles: keep a compact, deterministic fallback.
  let h = 0
  for (const ch of base) h = (h * 31 + ch.codePointAt(0)!) >>> 0
  return `spot-${h.toString(36)}`
}

function extractMapsLink(rawHeading: string): { titleText: string; mapsHref: string | null } {
  const h = (rawHeading ?? '').trim()
  const m = MD_LINK_RE.exec(h)
  if (!m) return { titleText: stripMarkdownLinks(h), mapsHref: null }

  const label = (m[1] ?? '').trim()
  const href = (m[2] ?? '').trim()
  const safe = href.startsWith('http://') || href.startsWith('https://') ? href : null
  // Replace the markdown link with its label.
  const titleText = (h.slice(0, m.index) + label + h.slice(m.index + m[0].length)).trim()
  return { titleText, mapsHref: safe }
}

function extractTrailingMeta(titleText: string): { titleText: string; metaText: string } {
  // Prefer full-width parentheses used in our zh-TW content; fall back to ASCII.
  const t = (titleText ?? '').trim()
  const m = /(（[^）]+）|\([^)\n]+\))\s*$/.exec(t)
  if (!m) return { titleText: t, metaText: '' }
  const metaText = (m[1] ?? '').trim()
  const head = t.slice(0, m.index).trim()
  if (!head) return { titleText: t, metaText: '' }
  return { titleText: head, metaText }
}

function parseMediaAndStripBody(bodyRaw: string): { media: MediaItem[]; bodyForRich: string } {
  const lines = (bodyRaw ?? '').replace(/\r\n/g, '\n').split('\n')
  const media: MediaItem[] = []
  const out: string[] = []

  const pushMedia = (src: string, alt?: string) => {
    const s = withBaseUrl((src ?? '').trim())
    if (!s) return
    if (media.some((m) => m.src === s)) return
    media.push({ src: s, alt })
  }

  for (const line of lines) {
    const t = (line ?? '').trim()
    if (!t) {
      out.push(line)
      continue
    }

    // Gallery tokens: extract all urls and remove token from RichContent.
    if (t.startsWith('{{gallery')) {
      for (const m of t.matchAll(GALLERY_TOKEN_RE)) {
        const urls = (m[2] ?? '')
          .split('|')
          .map((x) => x.trim())
          .filter((x) => x.startsWith('/') || x.startsWith('http://') || x.startsWith('https://'))
          .filter((x) => !x.startsWith('https://source.unsplash.com/featured/'))
        for (const u of urls) pushMedia(u)
      }
      // Drop the whole line (token-only lines are the common authoring pattern).
      continue
    }

    // Single-line markdown image: extract and drop line.
    const img = IMAGE_MD_RE.exec(t)
    if (img) {
      const alt = (img[1] ?? '').trim()
      const src = (img[2] ?? '').trim()
      if (src) pushMedia(src, alt || undefined)
      continue
    }

    out.push(line)
  }

  return { media, bodyForRich: out.join('\n').trim() }
}

function defaultPersisted(): Persisted {
  return { openByKey: {} }
}

export function AttractionsSpotCards({
  cityId,
  kind,
  content,
  requestedSpotSlug,
}: {
  cityId: string
  kind: string
  content: string
  requestedSpotSlug?: string | null
}) {
  const persisted = useMemo(() => loadJson<Persisted>(STORAGE_KEY, defaultPersisted()), [])
  const [openByKey, setOpenByKey] = useState<Record<string, boolean>>(persisted.openByKey ?? {})

  useEffect(() => {
    saveJson<Persisted>(STORAGE_KEY, { openByKey })
  }, [openByKey])

  const parsed = useMemo(() => {
    const raw = (content ?? '').replace(/\r\n/g, '\n')
    const lines = raw.split('\n')

    const introLines: string[] = []
    const spotsRaw: Array<{ rawHeading: string; bodyLines: string[] }> = []
    let cur: { rawHeading: string; bodyLines: string[] } | null = null

    for (const line of lines) {
      if (isSpotHeading(line)) {
        const rawHeading = line.trim().replace(/^###\s*/, '').trim()
        if (cur) spotsRaw.push(cur)
        cur = { rawHeading, bodyLines: [] }
        continue
      }
      if (!cur) introLines.push(line)
      else cur.bodyLines.push(line)
    }
    if (cur) spotsRaw.push(cur)

    const intro = introLines.join('\n').trim()

    const spots: Spot[] = spotsRaw.map((s) => {
      const { titleText: titleWithLinkReplaced, mapsHref } = extractMapsLink(s.rawHeading)
      const { titleText, metaText } = extractTrailingMeta(titleWithLinkReplaced)
      const bodyRaw = s.bodyLines.join('\n').trim()
      const { media, bodyForRich } = parseMediaAndStripBody(bodyRaw)
      const key = `${cityId}|${kind}|${normalizeTitleForKey(titleText)}`
      return {
        key,
        slug: slugify(titleText),
        rawHeading: s.rawHeading,
        titleText,
        metaText,
        mapsHref,
        bodyRaw,
        bodyForRich,
        media,
      }
    })

    return { intro, spots, hasSpots: spots.length > 0 }
  }, [cityId, kind, content])

  const forcedOpenKey = useMemo(() => {
    const slug = (requestedSpotSlug ?? '').trim()
    if (!slug) return null
    const s = parsed.spots.find((x) => x.slug === slug)
    return s?.key ?? null
  }, [parsed.spots, requestedSpotSlug])

  if (!parsed.hasSpots) {
    return <RichContent content={content} className="attrProse" />
  }

  const sectionTopId = `attr-${cityId}-${kind}-top`

  return (
    <div className="attrSpotWrap">
      <div id={sectionTopId} />

      {parsed.intro ? (
        <div className="attrSpotIntro">
          <RichContent content={parsed.intro} className="attrProse" />
        </div>
      ) : null}

      <div className="attrSpotList" aria-label="景點卡列表">
        {parsed.spots.map((s, idx) => (
          // If a spot is targeted by a deep link, open it by default unless the user
          // has explicitly closed it before (openByKey[spotKey] === false).
          <SpotCard
            key={s.key}
            cityId={cityId}
            kind={kind}
            spot={s}
            index={idx}
            total={parsed.spots.length}
            open={
              openByKey[s.key] !== undefined
                ? openByKey[s.key]!
                : forcedOpenKey === s.key
            }
            setOpen={(next) => setOpenByKey((prev) => ({ ...prev, [s.key]: next }))}
            sectionTopId={sectionTopId}
            prevSpot={idx > 0 ? parsed.spots[idx - 1] : null}
            nextSpot={idx < parsed.spots.length - 1 ? parsed.spots[idx + 1] : null}
          />
        ))}
      </div>
    </div>
  )
}

function SpotCard({
  cityId,
  kind,
  spot,
  open,
  setOpen,
  index,
  total,
  sectionTopId,
  prevSpot,
  nextSpot,
}: {
  cityId: string
  kind: string
  spot: Spot
  open: boolean
  setOpen: (next: boolean) => void
  index: number
  total: number
  sectionTopId: string
  prevSpot: Spot | null
  nextSpot: Spot | null
}) {
  const cardId = `attr-${cityId}-${kind}-${spot.slug}`
  const carouselId = `${cardId}-carousel`
  const cardRef = useRef<HTMLDivElement | null>(null)

  const onToggle = () => setOpen(!open)

  const onCoverClick = () => {
    if (!open) setOpen(true)
    // Scroll to carousel (if present); fall back to card.
    const scrollTarget = document.getElementById(carouselId) ?? document.getElementById(cardId)
    scrollTarget?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // Focus the carousel region if possible.
    window.setTimeout(() => {
      const el = document.getElementById(carouselId)
      ;(el as HTMLElement | null)?.focus?.()
    }, 80)
  }

  const gotoSpot = (target: Spot | null) => {
    if (!target) return
    const id = `attr-${cityId}-${kind}-${target.slug}`
    // Push hash (supports back/forward + sharing).
    window.location.hash = id
  }

  const onCollapse = () => {
    setOpen(false)
    const raw = window.location.hash.replace('#', '')
    let id = raw
    try {
      id = decodeURIComponent(raw)
    } catch {
      // ignore
    }
    if (id === cardId) {
      // Prefer staying anchored to the city section (stable UX).
      window.history.replaceState(null, '', `#attr-${cityId}`)
    }
  }

  const onBackToTop = () => {
    document.getElementById(sectionTopId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (!open) return
    const root = cardRef.current
    if (!root) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      if (e.key !== 'Escape') return
      const active = document.activeElement
      if (active && root.contains(active)) {
        e.preventDefault()
        onCollapse()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const hasCover = spot.media.length > 0
  const coverSrc = hasCover ? spot.media[0]!.src : ''

  return (
    <section id={cardId} className="card attrSpotCard" ref={cardRef} data-spot-slug={spot.slug}>
      {hasCover ? (
        <button
          type="button"
          className="attrSpotCover"
          onClick={onCoverClick}
          aria-label={`查看圖片：${spot.titleText}`}
          title="查看圖片"
        >
          <img src={coverSrc} alt={spot.media[0]?.alt ?? spot.titleText} loading="lazy" decoding="async" />
        </button>
      ) : null}

      <button type="button" className="attrSpotHeader" onClick={onToggle} aria-expanded={open}>
        <div className="attrSpotHeaderMain">
          <div className="attrSpotTitle" title={spot.titleText}>
            {spot.titleText}
          </div>
          {spot.metaText ? <div className="attrSpotMeta">{spot.metaText}</div> : null}
        </div>

        <div className="attrSpotHeaderRight">
          {spot.mapsHref ? (
            <a
              className="btn attrSpotMapsBtn"
              href={spot.mapsHref}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(e) => e.stopPropagation()}
              aria-label={`開啟地圖：${spot.titleText}`}
              title="開啟地圖（新分頁）"
            >
              地圖
            </a>
          ) : null}
          <span className={`attrSpotChevron ${open ? 'attrSpotChevronOpen' : ''}`} aria-hidden="true">
            ▾
          </span>
        </div>
      </button>

      {!open ? (
        <div className="attrSpotCollapsed">
          {firstContentSnippet(spot.bodyRaw, 140) ? (
            <div className="attrSpotSnippet">{firstContentSnippet(spot.bodyRaw, 140)}</div>
          ) : (
            <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              （此段目前尚無內容）
            </div>
          )}
        </div>
      ) : (
        <div className="attrSpotExpanded">
          {spot.media.length > 0 ? <AutoCarousel id={carouselId} items={spot.media} /> : null}

          <div className="attrSpotBody">
            {spot.bodyForRich ? (
              <RichContent content={spot.bodyForRich} className="attrProse" />
            ) : (
              <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                （此段目前尚無內容）
              </div>
            )}
          </div>

          <div className="attrSpotFooter" role="group" aria-label="景點卡操作">
            <button
              type="button"
              className="btn attrSpotNavBtn"
              onClick={() => gotoSpot(prevSpot)}
              disabled={!prevSpot}
              aria-label="上一個景點"
              title="上一個"
            >
              ←
            </button>

            <div className="attrSpotFooterCenter">
              <button type="button" className="btn attrSpotCollapseBtn" onClick={onCollapse} aria-label="收起">
                收起
              </button>
              <div className="muted attrSpotCount" aria-hidden="true">
                第 {index + 1}/{total} 個
              </div>
            </div>

            <button
              type="button"
              className="btn attrSpotNavBtn"
              onClick={() => gotoSpot(nextSpot)}
              disabled={!nextSpot}
              aria-label="下一個景點"
              title="下一個"
            >
              →
            </button>
          </div>

          <div className="attrSpotFooterSecondary">
            <button type="button" className="btn attrSpotTopBtn" onClick={onBackToTop} aria-label="返回章節頂部">
              返回章節頂部
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function AutoCarousel({ id, items }: { id: string; items: MediaItem[] }) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [inView, setInView] = useState(true)
  const pauseTimeoutRef = useRef<number | null>(null)

  const itemCount = items.length
  const canNav = itemCount > 1

  const scrollToIndex = useCallback((idx: number, behavior: ScrollBehavior) => {
    const el = wrapRef.current
    if (!el) return
    const clamped = ((idx % itemCount) + itemCount) % itemCount
    const child = el.children.item(clamped) as HTMLElement | null
    if (!child) return
    child.scrollIntoView({ behavior, inline: 'start', block: 'nearest' })
    setActiveIndex(clamped)
  }, [itemCount])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        setInView(!!e?.isIntersecting)
      },
      { root: null, threshold: [0, 0.2, 0.6] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const onPointerDown = () => setPaused(true)
    const onPointerUp = () => setPaused(false)
    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const onScroll = () => {
      if (pauseTimeoutRef.current) window.clearTimeout(pauseTimeoutRef.current)
      setPaused(true)
      pauseTimeoutRef.current = window.setTimeout(() => setPaused(false), 220)

      // Update activeIndex from scroll position (best-effort, stable for equal-width snaps).
      const children = Array.from(el.children) as HTMLElement[]
      if (children.length <= 1) return
      let best = 0
      let bestDist = Infinity
      for (let i = 0; i < children.length; i++) {
        const c = children[i]!
        const dist = Math.abs(c.offsetLeft - el.scrollLeft)
        if (dist < bestDist) {
          bestDist = dist
          best = i
        }
      }
      setActiveIndex(best)
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (pauseTimeoutRef.current) window.clearTimeout(pauseTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!canNav) return
    if (!inView) return
    if (paused) return

    const t = window.setInterval(() => {
      scrollToIndex(activeIndex + 1, 'smooth')
    }, 5000)
    return () => window.clearInterval(t)
  }, [activeIndex, canNav, inView, paused, scrollToIndex])

  return (
    <div className="attrSpotCarousel" id={id} tabIndex={-1} data-active-index={activeIndex} aria-label="圖片輪播">
      <div className="attrSpotCarouselViewport" ref={wrapRef}>
        {items.map((it, idx) => (
          <div className="attrSpotCarouselSlide" key={`${idx}-${it.src}`}>
            <img src={it.src} alt={it.alt ?? `圖片 ${idx + 1}`} loading="lazy" decoding="async" />
          </div>
        ))}
      </div>

      {canNav ? (
        <div className="attrSpotCarouselControls" aria-hidden="false">
          <button
            type="button"
            className="btn attrSpotCarouselBtn"
            onClick={() => scrollToIndex(activeIndex - 1, 'smooth')}
            aria-label="上一張圖片"
            title="上一張"
          >
            ←
          </button>
          <div className="muted attrSpotCarouselCount" aria-hidden="true">
            {activeIndex + 1}/{itemCount}
          </div>
          <button
            type="button"
            className="btn attrSpotCarouselBtn"
            onClick={() => scrollToIndex(activeIndex + 1, 'smooth')}
            aria-label="下一張圖片"
            title="下一張"
          >
            →
          </button>
        </div>
      ) : null}
    </div>
  )
}

