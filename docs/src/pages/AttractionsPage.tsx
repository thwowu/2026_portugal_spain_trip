import { useEffect, useMemo, useRef, useState } from 'react'
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

type IndentedNode = {
  id: string
  text: string
  level: number
  children: IndentedNode[]
}

function stripListMarker(s: string) {
  const t = s.trimStart()
  if (t.startsWith('- ')) return t.slice(2)
  if (t.startsWith('* ')) return t.slice(2)
  // Ordered list: "1. "
  const m = /^\d+\.\s+/.exec(t)
  if (m) return t.slice(m[0].length)
  return t
}

function parseIndentedList(items: string[]): IndentedNode[] {
  const root: IndentedNode = { id: 'root', text: '', level: -1, children: [] }
  const stack: IndentedNode[] = [root]

  const pushNode = (n: IndentedNode) => {
    stack[stack.length - 1]?.children.push(n)
    stack.push(n)
  }

  for (let i = 0; i < items.length; i++) {
    const raw = items[i] ?? ''
    if (!raw.trim()) continue

    const indent = (raw.match(/^\s*/)?.[0]?.length ?? 0)
    // Markdown convention in this repo uses 2-space indents for nesting.
    const desiredLevel = Math.floor(indent / 2)
    const level = Math.max(0, Math.min(desiredLevel, (stack[stack.length - 1]?.level ?? -1) + 1))

    // Find correct parent for this level.
    while (stack.length > 1 && (stack[stack.length - 1]?.level ?? 0) >= level) stack.pop()

    const text = stripListMarker(raw).trim()
    const node: IndentedNode = { id: `${i}-${level}-${text.slice(0, 18)}`, text, level, children: [] }
    pushNode(node)
  }

  return root.children
}

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

const KNOWN_KV_KEYS = new Set([
  '重點',
  '為什麼去',
  '歷史',
  '建議停留',
  '小提醒',
  '提醒',
  '策略',
  '備案',
  '交通',
  '票務',
  'refs',
  'Wikivoyage',
  'Wikitravel',
  '官方',
])

function parseKeyValueLine(raw: string): { key: string; value: string } | null {
  const m = /^([^：:]{2,24})[：:]\s*(.+)$/.exec(raw.trim())
  if (!m) return null
  const keyRaw = (m[1] ?? '').trim()
  const value = (m[2] ?? '').trim()
  if (!keyRaw || !value) return null

  const keyNormalized = keyRaw.replace(/（.*?）/g, '').trim()
  if (!KNOWN_KV_KEYS.has(keyNormalized)) return null
  return { key: keyRaw, value }
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

  const kv = parseKeyValueLine(raw)
  if (kv) {
    const linked = renderInlineText(kv.value)
    return (
      <div className="attrKV" style={{ whiteSpace: 'pre-wrap' }}>
        <span className="attrKVKey">{kv.key}</span>
        <span className="attrKVValue">{linked ?? kv.value}</span>
      </div>
    )
  }

  const linked = renderInlineText(text)
  if (linked) return <div style={{ whiteSpace: 'pre-wrap' }}>{linked}</div>

  return <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
}

function IndentedList({
  items,
  onOpenImage,
  onOpenGallery,
  depth = 0,
}: {
  items: string[]
  onOpenImage?: (src: string, title: string) => void
  onOpenGallery?: (images: GalleryImage[], title: string) => void
  depth?: number
}) {
  const nodes = useMemo(() => parseIndentedList(items), [items])

  const renderNodes = (ns: IndentedNode[], d: number) => {
    if (ns.length === 0) return null
    return (
      <ul className={`attrList attrListDepth${Math.min(d, 3)}`}>
        {ns.map((n) => {
          const isSupplementLabel = n.text === '補充'
          return (
            <li key={n.id} className={isSupplementLabel ? 'attrSupplement' : undefined}>
              {isSupplementLabel ? (
                <div className="attrSupplementLabel">補充</div>
              ) : (
                <RichItem text={n.text} onOpenImage={onOpenImage} onOpenGallery={onOpenGallery} />
              )}
              {n.children.length > 0 ? renderNodes(n.children, d + 1) : null}
            </li>
          )
        })}
      </ul>
    )
  }

  return renderNodes(nodes, depth)
}

