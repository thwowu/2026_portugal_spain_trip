import {
  collectSections,
  findChildren,
  findFirst,
  mdError,
  parseFrontmatter,
  parseLines,
} from './md.mjs'

function splitPipeParts(s) {
  return s.split('|').map((p) => p.trim()).filter(Boolean)
}

function parseDayHeading(text) {
  // Preferred:
  //   "day 1 | 3/31（一） | 里斯本 | 抵達日..."
  // Backward-compatible:
  //   "day 1 | 里斯本 | 抵達日..."  (dateLabel will be set to a placeholder)
  const m4 = /^day\s+(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)$/.exec(text)
  if (m4) {
    return {
      day: Number(m4[1]),
      dateLabel: m4[2].trim(),
      cityLabel: m4[3].trim(),
      title: m4[4].trim(),
    }
  }
  const m3 = /^day\s+(\d+)\s*\|\s*(.+?)\s*\|\s*(.+)$/.exec(text)
  if (m3) {
    return {
      day: Number(m3[1]),
      dateLabel: '（待補日期）',
      cityLabel: m3[2].trim(),
      title: m3[3].trim(),
    }
  }
  return null
}

function parseDayMeta(contentRows) {
  // - tags: a, b
  // - summary:
  //   - morning: ...
  const tags = []
  const summary = {}
  let inSummary = false

  for (const row of contentRows) {
    const top = /^-\s+([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(row.text)
    const sub = /^\s{2,}-\s+([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(row.text)

    if (top) {
      const key = top[1]
      const value = top[2].trim()
      if (key === 'tags') {
        tags.push(...value.split(',').map((x) => x.trim()).filter(Boolean))
        inSummary = false
      } else if (key === 'summary') {
        inSummary = true
      } else {
        inSummary = false
      }
      continue
    }

    if (sub && inSummary) {
      const k = sub[1]
      const v = sub[2].trim()
      if (v) summary[k] = v
    }
  }

  return { tags, summary }
}

export function parseItineraryMd({ sourcePath, raw }) {
  const { body, bodyLineOffset } = parseFrontmatter(raw, sourcePath)
  const lines = parseLines(body, bodyLineOffset)
  const tree = collectSections(lines)

  const h1 = findFirst(tree, 1)
  if (!h1) throw mdError(sourcePath, 1, 'Missing H1 (# Itinerary)')

  // Find phases: H2 "phase <id> | <label>"
  const phases = []
  for (const h2 of h1.children.filter((n) => n.depth === 2)) {
    const parts = h2.text.trim().split(/\s+/)
    if (parts[0] !== 'phase') continue
    const after = h2.text.trim().slice('phase'.length).trim()
    const [id, label] = splitPipeParts(after)
    if (!id || !label) throw mdError(sourcePath, h2.line, 'Invalid phase heading. Expected: "## phase <id> | <label>"')

    const days = []
    for (const h3 of findChildren(h2, 3)) {
      const meta = parseDayHeading(h3.text.trim())
      if (!meta) throw mdError(sourcePath, h3.line, 'Invalid day heading. Expected: "### day N | date | city | title"')
      const { tags, summary } = parseDayMeta(h3.content)
      days.push({
        ...meta,
        tags,
        summary,
        details: {},
      })
    }

    if (!days.length) throw mdError(sourcePath, h2.line, `Phase "${id}" must include at least 1 day`)
    phases.push({ id, label, days })
  }

  if (!phases.length) throw mdError(sourcePath, 1, 'Missing phases. Expected at least one "## phase ..." section')
  return phases
}

