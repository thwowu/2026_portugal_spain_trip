import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const CONTENT_DIR = path.resolve(__dirname, '../src/content')

const TARGET_RE = /^(attractions\.|stays\.|transport\.|extensions\.|itinerary\.md$)/i

function parseArgs(argv) {
  const out = { limit: 5000, filesLimit: 999, json: false, mode: 'translation' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--limit') out.limit = Number(argv[++i] ?? out.limit)
    if (a === '--files') out.filesLimit = Number(argv[++i] ?? out.filesLimit)
    if (a === '--json') out.json = true
    if (a === '--mode') out.mode = String(argv[++i] ?? out.mode)
  }
  return out
}

function hasLatin(s) {
  return /[A-Za-z]/.test(s ?? '')
}

function hasCjk(s) {
  return /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af]/.test(s ?? '')
}

function stripInlineCode(line) {
  const parts = String(line ?? '').split('`')
  return parts.filter((_, i) => i % 2 === 0).join('`')
}

function isPipeListLine(line) {
  // transport.* uses "- Label | url" style lists; avoid suggesting bi/bilink inside them.
  return /^\s{2,}-\s+[^|]+\|\s+\S+/.test(line)
}

function isHeading(line) {
  const m = /^\s*(#{2,4})\s+(.+?)\s*$/.exec(line)
  if (!m) return null
  return { level: m[1].length, text: m[2] }
}

function extractLastCjkTerm(before) {
  // pick the last continuous CJK run as a term candidate
  const m = /([\u4e00-\u9fff\u3400-\u4dbf]{2,14})\s*$/.exec(before)
  if (!m) return null
  return m[1]
}

function looksLikeTranslationParen(en) {
  const s = String(en ?? '').trim()
  if (!s) return false
  if (!hasLatin(s)) return false
  if (hasCjk(s)) return false
  if (s.length > 46) return false
  // exclude obvious schedule notes and "not a translation" patterns
  if (/\bDay\s*\d+/i.test(s)) return false
  if (/\bStep\s*\d+/i.test(s)) return false
  if (/\bSafety\b/i.test(s)) return false
  if (/\bKey takeaways\b/i.test(s)) return false
  if (/^\d{1,2}[:：]\d{2}/.test(s)) return false
  return true
}

function classifyParen(inner) {
  const s = String(inner ?? '').trim()
  const hasC = hasCjk(s)
  const isTranslation = looksLikeTranslationParen(s)
  if (isTranslation) return { kind: 'translation_like', reason: 'latin_only' }
  if (hasC) {
    if (/\bDay\s*\d+/i.test(s) || /^\d{1,2}[:：]\d{2}/.test(s)) return { kind: 'schedule_or_label', reason: 'mixed_cjk_and_schedule' }
    return { kind: 'mixed_note', reason: 'contains_cjk' }
  }
  return { kind: 'other', reason: 'latin_only_but_filtered' }
}

function extractParenCandidatesFromLine(line) {
  // full-width parentheses only: （...）
  const out = []
  const re = /（([^）\n]+)）/g
  for (const m of line.matchAll(re)) {
    const idx = m.index ?? -1
    if (idx < 0) continue
    out.push({ start: idx, raw: m[0], inner: m[1] ?? '' })
  }
  return out
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

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const files = (await listTargetFiles()).slice(0, args.filesLimit)
  const findings = []
  let idSeq = 1

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8')
    const lines = raw.split(/\r?\n/)
    let inFence = false
    let curHeading = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? ''
      const trimmed = line.trim()
      if (trimmed.startsWith('```')) {
        inFence = !inFence
        continue
      }
      if (inFence) continue

      const h = isHeading(line)
      if (h) curHeading = `${'#'.repeat(h.level)} ${h.text}`

      if (isPipeListLine(line)) continue

      const s = stripInlineCode(line)
      const parens = extractParenCandidatesFromLine(s)
      if (parens.length === 0) continue

      for (const p of parens) {
        const inner = String(p.inner ?? '').trim()
        if (!hasLatin(inner)) continue

        const cls = classifyParen(inner)
        const isTranslation = cls.kind === 'translation_like'
        if (args.mode === 'translation' && !isTranslation) continue

        const before = s.slice(0, p.start)
        const term = extractLastCjkTerm(before)

        const id = `P${String(idSeq).padStart(4, '0')}`
        idSeq++

        findings.push({
          id,
          file: path.basename(filePath),
          absPath: filePath,
          lineNo: i + 1,
          heading: curHeading,
          zhTerm: term,
          inner,
          classification: cls.kind,
          reason: cls.reason,
          line: line,
        })

        if (findings.length >= args.limit) break
      }
      if (findings.length >= args.limit) break
    }
    if (findings.length >= args.limit) break
  }

  if (args.json) {
    console.log(JSON.stringify({ count: findings.length, findings }, null, 2))
    return
  }

  const counts = new Map()
  for (const f of findings) counts.set(f.classification, (counts.get(f.classification) ?? 0) + 1)

  const byFile = new Map()
  for (const f of findings) {
    const k = f.file
    if (!byFile.has(k)) byFile.set(k, [])
    byFile.get(k).push(f)
  }

  console.log(`# Paren-English audit (${args.mode})\n`)
  console.log(`Found **${findings.length}** match(es).\n`)
  if (args.mode !== 'translation') {
    console.log(`## Summary\n`)
    for (const [k, v] of counts) console.log(`- ${k}: ${v}`)
    console.log('')
    console.log(`(Only \`translation_like\` are good candidates for \`{{bi:...}}\`. Others are usually schedule/notes and likely should stay as parentheses.)\n`)
  } else {
    console.log(`These are lines that contain **（English）** that look like a translation hint and can likely be rewritten to \`{{bi:zh|en}}\`.\n`)
  }
  console.log(`## How to respond\n`)
  console.log(`Reply with IDs you want converted, e.g. \`P0003 P0012 P0044\`.\n`)

  for (const [file, items] of byFile) {
    console.log(`## ${file} (${items.length})\n`)
    for (const it of items) {
      const where = `${it.file}:${it.lineNo}${it.heading ? ` (${it.heading})` : ''}`
      console.log(`- **${it.id}** — ${where}`)
      console.log(`  - kind: ${it.classification} (${it.reason})`)
      if (it.classification === 'translation_like' && it.zhTerm) {
        console.log(`  - propose: \`{{bi:${it.zhTerm}|${it.inner}}}\``)
      } else {
        console.log(`  - propose: KEEP parentheses`)
      }
      console.log(`  - line: ${it.line.trim()}`)
    }
    console.log('')
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})