function Section({
  kind,
  title,
  items,
  onOpenImage,
  onOpenGallery,
  defaultOpen,
}: {
  kind?: string
  title: string
  items: string[]
  onOpenImage?: (src: string, title: string) => void
  onOpenGallery?: (images: GalleryImage[], title: string) => void
  defaultOpen?: boolean
}) {
  const hasItems = items.length > 0
  const cls = ['attrSection', kind ? `attrSection_${kind}` : ''].filter(Boolean).join(' ')
  const titleNode = (
    <span className="attrSectionTitleRow">
      {kind === 'rain' ? <span className="attrSectionBadge attrSectionBadgeRain">雨備</span> : null}
      <span className="attrSectionTitleText">{title}</span>
    </span>
  )
  return (
    <ExpandingBox
      className={cls}
      title={titleNode}
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
          <IndentedList items={items} onOpenImage={onOpenImage} onOpenGallery={onOpenGallery} />
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
  const [activeCityId, setActiveCityId] = useState<CityId | null>((ATTRACTIONS_DATA[0]?.cityId as CityId) ?? null)
  const [showCityPicker, setShowCityPicker] = useState(false)
  const cityPickerCloseRef = useRef<HTMLButtonElement | null>(null)

  const extensionsByCity = useMemo(() => {
    const m = new Map<string, (typeof EXTENSIONS_DATA)[number]>()
    for (const c of EXTENSIONS_DATA) m.set(c.cityId, c)
    return m
  }, [])

  const scrollToCity = (cityId: string) => {
    const el = document.getElementById(`attr-${cityId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const cityOrder = useMemo(() => ATTRACTIONS_DATA.map((c) => c.cityId), [])
  const activeCityIdx = useMemo(() => {
    if (!activeCityId) return 0
    const idx = cityOrder.indexOf(activeCityId)
    return idx >= 0 ? idx : 0
  }, [activeCityId, cityOrder])

  const prevCityId = activeCityIdx > 0 ? cityOrder[activeCityIdx - 1] : null
  const nextCityId = activeCityIdx < cityOrder.length - 1 ? cityOrder[activeCityIdx + 1] : null

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

      <div className="attrStickyNav" aria-label="城市快速跳轉（景點）">
        <div className="card attrStickyNavCard">
          <div className="cardInner attrStickyNavInner">
            <div className="attrStickyNow">
              目前：{activeCityId ? CITIES[activeCityId]?.label : '—'}
            </div>
            <div className="chipRow" style={{ flex: 1 }}>
              {ATTRACTIONS_DATA.map((c) => {
                const isActive = activeCityId === (c.cityId as CityId)
                return (
                  <button
                    key={c.cityId}
                    className={`btn ${isActive ? 'btnPrimary' : ''}`}
                    onClick={() => scrollToCity(c.cityId)}
                    aria-current={isActive ? 'true' : undefined}
                    type="button"
                  >
                    {CITIES[c.cityId].label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 10 }} />

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
                      kind={s.kind}
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

      <div className="attrFloatNav" aria-label="景點快速移動">
        <div className="attrFloatNavPanel">
          <div className="attrFloatNavInner">
            <button
              type="button"
              className="btn attrFloatBtn"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="回到頁面頂部"
              title="回頂"
            >
              回頂
            </button>
            <button
              type="button"
              className="btn attrFloatBtn"
              onClick={() => prevCityId && scrollToCity(prevCityId)}
              disabled={!prevCityId}
              aria-label="跳到上一個城市"
              title="上一城"
            >
              上一城
            </button>
            <button
              type="button"
              className="btn attrFloatBtn btnPrimary"
              onClick={() => setShowCityPicker(true)}
              aria-label="開啟城市目錄"
              title="城市"
            >
              城市
            </button>
            <button
              type="button"
              className="btn attrFloatBtn"
              onClick={() => nextCityId && scrollToCity(nextCityId)}
              disabled={!nextCityId}
              aria-label="跳到下一個城市"
              title="下一城"
            >
              下一城
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={showCityPicker}
        ariaLabel="選擇城市（景點）"
        onClose={() => setShowCityPicker(false)}
        overlayClassName="modalOverlay modalOverlayCenter"
        cardClassName="card modalCard"
        initialFocusRef={cityPickerCloseRef}
        cardStyle={{ maxWidth: 'min(560px, 100%)' }}
      >
        <div className="cardInner">
          <div className="modalHeader">
            <div>
              <div className="modalTitle">快速跳到城市</div>
              <div className="muted modalSub">點選城市後會自動滑動到對應段落。</div>
            </div>
            <button ref={cityPickerCloseRef} className="btn modalCloseBtn" onClick={() => setShowCityPicker(false)}>
              關閉
            </button>
          </div>

          <hr className="hr" />

          <div className="chipRow">
            {ATTRACTIONS_DATA.map((c) => {
              const isActive = activeCityId === (c.cityId as CityId)
              return (
                <button
                  key={c.cityId}
                  className={`btn ${isActive ? 'btnPrimary' : ''}`}
                  onClick={() => {
                    scrollToCity(c.cityId)
                    setShowCityPicker(false)
                  }}
                  type="button"
                >
                  {CITIES[c.cityId].label}
                </button>
              )
            })}
          </div>
        </div>
      </Modal>

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
    <section id={id} data-city-id={cityId} className="reveal attrCitySection" ref={ref}>
      {children}
    </section>
  )
}

