import { useMemo } from 'react'
import type { GalleryImage } from './GalleryLightbox'
import { FormattedInline } from './FormattedText'
import { withBaseUrl } from '../utils/asset'

const GALLERY_TOKEN_RE = /\{\{gallery(?::([^|}]+))?\|([^}]+)\}\}/g
const IMAGE_MD_RE = /^!\[([^\]]*)\]\((.+)\)$/
const MD_LINK_RE = /^\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/
const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i

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
  | { kind: 'h'; level: 3 | 4; text: string }
  | { kind: 'image'; alt: string; src: string }
  | { kind: 'p'; text: string; galleries: Array<{ title: string; images: GalleryImage[] }> }

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
        out.push({ kind: 'h', level: 4, text: (h4[1] ?? '').trim() })
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
        out.push({ kind: 'h', level: 3, text: (h3[1] ?? '').trim() })
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
  onOpenImage,
  onOpenGallery,
}: {
  content: string
  className?: string
  onOpenImage?: (src: string, title: string) => void
  onOpenGallery?: (images: GalleryImage[], title: string) => void
}) {
  const blocks = useMemo(() => parseBlocks(content), [content])

  return (
    <div className={className}>
      {blocks.map((b, idx) => {
        if (b.kind === 'h') {
          const Tag = b.level === 4 ? 'h4' : 'h3'
          return (
            <Tag key={idx} style={{ margin: idx === 0 ? 0 : '14px 0 0 0', fontWeight: 950, lineHeight: 1.18 }}>
              <FormattedInline text={b.text} />
            </Tag>
          )
        }

        if (b.kind === 'image') {
          return (
            <button
              key={idx}
              type="button"
              className="inlineImageCard"
              onClick={() => onOpenImage?.(b.src, b.alt)}
              title="點擊放大"
              aria-label={`查看大圖：${b.alt}`}
              style={{ marginTop: idx === 0 ? 0 : 10 }}
            >
              <img src={b.src} alt={b.alt} loading="lazy" />
              <div className="inlineImageCaption">{b.alt}</div>
            </button>
          )
        }

        const hasText = b.text.trim().length > 0
        return (
          <div key={idx} style={{ marginTop: idx === 0 ? 0 : 10 }}>
            {hasText ? (
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                <FormattedInline text={b.text} />
              </p>
            ) : null}

            {b.galleries.length > 0 ? (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: hasText ? 10 : 0 }}>
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
      })}
    </div>
  )
}

