import {
  collectSections,
  findChildren,
  findFirst,
  mdError,
  parseFrontmatter,
  parseLines,
} from './md.mjs'

// Section kinds shown as city tabs in the Attractions page.
//
// Note: `photo` is intentionally OPTIONAL. It used to be required, but we decided
// some cities don't need a dedicated photo section anymore.
const REQUIRED_KINDS = /** @type {const} */ ([
  'must',
  'easy',
  'rain',
  'views',
  'routes',
  'skip',
  'practical',
  'food',
  'safety',
])

const OPTIONAL_KINDS = /** @type {const} */ (['photo'])

const KIND_ORDER = /** @type {const} */ ([
  'must',
  'easy',
  'rain',
  'views',
  'routes',
  'skip',
  'practical',
  'food',
  'photo',
  'safety',
])

const ALLOWED_KINDS = /** @type {const} */ ([...KIND_ORDER])

const DEFAULT_TITLES = {
  must: '必去（Top picks）',
  easy: '走路少 / 輕鬆（Easy）',
  rain: '下雨備案（Rain plan）',
  views: '風景視角點（Views）',
  routes: '半日/一日組合路線（Ready-made routes）',
  skip: '可跳過（Skip if tired）',
  practical: '實用資訊（Practical）',
  food: '吃什麼（Food list）',
  photo: '拍照點（Photo spots）',
  safety: '安全提醒（Safety）',
}

/**
 * Serialize a section node's markdown block.
 *
 * Our mini parser (`collectSections`) stores "content" lines only up to the next
 * heading of same/higher depth, and nests headings as children. For attractions,
 * most real content lives under H3/H4 under each H2 kind (e.g. "## must" then
 * "### Alhambra..."), so we must include descendants, not just `h2.content`.
 *
 * @param {{depth:number, text:string, content:{text:string}[], children:any[]}} node
 */
function serializeSectionBody(node) {
  /** @type {string[]} */
  const out = []

  for (const row of node.content) out.push(row.text)

  const walk = (n) => {
    for (const c of n.children || []) {
      out.push(`${'#'.repeat(c.depth)} ${c.text}`)
      for (const row of c.content || []) out.push(row.text)
      walk(c)
    }
  }
  walk(node)

  // Keep authoring-friendly whitespace, but avoid trailing spaces/newlines noise in TS.
  return out.join('\n').trim()
}

export function parseAttractionsCityMd({ sourcePath, raw }) {
  const { frontmatter, body, bodyLineOffset } = parseFrontmatter(raw, sourcePath)
  const lines = parseLines(body, bodyLineOffset)
  const tree = collectSections(lines)

  const h1 = findFirst(tree, 1)
  if (!h1) throw mdError(sourcePath, 1, 'Missing H1 (# City title)')

  const cityId = frontmatter.cityId?.trim()
  if (!cityId) throw mdError(sourcePath, 1, 'Missing frontmatter: cityId')

  const title = frontmatter.title?.trim() || h1.text

  const byKind = new Map()
  for (const h2 of findChildren(h1, 2)) {
    const kind = h2.text.trim()
    if (!ALLOWED_KINDS.includes(kind)) continue
    const content = serializeSectionBody(h2)
    byKind.set(kind, { kind, title: DEFAULT_TITLES[kind] || kind, content })
  }

  const missing = REQUIRED_KINDS.filter((k) => !byKind.has(k))
  if (missing.length) {
    throw mdError(sourcePath, h1.line, `Missing sections: ${missing.join(', ')}`)
  }

  const extensionsH2 = findChildren(h1, 2).find((h2) => h2.text.trim() === 'extensions')
  // Deprecated: attractions content should not embed bullet-based extensions; keep for backward compatibility
  // in case older files still include "- ..." lines under "## extensions".
  const extensions = extensionsH2
    ? extensionsH2.content
        .map((r) => r.text)
        .filter((t) => t.trim().startsWith('- '))
        .map((t) => t.trim().slice(2).trim())
        .filter(Boolean)
    : []

  return {
    cityId,
    title,
    sections: KIND_ORDER.filter((k) => byKind.has(k)).map((k) => byKind.get(k)),
    ...(extensions.length ? { extensions } : {}),
  }
}

