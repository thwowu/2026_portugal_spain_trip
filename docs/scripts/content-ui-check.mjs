import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CONTENT_DIR = path.resolve(__dirname, '../src/content')

// Keep these in sync with the UI parsers:
// - docs/src/components/RichContent.tsx
// - docs/src/utils/extractCarouselItems.ts
const GALLERY_TOKEN_RE = /\{\{gallery(?::([^|}]+))?\|([^}]+)\}\}/g
// Match exactly "###" headings (NOT "#### ..."), consistent with extractCarouselItems.ts.
const H3_RE = /^###(?!#)\s*(.+)$/
const CARD_RE = /^\s*@card:\s*(.+)\s*$/
const IMAGE_MD_RE = /!\[[^\]]*\]\(([^)\s]+)\)/

function splitLines(text) {
  return (text ?? '').replace(/\r\n/g, '\n').split('\n')
}

function isSkippableFile(p) {
  return p.endsWith('.legacy.md')
}

function stripInlineCode(text) {
  // Very small/safe: split by backticks, keep even segments as non-code.
  const parts = String(text ?? '').split('`')
  return parts.filter((_, i) => i % 2 === 0).join('`')
}

function scanNonFenceLines(text) {
  const lines = splitLines(text)
  let inFence = false
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const trimmed = line.trim()
    if (trimmed.startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    out.push({ line, lineNo: i + 1 })
  }
  return out
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0
  let count = 0
  let idx = 0
  while (true) {
    const next = haystack.indexOf(needle, idx)
    if (next === -1) break
    count++
    idx = next + needle.length
  }
  return count
}

