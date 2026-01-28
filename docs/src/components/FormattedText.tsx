import React from 'react'

const LINK_MD_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g
const BARE_URL_RE = /(https?:\/\/[^\s)]+)(?![^<]*>)/g

type InlineToken =
  | { kind: 'text'; value: string }
  | { kind: 'code'; value: string }
  | { kind: 'link'; label: string; href: string }
  | { kind: 'bold'; value: string }
  | { kind: 'italic'; value: string }
  | { kind: 'url'; href: string }

function tokenizeInline(input: string): InlineToken[] {
  // Priority order:
  // 1) inline code: `...`
  // 2) markdown links: [label](https://...)
  // 3) bold: **...**
  // 4) italic: *...*  (very simple; avoids matching "**")
  // 5) bare URLs
  //
  // This is a deliberately small, safe subset (no HTML, no nested parsing guarantees).
  const tokens: InlineToken[] = []

  // Split by inline code first (odd parts are code)
  const codeParts = input.split('`')
  for (let i = 0; i < codeParts.length; i++) {
    const part = codeParts[i] ?? ''
    const isCode = i % 2 === 1
    if (!part) continue
    if (isCode) {
      tokens.push({ kind: 'code', value: part })
      continue
    }

    // Parse markdown links inside non-code text
    let last = 0
    for (const m of part.matchAll(LINK_MD_RE)) {
      const idx = m.index ?? -1
      if (idx < 0) continue

      const before = part.slice(last, idx)
      if (before) tokens.push({ kind: 'text', value: before })

      const label = (m[1] ?? '').trim()
      const href = (m[2] ?? '').trim()
      tokens.push({ kind: 'link', label: label || href, href })

      last = idx + m[0].length
    }
    const rest = part.slice(last)
    if (rest) tokens.push({ kind: 'text', value: rest })
  }

  // Expand bold/italic + bare urls only within text tokens (don’t touch code/link)
  const expanded: InlineToken[] = []
  for (const t of tokens) {
    if (t.kind !== 'text') {
      expanded.push(t)
      continue
    }

    // Bold: **...**
    const boldParts: InlineToken[] = []
    let cursor = 0
    const s = t.value
    const boldRe = /\*\*([^*]+)\*\*/g
    for (const m of s.matchAll(boldRe)) {
      const idx = m.index ?? -1
      if (idx < 0) continue
      if (idx > cursor) boldParts.push({ kind: 'text', value: s.slice(cursor, idx) })
      const inner = (m[1] ?? '').trim()
      if (inner) boldParts.push({ kind: 'bold', value: inner })
      cursor = idx + m[0].length
    }
    if (cursor < s.length) boldParts.push({ kind: 'text', value: s.slice(cursor) })

    // Italic: *...* (skip segments that still contain "**")
    for (const bt of boldParts) {
      if (bt.kind !== 'text') {
        expanded.push(bt)
        continue
      }
      const s2 = bt.value
      let cursor2 = 0
      const italicRe = /(^|[^*])\*([^*\n]+)\*/g
      // We keep the leading char (group1) as plain text.
      for (const m of s2.matchAll(italicRe)) {
        const idx = m.index ?? -1
        if (idx < 0) continue
        const lead = m[1] ?? ''
        const inner = (m[2] ?? '').trim()

        const before = s2.slice(cursor2, idx)
        if (before) expanded.push({ kind: 'text', value: before })

        if (lead) expanded.push({ kind: 'text', value: lead })
        if (inner) expanded.push({ kind: 'italic', value: inner })

        cursor2 = idx + m[0].length
      }
      if (cursor2 < s2.length) expanded.push({ kind: 'text', value: s2.slice(cursor2) })
    }
  }

  // Auto-link bare urls in remaining text tokens
  const final: InlineToken[] = []
  for (const t of expanded) {
    if (t.kind !== 'text') {
      final.push(t)
      continue
    }
    const s = t.value
    let last = 0
    for (const m of s.matchAll(BARE_URL_RE)) {
      const idx = m.index ?? -1
      if (idx < 0) continue
      const href = (m[1] ?? '').trim()
      if (!href) continue
      if (idx > last) final.push({ kind: 'text', value: s.slice(last, idx) })
      final.push({ kind: 'url', href })
      last = idx + m[0].length
    }
    if (last < s.length) final.push({ kind: 'text', value: s.slice(last) })
  }

  return final
}

