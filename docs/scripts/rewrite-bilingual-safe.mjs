import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const CONTENT_DIR = path.resolve(__dirname, '../src/content')

const TARGET_RE = /^(attractions\.|stays\.|transport\.|extensions\.|itinerary\.md$)/i
const GALLERY_TOKEN_RE = /\{\{gallery(?::([^|}]+))?\|([^}]+)\}\}/g

function parseArgs(argv) {
  const args = new Set(argv)
  const check = args.has('--check')
  const write = args.has('--write')
  if (!check && !write) return { check: true, write: false }
  return { check, write }
}

function hasLatin(s) {
  return /[A-Za-z]/.test(s ?? '')
}

function hasCjk(s) {
  return /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af]/.test(s ?? '')
}

function findTrailingTerm(s, endIdx) {
  // Scan backwards from endIdx-1 to find a "term-like" token.
  // Stop at whitespace or obvious punctuation boundaries.
  const isAllowed = (ch) => /[\p{Letter}\p{Number}\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af·・'’\-\/]/u.test(ch)
  let i = Math.max(0, Math.min(endIdx - 1, s.length - 1))
  while (i >= 0) {
    const ch = s[i]
    if (!isAllowed(ch)) break
    i--
  }
  const start = i + 1
  const term = s.slice(start, endIdx).trim()
  return { start, term }
}

function splitBiTokenIfNeeded(zh, en) {
  // If zh accidentally contains a clause (e.g. "這裡主要是石灰岩"), split into:
  //   prefix: "這裡主要是"
  //   term:   "石灰岩"
  // Keep it conservative: only split when there is a clear trailing CJK run.
  const z = String(zh ?? '').trim()
  const e = String(en ?? '').trim()
  const stop = /[的是了會想要你我他她它這那就如果因為可以讓把用在先再最只不也很從和或與個並]/u

  // Prefer splitting after common clause markers.
  const splitters = ['就是', '主要是', '是', '為', '叫', '的', '在', '於', '從']
  for (const sp of splitters) {
    const idx = z.lastIndexOf(sp)
    if (idx === -1) continue
    const after = z.slice(idx + sp.length).trim()
    const before = z.slice(0, idx + sp.length)
    if (!after) continue
    if (!/^[\u4e00-\u9fff\u3400-\u4dbf]{2,12}$/u.test(after)) continue
    if (!stop.test(before)) continue
    return { prefix: before, term: after, en: e }
  }

  // Fallback: split into "prefix + trailing CJK run" when the prefix clearly contains stopwords.
  const m = /^(.*?)([\u4e00-\u9fff\u3400-\u4dbf]{2,10})$/u.exec(z)
  if (!m) return null
  const prefix = String(m[1] ?? '')
  const term = String(m[2] ?? '')
  if (!prefix.trim()) return null
  if (!stop.test(prefix)) return null
  return { prefix, term, en: e }
}

function joinPrefix(prefix, token) {
  const p = String(prefix ?? '')
  const needsSpace = p.length > 0 && !/[\s，。、；：:!?]$/.test(p)
  return `${p}${needsSpace ? ' ' : ''}${token}`
}

function splitInlineCode(text) {
  // odd parts are code, even parts are non-code
  return String(text ?? '').split('`')
}

function deriveEnLabelFromHref(href) {
  try {
    const u = new URL(href)
    const qp = u.searchParams.get('query') || u.searchParams.get('q')
    if (qp) return decodeURIComponent(qp.replace(/\+/g, ' ')).trim()
    const host = (u.hostname || '').replace(/^www\./, '')
    if (host) return host
  } catch {
    // ignore
  }
  return 'link'
}

function maskGalleryTokens(seg) {
  const stash = []
  let idx = 0
  const out = seg.replace(GALLERY_TOKEN_RE, (m) => {
    const key = `__GALLERY_TOKEN_${idx}__`
    stash.push({ key, value: m })
    idx++
    return key
  })
  return { out, stash }
}

function unmaskGalleryTokens(seg, stash) {
  let out = seg
  for (const it of stash) out = out.replaceAll(it.key, it.value)
  return out
}

function convertSegment(seg, findings) {
  if (!seg) return seg
  const { out: masked, stash } = maskGalleryTokens(seg)
  let s = masked

  // 0) Undo wrong bi tokens where en contains CJK (these are annotations, not translations).
  s = s.replace(/\{\{bi:([^|\n}]+?)\|([^}\n]+?)\}\}/g, (m, zhRaw, enRaw) => {
    const zh = String(zhRaw ?? '').trim()
    const en = String(enRaw ?? '').trim()
    if (!zh || !en) return m
    if (!hasCjk(en)) return m
    return `${zh}（${en}）`
  })

  // 0.5) If a bi token's zh is a clause, split into prefix + term-only bi.
  s = s.replace(/\{\{bi:([^|\n}]+?)\|([^}\n]+?)\}\}/g, (m, zhRaw, enRaw) => {
    const zh = String(zhRaw ?? '').trim()
    const en = String(enRaw ?? '').trim()
    if (!zh || !en) return m
    if (hasCjk(en)) return m
    const split = splitBiTokenIfNeeded(zh, en)
    if (!split) return m
    return joinPrefix(split.prefix, `{{bi:${split.term}|${split.en}}}`)
  })

  // 2) Convert markdown links with bilingual parentheses label: [中文（English）](href) -> bilink
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (m, labelRaw, hrefRaw, offset, full) => {
    // Skip images: ![alt](url)
    if (typeof offset === 'number' && offset > 0 && String(full ?? '')[offset - 1] === '!') return m
    const label = String(labelRaw ?? '').trim()
    const href = String(hrefRaw ?? '').trim()
    if (!label.includes('（') || !label.includes('）')) return m
    const pm = /^(.+?)（([^）\n]+)）(.+)?$/.exec(label)
    if (!pm) return m
    const zh = `${pm[1] ?? ''}${pm[3] ?? ''}`.trim()
    const en = String(pm[2] ?? '').trim()
    if (!zh || !en || !hasLatin(en)) return m
    findings.push({ kind: 'bilink', zh, en })
    return `{{bilink:${zh}|${en}|${href}}}`
  })

  // 2.5) Convert markdown links whose label contains bi/bilink tokens.
  // The normal markdown link renderer does NOT parse nested inline tokens inside the label,
  // so we must turn them into bilink (SSOT).
  s = s.replace(/\[([^\]]*\{\{(?:bi|bilink):[^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (m, labelRaw, hrefRaw, offset, full) => {
    if (typeof offset === 'number' && offset > 0 && String(full ?? '')[offset - 1] === '!') return m
    const label = String(labelRaw ?? '').trim()
    const href = String(hrefRaw ?? '').trim()
    if (!label.includes('{{')) return m

    const zh = label
      .replace(/\{\{bilink:([^|\n}]+?)\|([^|\n}]+?)\|([^}\n]+?)\}\}/g, (_mm, z) => String(z ?? '').trim())
      .replace(/\{\{bi:([^|\n}]+?)\|([^}\n]+?)\}\}/g, (_mm, z) => String(z ?? '').trim())
      .trim()

    if (!zh) return m
    const en = deriveEnLabelFromHref(href)
    findings.push({ kind: 'bilink', zh, en })
    return `{{bilink:${zh}|${en}|${href}}}`
  })

  // 3) Convert remaining parentheses English to term-only bi: <term>(<en>) using full-width parentheses
  // We only convert when en has Latin letters AND no CJK (to avoid Day/中文註解).
  s = s.replace(
    /([\p{Letter}\p{Number}\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af·・'’\-\/]{1,60})\s*（([^）\n]*[A-Za-z][^）\n]*)）/gu,
    (_m, zhRaw, enRaw) => {
      const zhFull = String(zhRaw ?? '').trim()
      const en = String(enRaw ?? '').trim()
      if (!zhFull || !en || !hasLatin(en) || hasCjk(en)) return _m

      const split = splitBiTokenIfNeeded(zhFull, en)
      if (split) {
        findings.push({ kind: 'bi', zh: split.term, en })
        return joinPrefix(split.prefix, `{{bi:${split.term}|${en}}}`)
      }

      // Default: try to keep it term-like by using the last CJK run (if any), else keep as-is.
      const lastCjk = /([\u4e00-\u9fff\u3400-\u4dbf]{2,12})$/u.exec(zhFull)?.[1]
      const zhTerm = (lastCjk ?? zhFull).trim()
      findings.push({ kind: 'bi', zh: zhTerm, en })
      return `{{bi:${zhTerm}|${en}}}`
    },
  )

  // 4) Small formatting: ensure a space before bi/bilink tokens when glued to prior text.
  // (Improves readability in Chinese prose, matches examples like "是 {{bi:...}}".)
  s = s.replace(/([^\s])(\{\{bi:)/g, '$1 $2')
  s = s.replace(/([^\s])(\{\{bilink:)/g, '$1 $2')

  return unmaskGalleryTokens(s, stash)
}

async function listTargetFiles() {
  const entries = await fs.readdir(CONTENT_DIR, { withFileTypes: true })
  const out = []
  for (const e of entries) {
    if (!e.isFile()) continue
    if (!e.name.endsWith('.md')) continue
    if (!TARGET_RE.test(e.name)) continue
    out.push(path.join(CONTENT_DIR, e.name))
  }
  out.sort()
  return out
}

function headingKey(line) {
  const t = String(line ?? '').trim()
  const m = /^(#{2,4})\s*(.+)$/.exec(t)
  if (!m) return null
  return `${m[1]} ${m[2]}`.trim()
}

async function main() {
  const { check, write } = parseArgs(process.argv.slice(2))
  const files = await listTargetFiles()
  const report = []

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8')
    const lines = raw.split(/\r?\n/)
    let currentHeading = null
    const fileFindings = []

    const outLines = lines.map((line) => {
      const hk = headingKey(line)
      if (hk) currentHeading = hk

      const parts = splitInlineCode(line)
      for (let i = 0; i < parts.length; i += 2) {
        const findings = []
        parts[i] = convertSegment(parts[i], findings)
        if (findings.length > 0) {
          fileFindings.push({ lineNo: 0, heading: currentHeading, findings })
        }
      }
      return parts.join('`')
    })

    // Re-scan for auditing counts after conversion (for check output).
    const after = outLines.join('\n')
    const hasBroken = after.includes('[[[') || /]]]\(https?:\/\//.test(after)
    const hasParenEn = /（[^）\n]*[A-Za-z][^）\n]*）/.test(after)

    if (check && (hasBroken || hasParenEn)) {
      report.push({ filePath, hasBroken, hasParenEn })
    }

    if (write && outLines.join('\n') !== raw) {
      await fs.writeFile(filePath, outLines.join('\n'), 'utf8')
    }
  }

  if (check) {
    if (report.length === 0) {
      console.log('bilingual-rewrite:check OK (no remaining legacy/broken patterns)')
      return
    }
    console.log('bilingual-rewrite:check remaining patterns found:')
    for (const r of report) {
      console.log(`- ${r.filePath}`)
      console.log(`  - brokenTripleBracket: ${r.hasBroken}`)
      console.log(`  - parenEnglish: ${r.hasParenEn}`)
    }
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})