function validateFile(filePath, text) {
  const errors = []
  const lines = scanNonFenceLines(text)
  const baseName = path.basename(filePath)

  // Helper: validate bold spans are only used as list-lead markers.
  // Allowed shape (after list marker, before ":" or "："):
  //   - **Name**：
  //   - **[Name](https://...)**：
  function validateBoldOnlyAsListLead() {
    for (const { line, lineNo } of lines) {
      const s = stripInlineCode(line)
      if (!s.includes('**')) continue

      // Ignore headings here (we already error on heading-bold separately).
      if (/^\s*#{2,4}\s*/.test(s)) continue

      // Scan each bold span on the line.
      let idx = 0
      while (true) {
        const start = s.indexOf('**', idx)
        if (start === -1) break
        const end = s.indexOf('**', start + 2)
        if (end === -1) break

        const prefix = s.slice(0, start)
        const suffix = s.slice(end + 2)

        const listPrefixMatch = /^(\s*[-*]\s+)$/.exec(prefix)
        const isListLead = !!listPrefixMatch && /^\s*[：:]/.test(suffix)
        if (!isListLead) {
          errors.push({
            filePath,
            lineNo,
            code: 'bold-not-list-lead',
            message: 'Bold should only be used for list-lead item names (e.g. "- **Name**：").',
          })
        }

        idx = end + 2
      }
    }
  }

  // 1) Heading lines should not contain "**" (titles are already prominent)
  for (const { line, lineNo } of lines) {
    if (/^\s*#{2,4}\s*/.test(line) && line.includes('**')) {
      errors.push({
        filePath,
        lineNo,
        code: 'heading-bold',
        message: 'Heading line contains "**" (remove bold from headings).',
      })
    }
  }

  // 1.5) Bold should only appear as list-lead markers.
  validateBoldOnlyAsListLead()

  // 2) Ensure "**" are paired overall (to avoid leaving raw "**" in UI).
  // Ignore anything inside inline code spans.
  {
    const nonCode = lines.map(({ line }) => stripInlineCode(line)).join('\n')
    const boldPairs = countOccurrences(nonCode, '**')
    if (boldPairs % 2 !== 0) {
      errors.push({
        filePath,
        lineNo: 1,
        code: 'unpaired-bold',
        message: 'Found an odd number of "**" outside code spans (likely unpaired).',
      })
    }
  }

  // 3) Validate @card: lines (format + non-empty)
  for (const { line, lineNo } of lines) {
    if (!line.includes('@card:')) continue
    const m = CARD_RE.exec(line)
    if (!m) {
      errors.push({
        filePath,
        lineNo,
        code: 'card-malformed',
        message: 'Malformed "@card:" line. Expected "@card: <one line summary>".',
      })
      continue
    }
    const v = (m[1] ?? '').trim()
    if (!v) {
      errors.push({
        filePath,
        lineNo,
        code: 'card-empty',
        message: '"@card:" summary is empty.',
      })
    }
  }

  // 4) Validate gallery tokens
  {
    const nonFenceText = lines.map(({ line }) => stripInlineCode(line)).join('\n')
    const tokenStarts = countOccurrences(nonFenceText, '{{gallery')
    const tokenMatches = [...nonFenceText.matchAll(GALLERY_TOKEN_RE)]

    if (tokenStarts !== tokenMatches.length) {
      errors.push({
        filePath,
        lineNo: 1,
        code: 'gallery-broken',
        message: `Found "${tokenStarts}" occurrences of "{{gallery" but only "${tokenMatches.length}" complete token(s). Token may be broken across lines or missing closing "}}".`,
      })
    }

    for (const m of tokenMatches) {
      const urlsRaw = (m[2] ?? '')
      const urls = urlsRaw
        .split('|')
        .map((x) => x.trim())
        .filter((x) => x.startsWith('/') || x.startsWith('http://') || x.startsWith('https://'))
        .filter((x) => !x.startsWith('https://source.unsplash.com/featured/'))

      if (urls.length === 0) {
        // Best-effort line number: search the match text inside the file.
        const needle = m[0]
        const lineNo = (() => {
          const rawLines = splitLines(text)
          for (let i = 0; i < rawLines.length; i++) {
            if ((rawLines[i] ?? '').includes(needle)) return i + 1
          }
          return 1
        })()

        errors.push({
          filePath,
          lineNo,
          code: 'gallery-empty',
          message: 'Gallery token has 0 valid URLs (must contain at least one / or http(s) URL; featured.unsplash.com is disallowed).',
        })
      }
    }
  }

  // 5) Validate H3 "carousel slices" aren’t empty (title must exist; content must exist unless it’s an image/gallery-only slice).
  // We only enforce this on content files that are actually rendered via extractH3CarouselItems.
  // (At the moment: attractions + extensions.)
  if (!(baseName.startsWith('attractions.') || baseName.startsWith('extensions.'))) {
    return errors
  }
  {
    const rawLines = splitLines(text)
    let curTitle = null
    let curTitleLineNo = null
    let curLines = []

    const flush = () => {
      if (!curTitle) return

      const raw = curLines.join('\n').trim()
      if (!raw) {
        errors.push({
          filePath,
          lineNo: curTitleLineNo ?? 1,
          code: 'h3-empty-slice',
          message: `H3 section "${curTitle}" has no content.`,
        })
        curTitle = null
        curTitleLineNo = null
        curLines = []
        return
      }

      // Remove @card lines and whitespace.
      const kept = raw
        .split('\n')
        .filter((l) => !CARD_RE.test(l))
        .join('\n')
        .trim()

      const hasTextContent = kept.length > 0
      const hasGallery = GALLERY_TOKEN_RE.test(raw)
      GALLERY_TOKEN_RE.lastIndex = 0
      const hasInlineImage = IMAGE_MD_RE.test(raw)

      if (!hasTextContent && !hasGallery && !hasInlineImage) {
        errors.push({
          filePath,
          lineNo: curTitleLineNo ?? 1,
          code: 'h3-empty-slice',
          message: `H3 section "${curTitle}" has no renderable content (after removing @card).`,
        })
      }

      curTitle = null
      curTitleLineNo = null
      curLines = []
    }

    let inFence = false
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i] ?? ''
      const trimmed = line.trim()
      if (trimmed.startsWith('```')) {
        inFence = !inFence
        continue
      }
      if (inFence) continue

      const h3 = H3_RE.exec(trimmed)
      if (h3) {
        flush()
        const t = (h3[1] ?? '').trim()
        if (!t) {
          errors.push({
            filePath,
            lineNo: i + 1,
            code: 'h3-empty-title',
            message: 'Found "###" heading with empty title.',
          })
          curTitle = null
          curTitleLineNo = null
          curLines = []
          continue
        }
        curTitle = t
        curTitleLineNo = i + 1
        curLines = []
        continue
      }

      if (curTitle) curLines.push(line)
    }
    flush()
  }

  return errors
}

async function listMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const out = []
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) continue
    if (!e.isFile()) continue
    if (!e.name.endsWith('.md')) continue
    if (isSkippableFile(p)) continue
    out.push(p)
  }
  out.sort()
  return out
}

async function main() {
  const files = await listMarkdownFiles(CONTENT_DIR)
  const allErrors = []

  for (const p of files) {
    const text = await fs.readFile(p, 'utf8')
    const errs = validateFile(p, text)
    allErrors.push(...errs)
  }

  if (allErrors.length === 0) {
    console.log(`content:ui-check OK (${files.length} files)`)
    return
  }

  console.error(`content:ui-check FAILED (${allErrors.length} issue(s))`)
  for (const e of allErrors) {
    console.error(`- ${e.filePath}:${e.lineNo} [${e.code}] ${e.message}`)
  }
  process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})

