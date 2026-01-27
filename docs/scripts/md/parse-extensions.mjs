import {
  collectSections,
  findChildren,
  findFirst,
  mdError,
  parseFrontmatter,
  parseLines,
} from './md.mjs'

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const DEFAULT_SECTION_TITLES = {
  summary: '摘要（Summary）',
  why: '為什麼值得（Why）',
  when: '什麼時候去（When）',
  how: '怎麼去（How to go）',
  route: '行程建議（Route）',
  time: '時間/體力（Time & effort）',
  cost: '花費/票務（Cost & tickets）',
  backup: '雨備/Plan B（Backup）',
  sources: '資料來源（Sources）',
}

export function parseExtensionsCityMd({ sourcePath, raw }) {
  const { frontmatter, body, bodyLineOffset } = parseFrontmatter(raw, sourcePath)
  const lines = parseLines(body, bodyLineOffset)
  const tree = collectSections(lines)

  const h1 = findFirst(tree, 1)
  if (!h1) throw mdError(sourcePath, 1, 'Missing H1 (# City extensions title)')

  const cityId = frontmatter.cityId?.trim()
  if (!cityId) throw mdError(sourcePath, 1, 'Missing frontmatter: cityId')

  const title = frontmatter.title?.trim() || h1.text

  const trips = []
  for (const h2 of findChildren(h1, 2)) {
    const head = h2.text.trim()
    if (!head) continue

    let id = ''
    let tripTitle = head

    const m = /^([^|]+)\|\s*(.+)$/.exec(head)
    if (m) {
      id = m[1].trim()
      tripTitle = m[2].trim()
    } else {
      id = slugify(head)
    }

    if (!id) throw mdError(sourcePath, h2.line, 'Invalid trip heading (expected "id | title")')

    let sections = []

    // H3 sections preferred.
    const h3s = findChildren(h2, 3)
    for (const h3 of h3s) {
      const key = slugify(h3.text.trim() || 'section')
      const content = h3.content.map((r) => r.text).join('\n').trim()
      if (!content) continue
      sections.push({
        key,
        title: DEFAULT_SECTION_TITLES[key] || h3.text.trim() || key,
        content,
      })
    }

    // If the trip has content directly under H2, collect it as a "notes" section (prose).
    // (This allows a short intro before the first H3 section.)
    const topContent = h2.content.map((r) => r.text).join('\n').trim()
    if (topContent) {
      sections.unshift({ key: 'notes', title: '重點（Notes）', content: topContent })
    }

    // Collapse overview content into a single `notes` section.
    // Authoring may include:
    // - H2 top content (notes)
    // - H3 `summary`
    // - H3 `why`
    // We merge them to reduce fragmentation in the UI and keep authoring flexible.
    const OVERVIEW_KEYS = ['notes', 'summary', 'why']
    const overviewChunks = []
    for (const k of OVERVIEW_KEYS) {
      const sec = sections.find((s) => s.key === k)
      if (sec?.content?.trim()) overviewChunks.push(sec.content.trim())
    }
    if (overviewChunks.length) {
      const mergedNotes = overviewChunks.join('\n\n').trim()
      const rest = sections.filter((s) => !OVERVIEW_KEYS.includes(s.key))
      sections = [{ key: 'notes', title: '重點（Notes）', content: mergedNotes }, ...rest]
    }

    if (!sections.length) throw mdError(sourcePath, h2.line, `Trip "${id}" must include at least 1 non-empty section`)

    trips.push({ id, title: tripTitle, sections })
  }

  if (!trips.length) throw mdError(sourcePath, h1.line, 'Extensions file must include at least 1 trip (## ...)')

  return { cityId, title, trips }
}

