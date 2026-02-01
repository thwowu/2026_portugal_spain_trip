import { useMemo } from 'react'
import type { GalleryImage } from './GalleryLightbox'
import { FormattedInline, FormattedText } from './FormattedText'
import { withBaseUrl } from '../utils/asset'
import { prefersReducedMotion } from '../utils/motion'
import { splitTrailingUrlPunct } from '../markdownLite/utils'

const GALLERY_TOKEN_RE = /\{\{gallery(?::([^|}]+))?\|([^}]+)\}\}/g
const IMAGE_MD_RE = /^!\[([^\]]*)\]\((.+)\)$/
const MD_LINK_RE = /^\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/
const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i

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

function extractGalleryImages(tokenMatch: RegExpExecArray) {
  const title = (tokenMatch[1] ?? '').trim()
  const urls = (tokenMatch[2] ?? '')
    .split('|')
    .map((x) => x.trim())
    .filter((x) => x.startsWith('/') || x.startsWith('http://') || x.startsWith('https://'))
    // Avoid dynamic "featured" images (unstable + more tracking-y)
    .filter((x) => !x.startsWith('https://source.unsplash.com/featured/'))
  const images: GalleryImage[] = urls.map((src) => ({ src: withBaseUrl(src) }))
  return { title, images }
}

