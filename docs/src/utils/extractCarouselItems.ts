import { withBaseUrl } from './asset'
import { firstContentSnippet } from './richContentSnippet'

// Match exactly "###" headings (NOT "#### ...").
// Important: we use "###" to define carousel slices; deeper headings are content within a slice.
const H3_RE = /^###(?!#)\s*(.+)$/
const CARD_RE = /^\s*@card:\s*(.+)\s*$/

// Matches the same authoring token used by RichContent.
const GALLERY_TOKEN_RE = /\{\{gallery(?::([^|}]+))?\|([^}]+)\}\}/g

const IMAGE_MD_RE = /!\[[^\]]*\]\(([^)\s]+)\)/

export type H3Slice = {
  title: string
  /** Markdown content for this slice (without the leading ### title row). */
  content: string
  /** Optional one-line carousel summary (from @card: ...) */
  card?: string
  /** Optional resolved image src */
  imageSrc?: string
}

export type CarouselItem = {
  title: string
  summary: string
  content: string
  imageSrc?: string
}

export function stripCardLinesFromContent(markdown: string): string {
  const lines = (markdown ?? '').replace(/\r\n/g, '\n').split('\n')
  return lines
    .filter((l) => !CARD_RE.test(l))
    .join('\n')
    .trim()
}

function firstGalleryImageSrc(markdown: string): string | null {
  for (const m of markdown.matchAll(GALLERY_TOKEN_RE)) {
    const urls = (m[2] ?? '')
      .split('|')
      .map((x) => x.trim())
      .filter((x) => x.startsWith('/') || x.startsWith('http://') || x.startsWith('https://'))
    const first = urls[0]
    if (first) return withBaseUrl(first)
  }
  return null
}

function firstInlineImageSrc(markdown: string): string | null {
  const m = IMAGE_MD_RE.exec(markdown)
  const src = (m?.[1] ?? '').trim()
  if (!src) return null
  if (src.startsWith('/') || src.startsWith('http://') || src.startsWith('https://')) return withBaseUrl(src)
  return null
}

export function extractH3Slices(sectionMarkdown: string): H3Slice[] {
  const text = (sectionMarkdown ?? '').replace(/\r\n/g, '\n')
  const lines = text.split('\n')

  const out: H3Slice[] = []

  let curTitle: string | null = null
  let curLines: string[] = []

  const flush = () => {
    if (!curTitle) return
    const raw = curLines.join('\n').trim()
    if (!raw) {
      curTitle = null
      curLines = []
      return
    }

    let card: string | undefined
    const kept: string[] = []
    for (const l of raw.split('\n')) {
      const m = CARD_RE.exec(l)
      if (m && !card) {
        const v = (m[1] ?? '').trim()
        if (v) card = v
        continue
      }
      kept.push(l)
    }

    const content = kept.join('\n').trim()
    const imageSrc = firstGalleryImageSrc(raw) ?? firstInlineImageSrc(raw) ?? undefined

    out.push({ title: curTitle, content, card, imageSrc })
    curTitle = null
    curLines = []
  }

  for (const l of lines) {
    const h3 = H3_RE.exec(l.trim())
    if (h3) {
      flush()
      const t = (h3[1] ?? '').trim()
      if (!t) continue
      curTitle = t
      curLines = []
      continue
    }
    if (!curTitle) continue // ignore preface before first H3
    curLines.push(l)
  }
  flush()

  return out
}

export function extractH3CarouselItems(
  sectionMarkdown: string,
  opts?: {
    /** Used when no @card line is provided. */
    snippetMaxLen?: number
  },
): CarouselItem[] {
  const slices = extractH3Slices(sectionMarkdown)
  const maxLen = opts?.snippetMaxLen ?? 120

  return slices
    .map((s) => {
      const content = stripCardLinesFromContent(s.content)
      const summary = (s.card ?? '').trim() || firstContentSnippet(content, maxLen)
      return {
        title: s.title,
        summary,
        content,
        imageSrc: s.imageSrc,
      }
    })
    .filter((x) => x.title.trim().length > 0)
}

