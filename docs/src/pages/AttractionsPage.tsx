import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ATTRACTIONS_DATA, EXTENSIONS_DATA } from '../generated'
import { CITIES } from '../data/core'
import { useHashScroll } from '../hooks/useHashScroll'
import { useReveal } from '../hooks/useReveal'
import { Lightbox } from '../components/Lightbox'
import { GalleryLightbox, type GalleryImage } from '../components/GalleryLightbox'
import { ILLUSTRATION } from '../illustrations'
import { PageHero } from '../components/PageHero'

const IMAGE_MD_RE = /^!\[([^\]]*)\]\((.+)\)$/
const LINK_MD_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g
const GALLERY_TOKEN_RE = /\{\{gallery(?::([^|}]+))?\|([^}]+)\}\}/

function renderTextWithLinks(text: string) {
  const parts: React.ReactNode[] = []
  let last = 0

  for (const m of text.matchAll(LINK_MD_RE)) {
    const idx = m.index ?? -1
    if (idx < 0) continue

    const label = (m[1] ?? '').trim()
    const href = (m[2] ?? '').trim()

    if (idx > last) parts.push(text.slice(last, idx))
    parts.push(
      <a key={`${idx}-${href}`} href={href} target="_blank" rel="noreferrer noopener">
        {label || href}
      </a>,
    )
    last = idx + m[0].length
  }

  if (parts.length === 0) return null
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
  const m = IMAGE_MD_RE.exec(raw)
  if (m) {
    const alt = (m[1] || '圖片').trim() || '圖片'
    const src = (m[2] || '').trim()
    const isDynamicUnsplash = src.startsWith('https://source.unsplash.com/featured/')
    if (!isDynamicUnsplash && (src.startsWith('/') || src.startsWith('http://') || src.startsWith('https://'))) {
      return (
        <button
          type="button"
          className="inlineImageCard"
          onClick={() => onOpenImage?.(src, alt)}
          title="點擊放大"
          aria-label={`查看大圖：${alt}`}
        >
          <img src={src} alt={alt} loading="lazy" />
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
      .filter((x) => x.startsWith('http://') || x.startsWith('https://'))
      // Avoid dynamic "featured" images (unstable + more tracking-y)
      .filter((x) => !x.startsWith('https://source.unsplash.com/featured/'))
    const images: GalleryImage[] = urls.map((src) => ({ src }))

    const cleaned = text.replace(gm[0], '').trim().replace(/[｜|]\s*$/, '').trim()
    const linked = renderTextWithLinks(cleaned)

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

  const linked = renderTextWithLinks(text)
  if (linked) return <div style={{ whiteSpace: 'pre-wrap' }}>{linked}</div>

  return <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
}

function Section({
  title,
  items,
  onOpenImage,
  onOpenGallery,
}: {
  title: string
  items: string[]
  onOpenImage?: (src: string, title: string) => void
  onOpenGallery?: (images: GalleryImage[], title: string) => void
}) {
  return (
    <div className="card" style={{ boxShadow: 'none' }}>
      <div className="cardInner">
        <div style={{ fontWeight: 900 }}>{title}</div>
        <div className="muted" style={{ marginTop: 8 }}>
          {items.length === 0 ? (
            <div>（待補）</div>
          ) : (
            items.map((x, i) => (
              <div key={`${i}-${x}`}>
                <RichItem text={x} onOpenImage={onOpenImage} onOpenGallery={onOpenGallery} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function AttractionsPage() {
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
            title="景點（模板）"
            subtitle={
              <>
                每城市固定 10 個子章節（你之後只要填內容）：必去、走路少、下雨備案、視角點、路線、可跳過、實用資訊、吃什麼、拍照點、安全提醒。規劃階段可先用{' '}
                <Link to="/dashboard">Dashboard</Link> 排優先順序。
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
          <RevealSection key={c.cityId} id={`attr-${c.cityId}`}>
            <div className="card">
              <div className="cardInner">
                <div style={{ fontWeight: 950, fontSize: 'var(--text-xl)', lineHeight: 1.15 }}>
                  {c.title}
                </div>
                <div className="muted" style={{ marginTop: 8 }}>
                  這裡的內容會在後續從 `葡西之旅建議.md` 自動萃取/拆入，再由你微調。
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        padding: 16,
        zIndex: 50,
        overflow: 'auto',
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 860, margin: '48px auto', boxShadow: 'none' }}
      >
        <div className="cardInner">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>
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
              <Section key={s.key} title={s.title} items={s.items} onOpenImage={onOpenImage} onOpenGallery={onOpenGallery} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function RevealSection({ id, children }: { id: string; children: React.ReactNode }) {
  const ref = useReveal<HTMLElement>()
  return (
    <section id={id} className="reveal" ref={ref}>
      {children}
    </section>
  )
}

