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

    // Google redirect wrapper (sometimes appears when copying)
    if ((host === 'google.com' || host.startsWith('google.')) && pathname === '/url') {
      const wrapped = u.searchParams.get('q') || u.searchParams.get('url')
      if (wrapped && (wrapped.startsWith('http://') || wrapped.startsWith('https://'))) {
        return isGoogleMapsHref(wrapped)
      }
    }

    // Short links
    if (host === 'maps.app.goo.gl') return true
    if (host === 'goo.gl') return pathname.startsWith('/maps')

    // google.{tld}/maps... or maps.google.{tld}/...
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

function normalizeMapsLinksInMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  let inFence = false

  // Don’t match images: ![alt](url)
  const LINK_RE = /(?<!\!)\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g

  const out = lines.map((line) => {
    const trimmed = line.trimStart()
    if (trimmed.startsWith('```')) {
      inFence = !inFence
      return line
    }
    if (inFence) return line

    return line.replace(LINK_RE, (full, labelRaw, hrefRaw) => {
      const label = String(labelRaw ?? '').trim()
      const href = String(hrefRaw ?? '').trim()
      if (!href) return full
      if (!isGoogleMapsHref(href)) return full
      if (label.toLowerCase() === 'google maps') return full

      // Convert: [Place](maps-url) → Place [Google Maps](maps-url)
      return `${label} [Google Maps](${href})`
    })
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
  if (files.length === 0) {
    console.log(`No content files found under: ${CONTENT_DIR}`)
    return
  }

  let changed = 0
  for (const p of files) {
    const prev = fs.readFileSync(p, 'utf8')
    const next = normalizeMapsLinksInMarkdown(prev)
    if (next !== prev) {
      fs.writeFileSync(p, next, 'utf8')
      changed++
      console.log(`Updated: ${path.relative(ROOT, p)}`)
    }
  }

  console.log(`Done. Changed files: ${changed}/${files.length}`)
}

main()

