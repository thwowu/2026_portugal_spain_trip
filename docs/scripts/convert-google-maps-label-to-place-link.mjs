import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const CONTENT_DIR = path.join(ROOT, 'src', 'content')

function isGoogleMapsHref(href) {
  try {
    const u = new URL(href)
    const host = (u.hostname || '').replace(/^www\./, '').toLowerCase()
    const pathname = (u.pathname || '').toLowerCase()

    if ((host === 'google.com' || host.startsWith('google.')) && pathname === '/url') {
      const wrapped = u.searchParams.get('q') || u.searchParams.get('url')
      if (wrapped && (wrapped.startsWith('http://') || wrapped.startsWith('https://'))) {
        return isGoogleMapsHref(wrapped)
      }
    }

    if (host === 'maps.app.goo.gl') return true
    if (host === 'goo.gl') return pathname.startsWith('/maps')

    const isGoogleHost =
      host === 'google.com' ||
      host.startsWith('google.') ||
      host === 'maps.google.com' ||
      host.startsWith('maps.google.')
    if (isGoogleHost) return pathname.startsWith('/maps') || pathname.includes('/maps/')
  } catch {
    // ignore
  }
  return false
}

function shouldRewriteLine(line) {
  const t = line.trimStart()
  if (!t) return false
  // headings / list items (where "place name" is expected)
  if (t.startsWith('#')) return true
  if (t.startsWith('- ')) return true
  if (/^\d+\.\s+/.test(t)) return true
  return false
}

function rewriteLine(line) {
  // Replace: <prefix><label> [Google Maps](href)<suffix>
  // Only on heading/list-like lines to avoid turning whole sentences into links.
  if (!shouldRewriteLine(line)) return line

  const re = /\s*\[Google Maps\]\((https?:\/\/[^)\s]+)\)/g
  return line.replace(re, (full, hrefRaw, offset) => {
    const href = String(hrefRaw ?? '').trim()
    if (!href || !isGoogleMapsHref(href)) return full

    const before = line.slice(0, offset)
    const after = line.slice(offset + full.length)

    // Determine where the "place label" begins (keep bullets/headings outside the link).
    const m =
      /^(\s*)(#{1,6}\s+)(.*)$/.exec(before) ||
      /^(\s*)(-\s+)(.*)$/.exec(before) ||
      /^(\s*)(\d+\.\s+)(.*)$/.exec(before)

    if (!m) return full

    const indent = m[1] ?? ''
    const lead = m[2] ?? ''
    const label = (m[3] ?? '').trimEnd()
    if (!label) return full

    return `${indent}${lead}[${label}](${href})${after}`
  })
}

function rewriteFile(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  let inFence = false
  const out = lines.map((line) => {
    const t = line.trimStart()
    if (t.startsWith('```')) {
      inFence = !inFence
      return line
    }
    if (inFence) return line
    return rewriteLine(line)
  })
  return out.join('\n')
}

function listContentFiles() {
  if (!fs.existsSync(CONTENT_DIR)) return []
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => path.join(CONTENT_DIR, f))
}

function main() {
  const files = listContentFiles()
  let changed = 0
  for (const p of files) {
    const prev = fs.readFileSync(p, 'utf8')
    const next = rewriteFile(prev)
    if (next !== prev) {
      fs.writeFileSync(p, next, 'utf8')
      changed++
      console.log(`Updated: ${path.relative(ROOT, p)}`)
    }
  }
  console.log(`Done. Changed files: ${changed}/${files.length}`)
}

main()

