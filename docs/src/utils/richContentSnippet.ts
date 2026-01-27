const GALLERY_TOKEN_RE = /\{\{gallery(?::([^|}]+))?\|([^}]+)\}\}/g
const IMAGE_MD_RE = /^!\[([^\]]*)\]\((.+)\)$/
const MD_LINK_RE = /^\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/

export function firstContentSnippet(content: string, maxLen = 120): string {
  const s = (content ?? '').replace(/\r\n/g, '\n')
  const lines = s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !l.startsWith('#'))
    .map((l) => l.replace(GALLERY_TOKEN_RE, '').trim())
    .filter(Boolean)
    .filter((l) => !IMAGE_MD_RE.test(l))
    .filter((l) => !MD_LINK_RE.test(l))

  const first = lines[0] ?? ''
  if (!first) return ''
  if (first.length <= maxLen) return first
  return first.slice(0, maxLen).trimEnd() + '…'
}

