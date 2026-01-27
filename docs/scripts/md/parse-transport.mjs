import {
  collectSections,
  findChildren,
  findFirst,
  listTopLevelBullets,
  mdError,
  parseFrontmatter,
  parseLines,
} from './md.mjs'

function splitPipeParts(s) {
  return s.split('|').map((p) => p.trim()).filter(Boolean)
}

function parseKeyedBullets(sectionNode, sourcePath) {
  // expects:
  // - key: value
  // - key:
  //   - item
  const scalars = new Map()
  const lists = new Map()
  let currentListKey = null

  for (const row of sectionNode.content) {
    const top = /^-\s+([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(row.text)
    const sub = /^\s{2,}-\s+(.*)$/.exec(row.text)

    if (top) {
      const key = top[1]
      const value = top[2].trim()
      if (value) {
        scalars.set(key, value)
        currentListKey = null
      } else {
        lists.set(key, [])
        currentListKey = key
      }
      continue
    }

    if (sub && currentListKey) {
      const v = sub[1].trim()
      if (v) lists.get(currentListKey).push(v)
    }
  }

  return { scalars, lists }
}

function parseLabeledPipesFromList(items) {
  // "- Label | url"
  return items.map((s) => {
    const parts = splitPipeParts(s)
    if (parts.length >= 2) return { label: parts[0], href: parts[1] }
    return { label: parts[0] ?? s, href: '' }
  })
}

export function parseTransportSegmentMd({ sourcePath, raw }) {
  const { frontmatter, body, bodyLineOffset } = parseFrontmatter(raw, sourcePath)
  const lines = parseLines(body, bodyLineOffset)
  const tree = collectSections(lines)

  const h1 = findFirst(tree, 1)
  if (!h1) throw mdError(sourcePath, 1, 'Missing H1 (# Segment title)')

  const id = frontmatter.segmentId?.trim()
  if (!id) throw mdError(sourcePath, 1, 'Missing frontmatter: segmentId')

  const label = frontmatter.title?.trim() || h1.text

  const h2s = new Map(findChildren(h1, 2).map((n) => [n.text.trim(), n]))
  const tldrH2 = h2s.get('tldr')
  const optionsH2 = h2s.get('options')
  const planBH2 = h2s.get('planB')

  if (!tldrH2) throw mdError(sourcePath, h1.line, 'Missing section: ## tldr')
  if (!optionsH2) throw mdError(sourcePath, h1.line, 'Missing section: ## options')
  if (!planBH2) throw mdError(sourcePath, h1.line, 'Missing section: ## planB')

  const { scalars: tldrScalars, lists: tldrLists } = parseKeyedBullets(tldrH2, sourcePath)
  const recommended = tldrScalars.get('recommended')
  const because = tldrScalars.get('because')
  const reminders = tldrLists.get('reminders') || []
  if (!recommended) throw mdError(sourcePath, tldrH2.line, 'tldr: missing recommended')
  if (!because) throw mdError(sourcePath, tldrH2.line, 'tldr: missing because')

  /** @type {any[]} */
  const options = []
  for (const h3 of findChildren(optionsH2, 3)) {
    // "mode | title"
    const parts = splitPipeParts(h3.text)
    const mode = parts[0] || ''
    const title = parts.slice(1).join(' | ') || h3.text

    const { scalars, lists } = parseKeyedBullets(h3, sourcePath)
    const summary = scalars.get('summary') || ''

    const steps = lists.get('steps') || []
    const bookingLinksRaw = lists.get('bookingLinks') || []
    const luggageNotes = lists.get('luggageNotes') || []
    const riskNotes = lists.get('riskNotes') || []
    const screenshotsRaw = lists.get('screenshots') || []

    const bookingLinks = bookingLinksRaw
      .map((s) => {
        const ps = splitPipeParts(s)
        if (ps.length >= 2) return { label: ps[0], href: ps[1] }
        return null
      })
      .filter(Boolean)

    const screenshots = screenshotsRaw
      .map((s) => {
        const ps = splitPipeParts(s)
        if (ps.length >= 2) return { label: ps[0], src: ps[1] }
        return null
      })
      .filter(Boolean)

    options.push({
      mode,
      title,
      summary,
      steps,
      bookingLinks,
      luggageNotes,
      riskNotes,
      screenshots,
    })
  }

  if (!options.length) throw mdError(sourcePath, optionsH2.line, '## options must include at least 1 ### option')

  const planB = listTopLevelBullets(planBH2.content).map((x) => x.text)
  if (!planB.length) throw mdError(sourcePath, planBH2.line, '## planB must include at least 1 item')

  return {
    id,
    label,
    tldr: {
      recommended,
      because,
      reminders,
    },
    options,
    planB,
  }
}

