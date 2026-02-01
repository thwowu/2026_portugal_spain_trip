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
      if (wrapped && (wrapped.startsWith('http://') || wrapped.startsWith('https://'))) return isGoogleMapsHref(wrapped)
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

function derivePlaceLabelFromHref(href) {
  try {
    const u = new URL(href)
    const q = u.searchParams.get('query')
    if (q) return q
  } catch {
    // ignore
  }
  return null
}

function normalizeLine(line) {
  // Skip images
  if (/!\[[^\]]*\]\([^)]+\)/.test(line)) return line

  // 1) Convert "[Google Maps](href)" to "[<derived>](href)" when possible
  // or leave as-is if we can't derive.
  line = line.replace(/\[Google Maps\]\((https?:\/\/[^)\s]+)\)/g, (full, hrefRaw) => {
    const href = String(hrefRaw ?? '').trim()
    if (!href || !isGoogleMapsHref(href)) return full

    const derived = derivePlaceLabelFromHref(href)
    if (derived && derived.trim()) return `[${derived.trim()}](${href})`
    // Can't derive from short links; keep as-is (UI will still show icon)
    return full
  })

  // 2) Convert "<place> [Google Maps](href)" into "[<place>](href)"
  // Works for headings, list items, and inline sentences.
  // We only rewrite when <place> is a non-empty run of text without other markdown brackets at the end.
  line = line.replace(/(^|[^[])([^\[]+?)\s+\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (m, lead, placeRaw, labelRaw, hrefRaw) => {
    const href = String(hrefRaw ?? '').trim()
    const label = String(labelRaw ?? '').trim()
    if (!href || !isGoogleMapsHref(href)) return m
    if (label !== 'Google Maps') return m

    const place = String(placeRaw ?? '').trimEnd()
    if (!place) return m

    // Avoid turning entire long paragraphs into a single link by requiring a "place-like" prefix.
    // Heuristic: keep it fairly short, and avoid obvious sentence connectors.
    if (place.length > 120) return m
    if (/[。！？!?]\s*$/.test(place)) return m

    return `${lead}[${place}](${href})`
  })

  return line
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
    return normalizeLine(line)
  })
  return out.join('\n')
}

function listContentFiles() {
  if (!fs.existsSync(CONTENT_DIR)) return []
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.md'))
    // Skip internal authoring README
    .filter((f) => f !== 'README.md')
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

