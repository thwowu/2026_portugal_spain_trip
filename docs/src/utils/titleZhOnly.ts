import { tokenizeInline } from '../markdownLite/inline'

function cleanupPunctuation(s: string) {
  let out = (s ?? '').replace(/\s+/g, ' ').trim()

  // Remove empty parentheses created by stripping Latin text.
  out = out.replace(/\(\s*\)/g, '')
  out = out.replace(/（\s*）/g, '')

  // Clean up stray separators inside Chinese parentheses.
  out = out.replace(/（[，,、\s]+/g, '（')
  out = out.replace(/[，,、\s]+）/g, '）')

  // Remove spaces before common punctuation.
  out = out.replace(/\s+([),.;:!?，。；：！？、》」）】])/g, '$1')

  return out.trim()
}

function stripLatinButKeepUseful(input: string) {
  let s = (input ?? '').toString()

  // Keep "Day 12" semantics but render in Chinese.
  s = s.replace(/\bday\s*(\d+)\b/gi, '第$1天')

  // Remove Latin script letters (including diacritics).
  // Keep digits, CJK, symbols (→, /, ·), and punctuation.
  s = s.replace(/\p{Script=Latin}+/gu, '')

  return cleanupPunctuation(s)
}

/**
 * Title rendering rule: keep it simple and Chinese-only.
 *
 * - `{{bi:中文|English}}` → `中文` (no hover, no English)
 * - `{{bilink:中文|English|href}}` → `中文`
 * - `[中文 English](https://...)` → `中文` (Latin stripped)
 * - Converts `Day 12 ...` → `第12天 ...`
 */
export function titleZhOnly(input: string): string {
  const tokens = tokenizeInline(input ?? '')
  if (tokens.length === 0) return ''

  const raw = tokens
    .map((t) => {
      if (t.kind === 'bilingual') return t.zh
      if (t.kind === 'bilingual_link') return t.zh
      if (t.kind === 'link') return t.label
      if (t.kind === 'url') return '' // titles shouldn't surface raw URLs
      if (t.kind === 'code') return t.value
      if (t.kind === 'bold') return t.value
      if (t.kind === 'italic') return t.value
      if (t.kind === 'mark') return t.value
      if (t.kind === 'text') return t.value
      return ''
    })
    .join('')

  return stripLatinButKeepUseful(raw)
}