type Block =
  | { kind: 'h'; level: 3 | 4; text: string; id: string }
  | { kind: 'image'; alt: string; src: string }
  | { kind: 'quote'; text: string }
  | { kind: 'ul'; items: UlItem[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'p'; text: string; galleries: Array<{ title: string; images: GalleryImage[] }> }

type UlItem = { text: string; children: UlItem[] }

function buildUlTree(rows: Array<{ level: number; text: string }>): UlItem[] {
  const root: UlItem[] = []
  const stack: Array<{ level: number; items: UlItem[] }> = [{ level: -1, items: root }]

  for (const r of rows) {
    const level = Math.max(0, r.level)
    const text = (r.text ?? '').trim()
    if (!text) continue

    while (stack.length > 1 && level <= stack[stack.length - 1]!.level) stack.pop()

    const parent = stack[stack.length - 1]!
    const item: UlItem = { text, children: [] }

    if (level > parent.level + 1) {
      // Clamp overly-indented lines to avoid building empty intermediary levels.
      // (We author with 2-space indents, but we keep this defensive.)
      parent.items.push(item)
      stack.push({ level: parent.level + 1, items: item.children })
      continue
    }

    if (level === parent.level + 1 && parent.items.length > 0) {
      // Nest under the previous sibling.
      const prev = parent.items[parent.items.length - 1]!
      prev.children.push(item)
      stack.push({ level, items: item.children })
      continue
    }

    // Same level as parent container: append to container.
    parent.items.push(item)
    stack.push({ level, items: item.children })
  }

  return root
}

function parseBlocks(content: string): Block[] {
  const rawLines = content.replace(/\r\n/g, '\n').split('\n')

  const blocks: string[][] = []
  let buf: string[] = []
  const flush = () => {
    const cleaned = buf.map((l) => l.trimEnd())
    const hasAny = cleaned.some((l) => l.trim().length > 0)
    if (hasAny) blocks.push(cleaned)
    buf = []
  }

  for (const line of rawLines) {
    if (line.trim() === '') flush()
    else buf.push(line)
  }
  flush()

  const out: Block[] = []
  const usedHeadingIds = new Map<string, number>()

  const makeHeadingId = (raw: string) => {
    const base =
      (raw ?? '')
        .trim()
        .toLowerCase()
        // Keep CJK; remove most punctuation; collapse spaces.
        .replace(/[\s]+/g, '-')
        .replace(/[^\p{Letter}\p{Number}\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af-]/gu, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'section'
    const n = (usedHeadingIds.get(base) ?? 0) + 1
    usedHeadingIds.set(base, n)
    return n === 1 ? base : `${base}-${n}`
  }
  for (const lines of blocks) {
    const trimmed = lines.map((l) => l.trim())

    // Headings: allow ### / #### as the FIRST line of a block.
    // This avoids leaking raw "###" in authored content where headings are immediately
    // followed by a gallery token or text without a blank line.
    {
      const first = trimmed[0] ?? ''
      // Allow headings with or without a space after hashes, e.g. "###（中文...）".
      const h4 = /^####\s*(.+)$/.exec(first)
      if (h4) {
        const text = (h4[1] ?? '').trim()
        out.push({ kind: 'h', level: 4, text, id: makeHeadingId(text) })
        const rest = lines.slice(1).join('\n').trim()
        if (rest) {
          const galleries: Array<{ title: string; images: GalleryImage[] }> = []
          for (const m of rest.matchAll(GALLERY_TOKEN_RE)) {
            const { title, images } = extractGalleryImages(m as RegExpExecArray)
            if (images.length > 0) galleries.push({ title, images })
          }
          const cleaned = rest.replace(GALLERY_TOKEN_RE, '').trim()
          out.push({ kind: 'p', text: cleaned, galleries })
        }
        continue
      }
      const h3 = /^###\s*(.+)$/.exec(first)
      if (h3) {
        const text = (h3[1] ?? '').trim()
        out.push({ kind: 'h', level: 3, text, id: makeHeadingId(text) })
        const rest = lines.slice(1).join('\n').trim()
        if (rest) {
          const galleries: Array<{ title: string; images: GalleryImage[] }> = []
          for (const m of rest.matchAll(GALLERY_TOKEN_RE)) {
            const { title, images } = extractGalleryImages(m as RegExpExecArray)
            if (images.length > 0) galleries.push({ title, images })
          }
          const cleaned = rest.replace(GALLERY_TOKEN_RE, '').trim()
          out.push({ kind: 'p', text: cleaned, galleries })
        }
        continue
      }
    }

    // Block quote: all lines start with ">"
    {
      const isQuote = trimmed.length > 0 && trimmed.every((l) => /^>\s?/.test(l))
      if (isQuote) {
        const q = trimmed.map((l) => l.replace(/^>\s?/, '')).join('\n').trim()
        out.push({ kind: 'quote', text: q })
        continue
      }
    }

    // Lists (simple top-level blocks only): "- item" / "1. item"
    {
      const ulMatches = lines.map((l) => /^(\s*)[-*]\s+(.+)$/.exec(l))
      const isUl = ulMatches.length > 0 && ulMatches.every(Boolean)
      if (isUl) {
        const rows = ulMatches
          .map((m) => {
            const indent = (m?.[1] ?? '').replace(/\t/g, '  ')
            const level = Math.floor(indent.length / 2)
            return { level, text: (m?.[2] ?? '').trim() }
          })
          .filter((x) => x.text.length > 0)
        out.push({ kind: 'ul', items: buildUlTree(rows) })
        continue
      }
      const isOl = trimmed.length > 0 && trimmed.every((l) => /^\d+\.\s+/.test(l))
      if (isOl) {
        out.push({ kind: 'ol', items: trimmed.map((l) => l.replace(/^\d+\.\s+/, '').trim()).filter(Boolean) })
        continue
      }
    }

    // Single-line images / image links
    if (trimmed.length === 1) {
      const one = trimmed[0] ?? ''
      const mdLink = MD_LINK_RE.exec(one)
      if (mdLink) {
        const label = (mdLink[1] || '圖片').trim() || '圖片'
        const href = (mdLink[2] || '').trim()
        if (!isDynamicUnsplash(href) && isImageLikeUrl(href)) {
          out.push({ kind: 'image', alt: label, src: withBaseUrl(href) })
          continue
        }
      }

      const img = IMAGE_MD_RE.exec(one)
      if (img) {
        const alt = (img[1] || '圖片').trim() || '圖片'
        const srcRaw = (img[2] || '').trim()
        if (!isDynamicUnsplash(srcRaw) && (srcRaw.startsWith('/') || srcRaw.startsWith('http://') || srcRaw.startsWith('https://'))) {
          out.push({ kind: 'image', alt, src: withBaseUrl(srcRaw) })
          continue
        }
      }

      if (one.startsWith('http://') || one.startsWith('https://')) {
        const { url } = splitTrailingUrlPunct(one)
        if (!isDynamicUnsplash(url) && isImageLikeUrl(url)) {
          out.push({ kind: 'image', alt: '圖片', src: withBaseUrl(url) })
          continue
        }
      }
    }

    const paragraph = lines.join('\n').trim()
    const galleries: Array<{ title: string; images: GalleryImage[] }> = []

    // Collect all gallery tokens inside this paragraph, but keep the paragraph text (token removed).
    let cleaned = paragraph
    for (const m of paragraph.matchAll(GALLERY_TOKEN_RE)) {
      const { title, images } = extractGalleryImages(m as RegExpExecArray)
      if (images.length > 0) galleries.push({ title, images })
    }
    cleaned = cleaned.replace(GALLERY_TOKEN_RE, '').trim()

    out.push({ kind: 'p', text: cleaned, galleries })
  }

  return out
}

export function RichContent({
  content,
  className = 'prose',
  showToc = false,
  onOpenImage,
  onOpenGallery,
}: {
  content: string
  className?: string
  showToc?: boolean
  onOpenImage?: (src: string, title: string) => void
  onOpenGallery?: (images: GalleryImage[], title: string) => void
}) {
  const blocks = useMemo(() => parseBlocks(content), [content])
  const headings = useMemo(() => blocks.filter((b) => b.kind === 'h') as Array<Extract<Block, { kind: 'h' }>>, [blocks])

  const isKeyTakeawaysHeading = (t: string) => {
    const s = (t ?? '').trim().toLowerCase()
    return (
      s === 'key takeaways' ||
      s.includes('key takeaways') ||
      s.includes('重點') ||
      s.includes('摘要') ||
      s.includes('先看這裡')
    )
  }

  const renderUl = (items: UlItem[], keyPrefix: string, depth = 0) => {
    const ulStyle: React.CSSProperties =
      depth === 0
        ? { margin: 0, paddingLeft: 18 }
        : { margin: '6px 0 0 0', paddingLeft: 18 }

    return (
      <ul style={ulStyle}>
        {items.map((it, i) => {
          const key = `${keyPrefix}-${depth}-${i}-${it.text}`
          return (
            <li key={key} style={{ marginTop: i === 0 ? 0 : 6 }}>
              <FormattedInline text={it.text} />
              {it.children.length > 0 ? renderUl(it.children, key, depth + 1) : null}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className={className}>
      {showToc && headings.length >= 2 ? (
        <nav className="not-prose longformWide" aria-label="目錄" style={{ marginBottom: 12 }}>
          <details className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }} open={false}>
            <summary className="cardInner" style={{ cursor: 'pointer', fontWeight: 900 }}>
              目錄（點開）
            </summary>
            <div className="cardInner" style={{ paddingTop: 0 }}>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {headings.map((h) => (
                  <li key={h.id} style={{ marginTop: 6 }}>
                    <button
                      type="button"
                      className="btn"
                      style={{ minHeight: 34, padding: '8px 12px', fontSize: 'var(--text-sm)' }}
                      onClick={() => {
                        const el = document.getElementById(h.id)
                        el?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
                      }}
                      aria-label={`跳到：${h.text}`}
                    >
                      {h.text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </nav>
      ) : null}
      {(() => {
        const out: React.ReactNode[] = []
        for (let idx = 0; idx < blocks.length; idx++) {
          const b = blocks[idx]!

          // Summary/Key takeaways: render as a distinct callout card when followed by a UL.
          if (b.kind === 'h' && isKeyTakeawaysHeading(b.text)) {
            const next = blocks[idx + 1]
            if (next?.kind === 'ul') {
              out.push(
                <section
                  key={`takeaways-${b.id}`}
                  className="not-prose longformWide card"
                  style={{ boxShadow: 'none', background: 'var(--surface-2)' }}
                  aria-label={b.text}
                >
                  <div className="cardInner">
                    <div style={{ fontWeight: 950, fontSize: 'var(--text-lg)', lineHeight: 1.15 }}>{b.text}</div>
                    <div style={{ marginTop: 10 }}>{renderUl(next.items, `takeaways-ul-${idx}`)}</div>
                  </div>
                </section>,
              )
              idx += 1
              continue
            }
          }

        if (b.kind === 'h') {
          const Tag = b.level === 4 ? 'h4' : 'h3'
          out.push(
            <Tag
              key={idx}
              id={b.id}
              className="longformHeading"
              style={{ margin: idx === 0 ? 0 : '14px 0 0 0', fontWeight: 950, lineHeight: 1.18 }}
            >
              <FormattedInline text={b.text} />
            </Tag>
          )
          continue
        }

        if (b.kind === 'image') {
          out.push(
            <button
              key={idx}
              type="button"
              className="inlineImageCard longformWide not-prose"
              onClick={() => onOpenImage?.(b.src, b.alt)}
              title="點擊放大"
              aria-label={`查看大圖：${b.alt}`}
              style={{ marginTop: idx === 0 ? 0 : 10 }}
            >
              <img src={b.src} alt={b.alt} loading="lazy" />
              <div className="inlineImageCaption">{b.alt}</div>
            </button>
          )
          continue
        }

        if (b.kind === 'quote') {
          out.push(
            <blockquote
              key={idx}
              style={{
                margin: idx === 0 ? 0 : '10px 0 0 0',
                padding: '10px 12px',
                borderLeft: '4px solid color-mix(in oklab, var(--accent) 25%, var(--hairline))',
                background: 'color-mix(in oklab, var(--surface-2) 55%, white)',
                borderRadius: 12,
              }}
            >
              <FormattedText text={b.text} className={className} />
            </blockquote>
          )
          continue
        }

        if (b.kind === 'ul') {
          out.push(<div key={idx}>{renderUl(b.items, `ul-${idx}`)}</div>)
          continue
        }

        if (b.kind === 'ol') {
          out.push(
            <ol key={idx} style={{ margin: 0, paddingLeft: 22 }}>
              {b.items.map((it, i) => (
                <li key={`${idx}-${i}-${it}`} style={{ marginTop: i === 0 ? 0 : 6 }}>
                  <FormattedInline text={it} />
                </li>
              ))}
            </ol>
          )
          continue
        }

        const hasText = b.text.trim().length > 0
        out.push(
          <div key={idx} style={{ marginTop: idx === 0 ? 0 : 10 }}>
            {hasText ? (
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                <FormattedInline text={b.text} />
              </p>
            ) : null}

            {b.galleries.length > 0 ? (
              <div
                className="not-prose"
                style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: hasText ? 10 : 0 }}
              >
                {b.galleries.map((g, i) => {
                  const title = g.title || '圖庫'
                  return (
                    <button
                      key={`${idx}-g-${i}-${title}`}
                      type="button"
                      className="btn"
                      style={{ minHeight: 34, padding: '8px 12px' }}
                      onClick={() => onOpenGallery?.(g.images, title)}
                      aria-label={`開啟圖庫：${title}`}
                      title="點擊開啟圖庫"
                    >
                      {title === '圖庫' ? '圖庫' : `圖庫：${title}`}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
        )
        }
        return out
      })()}
    </div>
  )
}

