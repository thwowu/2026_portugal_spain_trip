import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CONTENT_DIR = path.resolve(__dirname, '../src/content')

// Scope from the plan (exclude *.legacy.md)
const FILE_GLOBS = [
  /^attractions\..+\.md$/,
  /^stays\..+\.md$/,
  /^transport\..+\.md$/,
  /^extensions\..+\.md$/,
  /^itinerary\.md$/,
  /^misc\.md$/,
  /^README\.md$/,
]

const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/
const LATIN_RE = /[A-Za-zÀ-ÖØ-öø-ÿ]/

function isScopedContentFile(name) {
  if (!name.endsWith('.md')) return false
  if (name.endsWith('.legacy.md')) return false
  return FILE_GLOBS.some((re) => re.test(name))
}

function isHeadingLine(line) {
  return /^\s*#{1,6}\s*/.test(line)
}

function isListLeadSpan(line, spanStartIdx, spanEndIdx) {
  // Keep: list lead like "- **Name**：" / "- **[Name](url)**："
  const m = /^(\s*[-*]\s+)/.exec(line)
  if (!m) return false
  const leadStart = m[0].length
  if (spanStartIdx !== leadStart) return false
  const after = line.slice(spanEndIdx)
  return /^\s*[：:]/.test(after)
}

function shouldBacktick(inner) {
  const s = (inner ?? '').trim()
  if (!s) return false
  if (CJK_RE.test(s)) return false
  if (!LATIN_RE.test(s)) return false
  // Avoid turning pure numbers / prices into code
  if (/^[0-9\s.,:;()€$¥£-–—/]+$/.test(s)) return false
  return s.length <= 60
}

function transformLine(line) {
  // Don’t try to parse across code fences; content files mostly don’t use them,
  // but this keeps the transform safe for future additions.
  // Inline code: we leave as-is by doing a split and only transforming non-code segments.
  const parts = String(line).split('`')
  for (let i = 0; i < parts.length; i += 2) {
    parts[i] = transformBoldInSegment(parts[i] ?? '', { originalLine: line })
  }
  return parts.join('`')
}

function transformBoldInSegment(seg, { originalLine }) {
  let out = ''
  let i = 0
  while (i < seg.length) {
    const start = seg.indexOf('**', i)
    if (start === -1) {
      out += seg.slice(i)
      break
    }
    const end = seg.indexOf('**', start + 2)
    if (end === -1) {
      out += seg.slice(i)
      break
    }

    out += seg.slice(i, start)
    const inner = seg.slice(start + 2, end)
    const spanStartIdx = start
    const spanEndIdx = end + 2

    const keepAsBold = !isHeadingLine(originalLine) && isListLeadSpan(originalLine, spanStartIdx, spanEndIdx)
    if (keepAsBold) {
      out += `**${inner}**`
    } else if (shouldBacktick(inner)) {
      out += `\`${inner.trim()}\``
    } else {
      out += inner
    }

    i = end + 2
  }
  return out
}

async function main() {
  const entries = await fs.readdir(CONTENT_DIR, { withFileTypes: true })
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter(isScopedContentFile)
    .sort()

  let changedCount = 0
  for (const name of files) {
    const p = path.join(CONTENT_DIR, name)
    const before = await fs.readFile(p, 'utf8')
    const lines = before.replace(/\r\n/g, '\n').split('\n')

    let inFence = false
    const afterLines = lines.map((line) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('```')) {
        inFence = !inFence
        return line
      }
      if (inFence) return line
      return transformLine(line)
    })

    const after = afterLines.join('\n')
    if (after !== before.replace(/\r\n/g, '\n')) {
      await fs.writeFile(p, after, 'utf8')
      changedCount++
    }
  }

  console.log(`bold-slim: updated ${changedCount}/${files.length} files`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})

