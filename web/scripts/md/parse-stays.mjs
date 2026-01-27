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

function parseMarkdownTable(sectionNode, sourcePath, sectionName) {
  // Supports basic GitHub-flavored markdown tables:
  // | H1 | H2 |
  // | --- | --- |
  // | a | b |
  const rows = []
  for (const row of sectionNode.content) {
    const t = row.text.trim()
    if (!t.startsWith('|')) continue
    rows.push({ line: row.line, text: t })
  }
  if (rows.length < 2) throw mdError(sourcePath, sectionNode.line, `Missing markdown table in ## ${sectionName}`)

  const splitRow = (t) => {
    const inner = t.replace(/^\|/, '').replace(/\|$/, '')
    return inner.split('|').map((c) => c.trim())
  }

  const header = splitRow(rows[0].text).filter((x) => x.length > 0)
  const sep = splitRow(rows[1].text)
  const isSep = sep.every((c) => /^:?-{3,}:?$/.test(c) || c === '')
  if (!header.length || !isSep) {
    throw mdError(sourcePath, rows[0].line, `Invalid table format in ## ${sectionName} (expected header + --- separator)`)
  }

  const bodyRows = rows.slice(2).map((r) => splitRow(r.text))
  const normalized = bodyRows
    .map((cells) => {
      const filtered = cells.map((x) => x ?? '')
      return filtered
    })
    .filter((cells) => cells.some((c) => c.trim().length))

  const outRows = []
  for (const cells of normalized) {
    const label = (cells[0] || '').trim()
    if (!label) continue
    outRows.push({ label, values: cells.slice(1).map((x) => (x ?? '').trim()) })
  }
  if (!outRows.length) throw mdError(sourcePath, sectionNode.line, `## ${sectionName} table must include at least 1 row`)

  return { headers: header, rows: outRows }
}

function parseWeights(sectionNode, sourcePath) {
  // Fixed format:
  // - Criterion label | weight=0.3
  const weights = []
  for (const row of sectionNode.content) {
    const m = /^-\s+(.*)$/.exec(row.text)
    if (!m) continue
    const head = m[1].trim()
    if (!head) continue
    const parts = splitPipeParts(head)
    const criterion = parts[0] || ''
    const meta = parts.slice(1).join(' | ')
    const w = /weight\s*=\s*([0-9]*\.?[0-9]+)/.exec(meta)?.[1]
    if (!criterion || !w) continue
    weights.push({ criterion, weight: Number(w) })
  }
  if (!weights.length) throw mdError(sourcePath, sectionNode.line, 'Missing scoringModel weights (expected "- X | weight=0.3")')
  return weights
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
  const riskMatrixH2 = h2s.get('riskMatrix')
  const scoringModelH2 = h2s.get('scoringModel')

  if (!optionsH2) throw mdError(sourcePath, h1.line, 'Missing section: ## options')
  if (!ptH2) throw mdError(sourcePath, h1.line, 'Missing section: ## publicTransportHowToBuy')
  if (!tipsH2) throw mdError(sourcePath, h1.line, 'Missing section: ## moneySavingTips')
  if (!riskMatrixH2) throw mdError(sourcePath, h1.line, 'Missing section: ## riskMatrix')
  if (!scoringModelH2) throw mdError(sourcePath, h1.line, 'Missing section: ## scoringModel')

  /** @type {any[]} */
  const options = []
  let current = null

  for (const row of optionsH2.content) {
    const top = /^-\s+(.*)$/.exec(row.text)
    const ind = /^\s{2,}-\s+(.*)$/.exec(row.text)

    if (top) {
      const head = top[1].trim()
      if (!head) continue
      const [name, ...metaParts] = splitPipeParts(head)
      const meta = metaParts.join(' | ')
      const status = /status\s*=\s*(primary|secondary|backup)/.exec(meta)?.[1]
      current = { name, why: [], risks: [], links: [], ...(status ? { statusHint: status } : {}) }
      options.push(current)
      continue
    }

    if (ind && current) {
      const v = ind[1].trim()
      if (!v) continue
      const m = /^(why|risk|link)\s*:\s*(.*)$/.exec(v)
      if (!m) continue
      const [, kind, restRaw] = m
      const rest = restRaw.trim()
      if (kind === 'why' && rest) current.why.push(rest)
      if (kind === 'risk' && rest) current.risks.push(rest)
      if (kind === 'link') {
        const parts = splitPipeParts(rest)
        if (parts.length >= 2) current.links.push({ label: parts[0], href: parts[1] })
      }
    }
  }

  if (!options.length) throw mdError(sourcePath, optionsH2.line, '## options must have at least 1 item')

  const publicTransportHowToBuy = []
  for (const row of ptH2.content) {
    const m = /^-\s+(.*)$/.exec(row.text)
    if (!m) continue
    const v = m[1].trim()
    if (v) publicTransportHowToBuy.push(v)
  }
  if (!publicTransportHowToBuy.length) throw mdError(sourcePath, ptH2.line, '## publicTransportHowToBuy must have at least 1 item')

  const moneySavingTips = []
  for (const row of tipsH2.content) {
    const m = /^-\s+(.*)$/.exec(row.text)
    if (!m) continue
    const v = m[1].trim()
    if (v) moneySavingTips.push(v)
  }
  if (!moneySavingTips.length) throw mdError(sourcePath, tipsH2.line, '## moneySavingTips must have at least 1 item')

  const riskMatrix = parseMarkdownTable(riskMatrixH2, sourcePath, 'riskMatrix')

  // scoringModel expects fixed subsections:
  // ### weights
  // - Criterion | weight=0.3
  //
  // ### table
  // | ... |
  const scoringH3s = new Map(findChildren(scoringModelH2, 3).map((n) => [n.text.trim(), n]))
  const weightsH3 = scoringH3s.get('weights')
  const tableH3 = scoringH3s.get('table')
  if (!weightsH3) throw mdError(sourcePath, scoringModelH2.line, 'Missing section: ### weights (under ## scoringModel)')
  if (!tableH3) throw mdError(sourcePath, scoringModelH2.line, 'Missing section: ### table (under ## scoringModel)')

  const weights = parseWeights(weightsH3, sourcePath)
  const table = parseMarkdownTable(tableH3, sourcePath, 'scoringModel.table')

  return { cityId, title, options, publicTransportHowToBuy, moneySavingTips, riskMatrix, scoringModel: { weights, table } }
}

