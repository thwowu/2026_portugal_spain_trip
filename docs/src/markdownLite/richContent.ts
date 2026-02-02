import { splitTrailingUrlPunct } from './utils'

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

type ResolveUrl = (src: string) => string

function defaultResolveUrl(src: string) {
  return src
}

export type RichUlItem = { text: string; children: RichUlItem[] }

export type RichBlock =
  | { kind: 'h'; level: 3 | 4; text: string; id: string }
  | { kind: 'image'; alt: string; src: string }
  | { kind: 'quote'; text: string }
  | { kind: 'ul'; items: RichUlItem[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'p'; text: string; galleries: Array<{ title: string; images: Array<{ src: string }> }> }

function buildUlTree(rows: Array<{ level: number; text: string }>): RichUlItem[] {
  const root: RichUlItem[] = []
  const stack: Array<{ level: number; items: RichUlItem[] }> = [{ level: -1, items: root }]

  for (const r of rows) {
    const level = Math.max(0, r.level)
    const text = (r.text ?? '').trim()
    if (!text) continue

    while (stack.length > 1 && level <= stack[stack.length - 1]!.level) stack.pop()

    const parent = stack[stack.length - 1]!
    const item: RichUlItem = { text, children: [] }

    if (level > parent.level + 1) {
      // Clamp overly-indented lines to avoid building empty intermediary levels.
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

function extractGalleryImages(tokenMatch: RegExpExecArray, resolveUrl: ResolveUrl) {
  const title = (tokenMatch[1] ?? '').trim()
  const urls = (tokenMatch[2] ?? '')
    .split('|')
    .map((x) => x.trim())
    .filter((x) => x.startsWith('/') || x.startsWith('http://') || x.startsWith('https://'))
    // Avoid dynamic "featured" images (unstable + more tracking-y)
    .filter((x) => !x.startsWith('https://source.unsplash.com/featured/'))

  const images = urls.map((src) => ({ src: resolveUrl(src) }))
  return { title, images }
}

export function parseRichBlocks(
  content: string,
  opts?: {
    resolveUrl?: ResolveUrl
  },
): RichBlock[] {
  const resolveUrl = opts?.resolveUrl ?? defaultResolveUrl
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

  const out: RichBlock[] = []
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
    {
      const first = trimmed[0] ?? ''
      // Allow headings with or without a space after hashes, e.g. "###（中文...）".
      const h4 = /^####\s*(.+)$/.exec(first)
      if (h4) {
        const text = (h4[1] ?? '').trim()
        out.push({ kind: 'h', level: 4, text, id: makeHeadingId(text) })
        const rest = lines.slice(1).join('\n').trim()
        if (rest) {
          const galleries: Array<{ title: string; images: Array<{ src: string }> }> = []
          for (const m of rest.matchAll(GALLERY_TOKEN_RE)) {
            const { title, images } = extractGalleryImages(m as RegExpExecArray, resolveUrl)
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
          const galleries: Array<{ title: string; images: Array<{ src: string }> }> = []
          for (const m of rest.matchAll(GALLERY_TOKEN_RE)) {
            const { title, images } = extractGalleryImages(m as RegExpExecArray, resolveUrl)
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
        out.push({
          kind: 'ol',
          items: trimmed.map((l) => l.replace(/^\d+\.\s+/, '').trim()).filter(Boolean),
        })
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
          out.push({ kind: 'image', alt: label, src: resolveUrl(href) })
          continue
        }
      }

      const img = IMAGE_MD_RE.exec(one)
      if (img) {
        const alt = (img[1] || '圖片').trim() || '圖片'
        const srcRaw = (img[2] || '').trim()
        if (
          !isDynamicUnsplash(srcRaw) &&
          (srcRaw.startsWith('/') || srcRaw.startsWith('http://') || srcRaw.startsWith('https://'))
        ) {
          out.push({ kind: 'image', alt, src: resolveUrl(srcRaw) })
          continue
        }
      }

      if (one.startsWith('http://') || one.startsWith('https://')) {
        const { url } = splitTrailingUrlPunct(one)
        if (!isDynamicUnsplash(url) && isImageLikeUrl(url)) {
          out.push({ kind: 'image', alt: '圖片', src: resolveUrl(url) })
          continue
        }
      }
    }

    const paragraph = lines.join('\n').trim()
    const galleries: Array<{ title: string; images: Array<{ src: string }> }> = []

    // Collect all gallery tokens inside this paragraph, but keep the paragraph text (token removed).
    let cleaned = paragraph
    for (const m of paragraph.matchAll(GALLERY_TOKEN_RE)) {
      const { title, images } = extractGalleryImages(m as RegExpExecArray, resolveUrl)
      if (images.length > 0) galleries.push({ title, images })
    }
    cleaned = cleaned.replace(GALLERY_TOKEN_RE, '').trim()

    out.push({ kind: 'p', text: cleaned, galleries })
  }

  return out
}

