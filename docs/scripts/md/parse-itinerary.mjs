import {
  collectSections,
  findChildren,
  findFirst,
  mdError,
  parseFrontmatter,
  parseLines,
} from './md.mjs'

function splitPipeParts(s) {
  // IMPORTANT:
  // We use " | " (pipe with surrounding whitespace) as the authoring delimiter.
  // Do NOT split on a bare "|" because our inline bilingual tokens use pipes too:
  //   {{bi:中文|English}}
  //   {{bilink:中文|English|https://...}}
  //
  // Those inline pipes intentionally have *no surrounding whitespace*, so splitting
  // on /\s+\|\s+/ keeps the delimiter semantics without corrupting content.
  return String(s ?? '')
    .split(/\s+\|\s+/)
    .map((p) => p.trim())
    .filter(Boolean)
}

function parseDayHeading(text) {
  // Preferred:
  //   "day 1 | 3/31（一） | 里斯本 | 抵達日..."
  // Backward-compatible:
  //   "day 1 | 里斯本 | 抵達日..."  (dateLabel will be empty)
  const parts = splitPipeParts(text)
  if (parts.length < 2) return null

  const mDay = /^day\s+(\d+)$/i.exec(parts[0] ?? '')
  if (!mDay) return null
  const day = Number(mDay[1])
  if (!Number.isFinite(day) || day <= 0) return null

  // day N | dateLabel | cityLabel | title
  if (parts.length >= 4) {
    return {
      day,
      dateLabel: (parts[1] ?? '').trim(),
      cityLabel: (parts[2] ?? '').trim(),
      title: parts.slice(3).join(' | ').trim(),
    }
  }

  // day N | cityLabel | title
  if (parts.length === 3) {
    return {
      day,
      dateLabel: '',
      cityLabel: (parts[1] ?? '').trim(),
      title: (parts[2] ?? '').trim(),
    }
  }

  return null
}

function parseDayMeta(contentRows) {
  // - tags: a, b
  // - summary:
  //   - morning: ...
  // - details:
  //   - morning: ...
  //   - notes:
  //     - ...
  const tags = []
  const summary = {}
  const details = {}
  let inSummary = false
  let inDetails = false
  let inDetailsNotes = false

  for (const row of contentRows) {
    const top = /^-\s+([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(row.text)
    const sub = /^\s{2,}-\s+([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(row.text)
    const note = /^\s{4,}-\s+(.*)$/.exec(row.text)

    if (top) {
      const key = top[1]
      const value = top[2].trim()
      if (key === 'tags') {
        tags.push(...value.split(',').map((x) => x.trim()).filter(Boolean))
        inSummary = false
        inDetails = false
        inDetailsNotes = false
      } else if (key === 'summary') {
        inSummary = true
        inDetails = false
        inDetailsNotes = false
      } else if (key === 'details') {
        inSummary = false
        inDetails = true
        inDetailsNotes = false
      } else {
        inSummary = false
        inDetails = false
        inDetailsNotes = false
      }
      continue
    }

    if (sub && inSummary) {
      const k = sub[1]
      const v = sub[2].trim()
      if (v) summary[k] = v
    }

    if (sub && inDetails) {
      const k = sub[1]
      const v = sub[2].trim()
      if (k === 'notes') {
        inDetailsNotes = true
        if (!details.notes) details.notes = []
        continue
      }
      inDetailsNotes = false
      if (v) details[k] = v
    }

    if (note && inDetails && inDetailsNotes) {
      const v = note[1].trim()
      if (v) {
        if (!details.notes) details.notes = []
        details.notes.push(v)
      }
    }
  }

  return { tags, summary, details }
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
    const p = splitPipeParts(after)
    const id = p[0]
    const label = p.slice(1).join(' | ')
    if (!id || !label) throw mdError(sourcePath, h2.line, 'Invalid phase heading. Expected: "## phase <id> | <label>"')

    const days = []
    for (const h3 of findChildren(h2, 3)) {
      const meta = parseDayHeading(h3.text.trim())
      if (!meta) throw mdError(sourcePath, h3.line, 'Invalid day heading. Expected: "### day N | date | city | title"')
      const { tags, summary, details } = parseDayMeta(h3.content)
      days.push({
        ...meta,
        tags,
        summary,
        details,
      })
    }

    if (!days.length) throw mdError(sourcePath, h2.line, `Phase "${id}" must include at least 1 day`)
    phases.push({ id, label, days })
  }

  if (!phases.length) throw mdError(sourcePath, 1, 'Missing phases. Expected at least one "## phase ..." section')
  return phases
}

