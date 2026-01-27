import {
  collectSections,
  findChildren,
  findFirst,
  mdError,
  parseFrontmatter,
  parseLines,
  listBulletsAll,
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

    const sections = []

    // H3 sections preferred.
    const h3s = findChildren(h2, 3)
    for (const h3 of h3s) {
      const key = slugify(h3.text.trim() || 'section')
      const items = listBulletsAll(h3.content).map((x) => x.text)
      if (!items.length) continue
      sections.push({
        key,
        title: DEFAULT_SECTION_TITLES[key] || h3.text.trim() || key,
        items,
      })
    }

    // If the trip has bullets directly under H2, collect them as a "notes" section.
    const topItems = listBulletsAll(h2.content).map((x) => x.text)
    if (topItems.length) {
      sections.unshift({ key: 'notes', title: '重點（Notes）', items: topItems })
    }

    if (!sections.length) throw mdError(sourcePath, h2.line, `Trip "${id}" must include at least 1 bullet item`)

    trips.push({ id, title: tripTitle, sections })
  }

  if (!trips.length) throw mdError(sourcePath, h1.line, 'Extensions file must include at least 1 trip (## ...)')

  return { cityId, title, trips }
}