export function FormattedInline({ text }: { text: string }) {
  const tokens = tokenizeInline(text)
  if (tokens.length === 0) return null

  return (
    <>
      {tokens.map((t, i) => {
        if (t.kind === 'text') return <React.Fragment key={i}>{t.value}</React.Fragment>
        if (t.kind === 'code') return <code key={i}>{t.value}</code>
        if (t.kind === 'bold') return <strong key={i}>{t.value}</strong>
        if (t.kind === 'italic') return <em key={i}>{t.value}</em>
        if (t.kind === 'link')
          return (
            <a key={i} href={t.href} target="_blank" rel="noreferrer noopener">
              {t.label}
            </a>
          )
        if (t.kind === 'url')
          return (
            <a key={i} href={t.href} target="_blank" rel="noreferrer noopener">
              {t.href}
            </a>
          )
        return null
      })}
    </>
  )
}

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'checklist'; items: Array<{ checked: boolean; text: string }> }
  | { kind: 'quote'; text: string }
  | { kind: 'h'; level: 2 | 3 | 4; text: string }

function parseBlocks(text: string): Block[] {
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

  return blocks.map((lines) => {
    const trimmed = lines.map((l) => l.trim())
    // Headings: treat a single-line block as heading if it starts with ##/###
    if (trimmed.length === 1) {
      const one = trimmed[0] ?? ''
      // Allow "###（中文...）" (no space) as well as "### Title".
      const h4 = /^###\s*(.+)$/.exec(one)
      if (h4) return { kind: 'h', level: 4, text: (h4[1] ?? '').trim() }
      const h3 = /^##\s*(.+)$/.exec(one)
      if (h3) return { kind: 'h', level: 3, text: (h3[1] ?? '').trim() }
    }

    // Block quote: all lines start with ">"
    const isQuote = trimmed.every((l) => /^>\s?/.test(l))
    if (isQuote) {
      const q = trimmed.map((l) => l.replace(/^>\s?/, '')).join('\n').trim()
      return { kind: 'quote', text: q }
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
      return { kind: 'checklist', items }
    }

    const isUl = trimmed.every((l) => /^[-*]\s+/.test(l))
    if (isUl) {
      return { kind: 'ul', items: trimmed.map((l) => l.replace(/^[-*]\s+/, '').trim()) }
    }
    const isOl = trimmed.every((l) => /^\d+\.\s+/.test(l))
    if (isOl) {
      return { kind: 'ol', items: trimmed.map((l) => l.replace(/^\d+\.\s+/, '').trim()) }
    }
    return { kind: 'p', text: lines.join('\n').trim() }
  })
}

export function FormattedText({
  text,
  className = 'prose',
}: {
  text: string
  className?: string
}) {
  const blocks = parseBlocks(text)

  return (
    <div className={className}>
      {blocks.map((b, idx) => {
        if (b.kind === 'ul') {
          return (
            <ul key={idx}>
              {b.items.map((it, i) => (
                <li key={`${idx}-${i}`}>
                  <FormattedInline text={it} />
                </li>
              ))}
            </ul>
          )
        }
        if (b.kind === 'ol') {
          return (
            <ol key={idx}>
              {b.items.map((it, i) => (
                <li key={`${idx}-${i}`}>
                  <FormattedInline text={it} />
                </li>
              ))}
            </ol>
          )
        }
        if (b.kind === 'checklist') {
          return (
            <ul key={idx} style={{ listStyle: 'none', paddingLeft: 0 }}>
              {b.items.map((it, i) => (
                <li key={`${idx}-${i}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: i === 0 ? 0 : 8 }}>
                  <span aria-hidden="true" style={{ width: 18, textAlign: 'center' }}>
                    {it.checked ? '☑' : '☐'}
                  </span>
                  <span>
                    <FormattedInline text={it.text} />
                  </span>
                </li>
              ))}
            </ul>
          )
        }
        if (b.kind === 'quote') {
          return (
            <blockquote
              key={idx}
              style={{
                margin: 0,
                padding: '10px 12px',
                borderLeft: '4px solid color-mix(in oklab, var(--accent) 25%, var(--hairline))',
                background: 'color-mix(in oklab, var(--surface-2) 55%, white)',
                borderRadius: 12,
              }}
            >
              <FormattedText text={b.text} className={className} />
            </blockquote>
          )
        }
        if (b.kind === 'h') {
          const Tag = b.level === 4 ? 'h4' : b.level === 3 ? 'h3' : 'h2'
          return (
            <Tag key={idx} style={{ margin: idx === 0 ? 0 : '12px 0 0 0', fontWeight: 900, lineHeight: 1.2 }}>
              <FormattedInline text={b.text} />
            </Tag>
          )
        }
        return (
          <p key={idx} style={{ whiteSpace: 'pre-wrap' }}>
            <FormattedInline text={b.text} />
          </p>
        )
      })}
    </div>
  )
}

