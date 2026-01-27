import { useEffect, useMemo, useState } from 'react'
import { ATTRACTIONS_DATA, EXTENSIONS_DATA } from '../generated'
import { CITIES } from '../data/core'
import type { CityId } from '../data/core'
import { useProgress } from '../state/progress'
import { useSettings } from '../state/settings'
import { useHashScroll } from '../hooks/useHashScroll'
import { useReveal } from '../hooks/useReveal'
import { Lightbox } from '../components/Lightbox'
import { GalleryLightbox, type GalleryImage } from '../components/GalleryLightbox'
import { Modal } from '../components/Modal'
import { ILLUSTRATION } from '../illustrations'
import { PageHero } from '../components/PageHero'
import { withBaseUrl } from '../utils/asset'
import { ExpandingBox } from '../components/ExpandingBox'

const IMAGE_MD_RE = /^!\[([^\]]*)\]\((.+)\)$/
const GALLERY_TOKEN_RE = /\{\{gallery(?::([^|}]+))?\|([^}]+)\}\}/
const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i
const MD_LINK_RE = /^\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/

const TOKEN_RE = /(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))|(`([^`]+)`)|(https?:\/\/[^\s)]+)/g

function splitTrailingUrlPunct(url: string) {
  // Common trailing punctuations in our zh-TW content + markdown-ish contexts
  const m = /^(.*?)([),.;:!?，。；：！？、》」）】]+)?$/.exec(url)
  if (!m) return { url, punct: '' }
  return { url: (m[1] ?? url).trim(), punct: (m[2] ?? '').trim() }
}

function isDynamicUnsplash(src: string) {
  return src.startsWith('https://source.unsplash.com/featured/')
}

function isImageLikeUrl(src: string) {
  const s = (src ?? '').trim()
  if (!s) return false
  if (s.startsWith('data:image/')) return true
  if (s.startsWith('blob:')) return true
  return IMAGE_EXT_RE.test(s)
}

function renderInlineText(text: string) {
  const parts: React.ReactNode[] = []
  let last = 0
  let hasToken = false

  for (const m of text.matchAll(TOKEN_RE)) {
    const idx = m.index ?? -1
    if (idx < 0) continue
    hasToken = true

    if (idx > last) parts.push(text.slice(last, idx))

    // 1) Markdown link: [label](https://...)
    if (m[1]) {
      const label = (m[2] ?? '').trim()
      const href = (m[3] ?? '').trim()
      parts.push(
        <a key={`${idx}-${href}`} href={href} target="_blank" rel="noreferrer noopener">
          {label || href}
        </a>,
      )
      last = idx + m[1].length
      continue
    }

    // 2) Inline code: `...` (if it's a URL, make it clickable too)
    if (m[4]) {
      const codeText = (m[5] ?? '').trim()
      if (codeText.startsWith('http://') || codeText.startsWith('https://')) {
        const { url, punct } = splitTrailingUrlPunct(codeText)
        parts.push(
          <a key={`${idx}-${url}`} href={url} target="_blank" rel="noreferrer noopener">
            <code>{url}</code>
          </a>,
        )
        if (punct) parts.push(punct)
      } else {
        parts.push(<code key={`${idx}-code`}>{codeText}</code>)
      }
      last = idx + m[4].length
      continue
    }

    // 3) Bare URL: https://...
    if (m[6]) {
      const rawUrl = (m[6] ?? '').trim()
      const { url, punct } = splitTrailingUrlPunct(rawUrl)
      parts.push(
        <a key={`${idx}-${url}`} href={url} target="_blank" rel="noreferrer noopener">
          {url}
        </a>,
      )
      if (punct) parts.push(punct)
      last = idx + m[6].length
      continue
    }

    // Fallback: should not happen, but don't drop text
    parts.push(m[0])
    last = idx + m[0].length
  }

  if (!hasToken) return null
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function RichItem({
  text,
  onOpenImage,
  onOpenGallery,
}: {
  text: string
  onOpenImage?: (src: string, title: string) => void
  onOpenGallery?: (images: GalleryImage[], title: string) => void
}) {
  const raw = text.trim()

  // Whole-line markdown link pointing to an image: treat as lightbox.
  const lm = MD_LINK_RE.exec(raw)
  if (lm) {
    const label = (lm[1] || '圖片').trim() || '圖片'
    const href = (lm[2] || '').trim()
    if (!isDynamicUnsplash(href) && isImageLikeUrl(href)) {
      const resolved = withBaseUrl(href)
      return (
        <button
          type="button"
          className="inlineImageCard"
          onClick={() => onOpenImage?.(resolved, label)}
          title="點擊放大"
          aria-label={`查看大圖：${label}`}
        >
          <img src={resolved} alt={label} loading="lazy" />
          <div className="inlineImageCaption">{label}</div>
        </button>
      )
    }
  }

  // Whole-line bare URL pointing to an image: treat as lightbox.
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    const { url } = splitTrailingUrlPunct(raw)
    if (!isDynamicUnsplash(url) && isImageLikeUrl(url)) {
      const resolved = withBaseUrl(url)
      const alt = '圖片'
      return (
        <button
          type="button"
          className="inlineImageCard"
          onClick={() => onOpenImage?.(resolved, alt)}
          title="點擊放大"
          aria-label={`查看大圖：${alt}`}
        >
          <img src={resolved} alt={alt} loading="lazy" />
          <div className="inlineImageCaption">{alt}</div>
        </button>
      )
    }
  }

  const m = IMAGE_MD_RE.exec(raw)
  if (m) {
    const alt = (m[1] || '圖片').trim() || '圖片'
    const src = (m[2] || '').trim()
    if (!isDynamicUnsplash(src) && (src.startsWith('/') || src.startsWith('http://') || src.startsWith('https://'))) {
      const resolvedSrc = withBaseUrl(src)
      return (
        <button
          type="button"
          className="inlineImageCard"
          onClick={() => onOpenImage?.(resolvedSrc, alt)}
          title="點擊放大"
          aria-label={`查看大圖：${alt}`}
        >
          <img src={resolvedSrc} alt={alt} loading="lazy" />
          <div className="inlineImageCaption">{alt}</div>
        </button>
      )
    }
  }

  const gm = GALLERY_TOKEN_RE.exec(text)
  if (gm) {
    const gTitle = (gm[1] ?? '').trim()
    const urls = (gm[2] ?? '')
      .split('|')
      .map((x) => x.trim())
      .filter((x) => x.startsWith('/') || x.startsWith('http://') || x.startsWith('https://'))
      // Avoid dynamic "featured" images (unstable + more tracking-y)
      .filter((x) => !x.startsWith('https://source.unsplash.com/featured/'))
    const images: GalleryImage[] = urls.map((src) => ({ src: withBaseUrl(src) }))

    const cleaned = text.replace(gm[0], '').trim().replace(/[｜|]\s*$/, '').trim()
    const linked = renderInlineText(cleaned)

    return (
      <div style={{ whiteSpace: 'pre-wrap', display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span>{linked ?? cleaned}</span>
        {images.length > 0 && (
          <button
            type="button"
            className="btn"
            style={{ minHeight: 34, padding: '8px 12px' }}
            onClick={() => onOpenGallery?.(images, gTitle || cleaned || '圖庫')}
            aria-label={`開啟圖庫：${gTitle || cleaned || '圖庫'}`}
            title="點擊開啟圖庫"
          >
            圖庫
          </button>
        )}
      </div>
    )
  }

  const linked = renderInlineText(text)
  if (linked) return <div style={{ whiteSpace: 'pre-wrap' }}>{linked}</div>

  return <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
}

function Section({
  title,
  items,
  onOpenImage,
  onOpenGallery,
  defaultOpen,
}: {
  title: string
  items: string[]
  onOpenImage?: (src: string, title: string) => void
  onOpenGallery?: (images: GalleryImage[], title: string) => void
  defaultOpen?: boolean
}) {
  const hasItems = items.length > 0
  return (
    <ExpandingBox
      title={title}
      meta={<span style={{ fontSize: 'var(--text-xs)' }}>{hasItems ? `${items.length}` : '—'}</span>}
      defaultOpen={defaultOpen ?? hasItems}
      collapsedHeight={0}
      footerToggle={false}
      style={{ boxShadow: 'none' }}
    >
      <div className="muted" style={{ marginTop: 6 }}>
        {!hasItems ? (
          <div>（此章節目前尚無項目）</div>
        ) : (
          items.map((x, i) => (
            <div key={`${i}-${x}`} style={{ marginTop: i === 0 ? 0 : 8 }}>
              <RichItem text={x} onOpenImage={onOpenImage} onOpenGallery={onOpenGallery} />
            </div>
          ))
        )}
      </div>
    </ExpandingBox>
  )
}

export function AttractionsPage() {
  const { state: progress, actions: progressActions } = useProgress()
  const { showSeenHints } = useSettings()
  useHashScroll()
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [active, setActive] = useState<{ cityId: string; tripId: string } | null>(null)
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null)
  const [gallery, setGallery] = useState<{ title: string; images: GalleryImage[]; index: number } | null>(null)

  const extensionsByCity = useMemo(() => {
    const m = new Map<string, (typeof EXTENSIONS_DATA)[number]>()
    for (const c of EXTENSIONS_DATA) m.set(c.cityId, c)
    return m
  }, [])

  return (
    <div className="container">
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

          <div className="chipRow">
            {ATTRACTIONS_DATA.map((c) => (
              <button
                key={c.cityId}
                className="btn"
                onClick={() => document.getElementById(`attr-${c.cityId}`)?.scrollIntoView({ behavior: 'smooth' })}
              >
                {CITIES[c.cityId].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div style={{ display: 'grid', gap: 14 }}>
        {ATTRACTIONS_DATA.map((c) => (
          <RevealSection
            key={c.cityId}
            id={`attr-${c.cityId}`}
            cityId={c.cityId as CityId}
            onSeen={progressActions.markAttractionsSeen}
          >
            <div className="card">
              <div className="cardInner">
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 950, fontSize: 'var(--text-xl)', lineHeight: 1.15 }}>
                    {c.title}
                  </div>
                  {showSeenHints && progress.attractionsSeen[c.cityId as CityId] ? <div className="chip">已看過</div> : null}
                </div>
                <div className="muted" style={{ marginTop: 8 }}>
                  這頁把同一城市的重點集中在一起，方便快速掃過、做取捨；有空再逐步補上連結與細節。
                </div>

                <hr className="hr" />

                <div style={{ display: 'grid', gap: 10 }}>
                  {c.sections.map((s) => (
                    <Section
                      key={s.kind}
                      title={s.title}
                      items={s.items}
                      onOpenImage={(src, title) => setLightbox({ src, title })}
                      onOpenGallery={(images, title) => setGallery({ images, title, index: 0 })}
                    />
                  ))}
                </div>

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
                                const summary = t.sections.find((s) => s.key === 'summary')?.items?.[0]
                                return (
                                  <div key={t.id} className="card" style={{ boxShadow: 'none', marginTop: 10 }}>
                                    <div className="cardInner">
                                      <div style={{ fontWeight: 900 }}>{t.title}</div>
                                      {summary && (
                                        <div className="muted" style={{ marginTop: 6 }}>
                                          <RichItem text={summary} onOpenImage={(src, title) => setLightbox({ src, title })} />
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
        ))}
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

  // Extensions are read by the whole family:
  // - Keep "summary / how / route / time" open (actionable).
  // - Collapse "why / cost / sources" by default (story/details).
  const defaultOpenForExtensionsSection = (key: string) =>
    ['summary', 'images', 'how', 'route', 'time', 'when', 'backup'].includes(key)

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
          <button className="btn" onClick={onClose}>
            關閉
          </button>
        </div>

        <hr className="hr" />

        <div style={{ display: 'grid', gap: 10 }}>
          {trip.sections.map((s) => (
            <Section
              key={s.key}
              title={s.title}
              items={s.items}
              defaultOpen={defaultOpenForExtensionsSection(s.key)}
              onOpenImage={onOpenImage}
              onOpenGallery={onOpenGallery}
            />
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
    <section id={id} className="reveal" ref={ref}>
      {children}
    </section>
  )
}

