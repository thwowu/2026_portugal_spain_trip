import type { BasicBlock } from './types'

export function parseBasicBlocks(text: string): BasicBlock[] {
  const rawLines = text.replace(/\r\n/g, '\n').split('\n')

  const blocks: string[][] = []
  let buf: string[] = []
  const flush = () => {
    const cleaned = buf.map((l) => l.trimEnd())
    const hasAny = cleaned.some((l) => l.trim().length > 0)
    if (hasAny) blocks.push(cleaned)
    buf = []
  }

  for (const line of rawLines) {
    if (line.trim() === '') {
      flush()
    } else {
      buf.push(line)
    }
  }
  flush()

  const out: BasicBlock[] = []

  for (const lines of blocks) {
    const trimmed = lines.map((l) => l.trim())

    // Headings: allow ## / ### / #### as the FIRST line of a block.
    // This prevents leaking raw "###" when headings are immediately followed by text
    // without a blank line.
    {
      const first = trimmed[0] ?? ''
      // Allow headings with or without a space after hashes, e.g. "###（中文...）".
      const h4 = /^####\s*(.+)$/.exec(first)
      if (h4) {
        const headingText = (h4[1] ?? '').trim()
        out.push({ kind: 'h', level: 4, text: headingText })
        const rest = lines.slice(1).join('\n').trim()
        if (rest) out.push(...parseBasicBlocks(rest))
        continue
      }
      const h3 = /^###\s*(.+)$/.exec(first)
      if (h3) {
        const headingText = (h3[1] ?? '').trim()
        out.push({ kind: 'h', level: 3, text: headingText })
        const rest = lines.slice(1).join('\n').trim()
        if (rest) out.push(...parseBasicBlocks(rest))
        continue
      }
      const h2 = /^##\s*(.+)$/.exec(first)
      if (h2) {
        const headingText = (h2[1] ?? '').trim()
        out.push({ kind: 'h', level: 2, text: headingText })
        const rest = lines.slice(1).join('\n').trim()
        if (rest) out.push(...parseBasicBlocks(rest))
        continue
      }
    }

    // Block quote: all lines start with ">"
    const isQuote = trimmed.every((l) => /^>\s?/.test(l))
    if (isQuote) {
      const q = trimmed.map((l) => l.replace(/^>\s?/, '')).join('\n').trim()
      out.push({ kind: 'quote', text: q })
      continue
    }

    // Checklist: "- [ ]" / "- [x]"
    const isChecklist = trimmed.every((l) => /^[-*]\s+\[( |x|X)\]\s+/.test(l))
    if (isChecklist) {
      const items = trimmed.map((l) => {
        const m = /^[-*]\s+\[( |x|X)\]\s+(.+)$/.exec(l)
        const checked = (m?.[1] ?? '').toLowerCase() === 'x'
        const txt = (m?.[2] ?? '').trim()
        return { checked, text: txt }
      })
      out.push({ kind: 'checklist', items })
      continue
    }

    const isUl = trimmed.every((l) => /^[-*]\s+/.test(l))
    if (isUl) {
      out.push({ kind: 'ul', items: trimmed.map((l) => l.replace(/^[-*]\s+/, '').trim()) })
      continue
    }

    const isOl = trimmed.every((l) => /^\d+\.\s+/.test(l))
    if (isOl) {
      out.push({ kind: 'ol', items: trimmed.map((l) => l.replace(/^\d+\.\s+/, '').trim()) })
      continue
    }

    out.push({ kind: 'p', text: lines.join('\n').trim() })
  }

  return out
}

