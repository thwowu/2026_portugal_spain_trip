import type { InlineToken } from './types'
import { splitTrailingUrlPunct } from './utils'

const LINK_MD_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g
const BARE_URL_RE = /(https?:\/\/[^\s)]+)(?![^<]*>)/g
const BI_RE = /\{\{bi:([^|\n}]+?)\|([^}\n]+?)\}\}/g
// Keep bilink href strict (http/https only). Rendering also sanitizes defensively.
const BILINK_RE = /\{\{bilink:([^|\n}]+?)\|([^|\n}]+?)\|(https?:\/\/[^}\n]+?)\}\}/g

export function tokenizeInline(input: string): InlineToken[] {
  // Priority order:
  // 1) inline code: `...`
  // 2) markdown links: [label](https://...)
  // 3) bilingual: {{bi:中文|English}} (safe syntax)
  // 4) bilingual link: {{bilink:中文|English|https://...}} (safe syntax)
  // 3) mark: ::...::
  // 4) bold: **...**
  // 5) italic: *...*  (very simple; avoids matching "**")
  // 6) bare URLs
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

  // Expand mark/bold/italic + bare urls only within text tokens (don’t touch code/link)
  const expanded: InlineToken[] = []
  for (const t of tokens) {
    if (t.kind !== 'text') {
      expanded.push(t)
      continue
    }

    // Bilingual link: {{bilink:中文|English|href}}
    const bilinkParts: InlineToken[] = []
    {
      let cursor0 = 0
      const s0 = t.value
      for (const m of s0.matchAll(BILINK_RE)) {
        const idx = m.index ?? -1
        if (idx < 0) continue
        if (idx > cursor0) bilinkParts.push({ kind: 'text', value: s0.slice(cursor0, idx) })
        const zh = (m[1] ?? '').trim()
        const en = (m[2] ?? '').trim()
        const href = (m[3] ?? '').trim()
        if (zh && en && href) bilinkParts.push({ kind: 'bilingual_link', zh, en, href })
        cursor0 = idx + m[0].length
      }
      if (cursor0 < s0.length) bilinkParts.push({ kind: 'text', value: s0.slice(cursor0) })
    }

    // Bilingual: {{bi:中文|English}}
    const biParts: InlineToken[] = []
    {
      for (const bp of bilinkParts) {
        if (bp.kind !== 'text') {
          biParts.push(bp)
          continue
        }
        let cursor0 = 0
        const s0 = bp.value
        for (const m of s0.matchAll(BI_RE)) {
          const idx = m.index ?? -1
          if (idx < 0) continue
          if (idx > cursor0) biParts.push({ kind: 'text', value: s0.slice(cursor0, idx) })
          const zh = (m[1] ?? '').trim()
          const en = (m[2] ?? '').trim()
          if (zh && en) biParts.push({ kind: 'bilingual', zh, en })
          cursor0 = idx + m[0].length
        }
        if (cursor0 < s0.length) biParts.push({ kind: 'text', value: s0.slice(cursor0) })
      }
    }

    // Mark: ::...::
    const markParts: InlineToken[] = []
    const markRe = /::([^\n]+?)::/g
    for (const bp of biParts) {
      if (bp.kind !== 'text') {
        markParts.push(bp)
        continue
      }
      let cursor0 = 0
      const s0 = bp.value
      for (const m of s0.matchAll(markRe)) {
        const idx = m.index ?? -1
        if (idx < 0) continue
        if (idx > cursor0) markParts.push({ kind: 'text', value: s0.slice(cursor0, idx) })
        const inner = (m[1] ?? '').trim()
        if (inner) markParts.push({ kind: 'mark', value: inner })
        cursor0 = idx + m[0].length
      }
      if (cursor0 < s0.length) markParts.push({ kind: 'text', value: s0.slice(cursor0) })
    }

    // Bold: **...** (within remaining text tokens)
    const boldParts: InlineToken[] = []
    const boldRe = /\*\*([^*]+)\*\*/g
    // If we have mark tokens, we must preserve them while parsing bold.
    // We do this by running bold parsing per text token in markParts.
    for (const mp of markParts) {
      if (mp.kind !== 'text') {
        boldParts.push(mp)
        continue
      }
      const seg = mp.value
      let cursorBold = 0
      for (const m of seg.matchAll(boldRe)) {
        const idx = m.index ?? -1
        if (idx < 0) continue
        if (idx > cursorBold) boldParts.push({ kind: 'text', value: seg.slice(cursorBold, idx) })
        const inner = (m[1] ?? '').trim()
        if (inner) boldParts.push({ kind: 'bold', value: inner })
        cursorBold = idx + m[0].length
      }
      if (cursorBold < seg.length) boldParts.push({ kind: 'text', value: seg.slice(cursorBold) })
    }

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
      const hrefRaw = (m[1] ?? '').trim()
      const { url: href, punct } = splitTrailingUrlPunct(hrefRaw)
      if (!href) continue
      if (idx > last) final.push({ kind: 'text', value: s.slice(last, idx) })
      final.push({ kind: 'url', href })
      if (punct) final.push({ kind: 'text', value: punct })
      last = idx + m[0].length
    }
    if (last < s.length) final.push({ kind: 'text', value: s.slice(last) })
  }

  return final
}

/**
 * Convert our supported inline markdown subset into plain text.
 * Useful for aria-labels where raw markdown punctuation ("**", "`") is noisy.
 */
export function inlineToPlainText(input: string): string {
  const tokens = tokenizeInline(input ?? '')
  const raw = tokens
    .map((t) => {
      if (t.kind === 'text') return t.value
      if (t.kind === 'code') return t.value
      if (t.kind === 'bilingual') return t.zh
      if (t.kind === 'bilingual_link') return t.zh
      if (t.kind === 'bold') return t.value
      if (t.kind === 'italic') return t.value
      if (t.kind === 'mark') return t.value
      if (t.kind === 'link') return t.label || t.href
      if (t.kind === 'url') return t.href
      return ''
    })
    .join('')

  return raw.replace(/\s+/g, ' ').trim()
}

