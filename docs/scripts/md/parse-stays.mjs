import {
  collectSections,
  findChildren,
  findFirst,
  mdError,
  parseFrontmatter,
  parseLines,
} from './md.mjs'

function renderSectionMarkdown(node) {
  const out = []
  // Emit the node's own content lines (as-authored)
  for (const row of node.content) out.push(row.text)
  // Emit children recursively with their heading lines
  for (const child of node.children) {
    out.push(`${'#'.repeat(child.depth)} ${child.text}`.trimEnd())
    out.push(renderSectionMarkdown(child))
  }
  return out.join('\n').trim()
}

function splitPipeParts(s) {
  return s.split('|').map((p) => p.trim()).filter(Boolean)
}

export function parseStaysCityMd({ sourcePath, raw }) {
  const { frontmatter, body, bodyLineOffset } = parseFrontmatter(raw, sourcePath)
  const lines = parseLines(body, bodyLineOffset)
  const tree = collectSections(lines)

  const h1 = findFirst(tree, 1)
  if (!h1) throw mdError(sourcePath, 1, 'Missing H1 (# City stays title)')

  const cityId = frontmatter.cityId?.trim()
  if (!cityId) throw mdError(sourcePath, 1, 'Missing frontmatter: cityId')

  const title = frontmatter.title?.trim() || h1.text

  const h2s = new Map(findChildren(h1, 2).map((n) => [n.text.trim(), n]))
  const optionsH2 = h2s.get('options')
  const ptH2 = h2s.get('publicTransportHowToBuy')
  const tipsH2 = h2s.get('moneySavingTips')

  if (!optionsH2) throw mdError(sourcePath, h1.line, 'Missing section: ## options')
  if (!ptH2) throw mdError(sourcePath, h1.line, 'Missing section: ## publicTransportHowToBuy')
  if (!tipsH2) throw mdError(sourcePath, h1.line, 'Missing section: ## moneySavingTips')

  /** @type {any[]} */
  const options = []
  let current = null
  /** @type {null | 'why' | 'risk'} */
  let lastTextKind = null
  let lastTextIndex = -1
  let lastBulletIndent = 0

  for (const row of optionsH2.content) {
    const top = /^-\s+(.*)$/.exec(row.text)
    const ind = /^(\s{2,})-\s+(.*)$/.exec(row.text)
    const cont = /^(\s{4,})(.*)$/.exec(row.text)

    if (top) {
      const head = top[1].trim()
      if (!head) continue
      const [name, ...metaParts] = splitPipeParts(head)
      const meta = metaParts.join(' | ')
      const status = /status\s*=\s*(primary|secondary|backup)/.exec(meta)?.[1]
      current = { name, why: [], risks: [], links: [], ...(status ? { statusHint: status } : {}) }
      options.push(current)
      lastTextKind = null
      lastTextIndex = -1
      lastBulletIndent = 0
      continue
    }

    if (ind && current) {
      const indentRaw = ind[1] || ''
      const v = (ind[2] || '').trim()
      if (!v) continue
      const m = /^(why|risk|link)\s*:\s*(.*)$/.exec(v)
      if (!m) {
        lastTextKind = null
        lastTextIndex = -1
        lastBulletIndent = 0
        continue
      }
      const [, kind, restRaw] = m
      const rest = (restRaw ?? '').trim()
      lastBulletIndent = indentRaw.length
      if (kind === 'why') {
        current.why.push(rest)
        lastTextKind = 'why'
        lastTextIndex = current.why.length - 1
      }
      if (kind === 'risk') {
        current.risks.push(rest)
        lastTextKind = 'risk'
        lastTextIndex = current.risks.length - 1
      }
      if (kind === 'link') {
        const parts = splitPipeParts(rest)
        if (parts.length >= 2) current.links.push({ label: parts[0], href: parts[1] })
        lastTextKind = null
        lastTextIndex = -1
        lastBulletIndent = 0
      }
      continue
    }

    // Allow multi-line "why"/"risk" entries by treating indented continuation lines as text.
    // Authoring format:
    // - Hotel
    //   - why: First line
    //     Continuation line
    //     (blank lines create paragraphs)
    //
    // Continuation lines must be indented deeper than the "- why:" bullet.
    if (current && cont && lastTextKind && lastTextIndex >= 0) {
      const contIndent = (cont[1] || '').length
      if (contIndent < lastBulletIndent + 2) continue
      const line = (cont[2] ?? '').trimEnd()
      const isBlank = line.trim().length === 0

      if (lastTextKind === 'why') {
        const prev = current.why[lastTextIndex] ?? ''
        if (isBlank) {
          if (!prev.endsWith('\n\n')) current.why[lastTextIndex] = prev + '\n\n'
        } else {
          const joiner = prev ? (prev.endsWith('\n') ? '' : '\n') : ''
          current.why[lastTextIndex] = prev + joiner + line
        }
      }
      if (lastTextKind === 'risk') {
        const prev = current.risks[lastTextIndex] ?? ''
        if (isBlank) {
          if (!prev.endsWith('\n\n')) current.risks[lastTextIndex] = prev + '\n\n'
        } else {
          const joiner = prev ? (prev.endsWith('\n') ? '' : '\n') : ''
          current.risks[lastTextIndex] = prev + joiner + line
        }
      }
    }
  }

  if (!options.length) throw mdError(sourcePath, optionsH2.line, '## options must have at least 1 item')

  const publicTransportHowToBuy = renderSectionMarkdown(ptH2)
  if (!publicTransportHowToBuy) throw mdError(sourcePath, ptH2.line, '## publicTransportHowToBuy must have content')

  const moneySavingTips = renderSectionMarkdown(tipsH2)
  if (!moneySavingTips) throw mdError(sourcePath, tipsH2.line, '## moneySavingTips must have content')

  return { cityId, title, options, publicTransportHowToBuy, moneySavingTips }
}

