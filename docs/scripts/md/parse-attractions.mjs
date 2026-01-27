import {
  collectSections,
  findChildren,
  findFirst,
  mdError,
  parseFrontmatter,
  parseLines,
} from './md.mjs'

const REQUIRED_KINDS = /** @type {const} */ ([
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
    if (!REQUIRED_KINDS.includes(kind)) continue
    const content = h2.content.map((r) => r.text).join('\n').trim()
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
    sections: REQUIRED_KINDS.map((k) => byKind.get(k)),
    ...(extensions.length ? { extensions } : {}),
  }
}

