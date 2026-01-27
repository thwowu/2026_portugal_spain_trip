import fs from 'node:fs'
import path from 'node:path'

export function normalizeNewlines(s) {
  return s.replace(/\r\n/g, '\n')
}

export function mdError(sourcePath, line, message) {
  const rel = path.relative(process.cwd(), sourcePath)
  return new Error(`${rel}:${line}: ${message}`)
}

export function readUtf8(sourcePath) {
  return fs.readFileSync(sourcePath, 'utf8')
}

export function parseFrontmatter(raw, sourcePath) {
  const text = normalizeNewlines(raw)
  if (!text.startsWith('---\n')) {
    return { frontmatter: {}, body: text, bodyLineOffset: 0 }
  }

  const end = text.indexOf('\n---\n', 4)
  if (end === -1) throw mdError(sourcePath, 1, 'Unterminated YAML frontmatter (missing closing ---)')

  const fmText = text.slice(4, end)
  const body = text.slice(end + '\n---\n'.length)
  const fmLines = fmText.split('\n')

  const frontmatter = {}
  for (let i = 0; i < fmLines.length; i++) {
    const lineNo = i + 2
    const line = fmLines[i]
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('#')) continue
    const m = /^([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(line)
    if (!m) throw mdError(sourcePath, lineNo, `Invalid frontmatter line: ${line}`)
    const [, key, valueRaw] = m
    frontmatter[key] = valueRaw.trim()
  }

  // opening --- + fm lines + closing ---
  const bodyLineOffset = 1 + fmLines.length + 1
  return { frontmatter, body, bodyLineOffset }
}

export function parseLines(body, bodyLineOffset = 0) {
  const lines = normalizeNewlines(body).split('\n')
  return lines.map((text, idx) => ({ line: bodyLineOffset + idx + 1, text }))
}

export function collectSections(lines) {
  // Very small markdown-ish parser:
  // - headings: ^#{1,6} <text>
  // - content is captured until next heading of same/higher depth
  /** @type {{depth:number, text:string, line:number, content:{line:number,text:string}[], children:any[]}[]} */
  const root = [{ depth: 0, text: '__root__', line: 0, content: [], children: [] }]
  const stack = root

  for (const row of lines) {
    const h = /^(#{1,6})\s+(.*)$/.exec(row.text)
    if (h) {
      const depth = h[1].length
      const text = h[2].trim()
      const node = { depth, text, line: row.line, content: [], children: [] }
      while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop()
      stack[stack.length - 1].children.push(node)
      stack.push(node)
      continue
    }
    stack[stack.length - 1].content.push(row)
  }

  return root[0]
}

export function findFirst(root, depth) {
  const q = [...root.children]
  while (q.length) {
    const n = q.shift()
    if (n.depth === depth) return n
    q.unshift(...n.children)
  }
  return null
}

export function findChildren(parent, depth) {
  return parent.children.filter((c) => c.depth === depth)
}

export function listTopLevelBullets(content) {
  const out = []
  for (const row of content) {
    const m = /^-\s+(.*)$/.exec(row.text)
    if (!m) continue
    const v = m[1].trim()
    if (v) out.push({ line: row.line, text: v })
  }
  return out
}

// List bullet lines (any indent level), preserving nesting visually.
// Output strings include the leading "- " or "  - " so the UI can render them as-is.
export function listBulletsAll(content) {
  const out = []
  for (const row of content) {
    const m = /^(\s*)-\s+(.*)$/.exec(row.text)
    if (!m) continue
    const indentRaw = m[1] || ''
    const v = (m[2] || '').trim()
    if (!v) continue
    const level = Math.floor(indentRaw.length / 2)
    out.push({ line: row.line, text: `${'  '.repeat(level)}- ${v}` })
  }
  return out
}

export function parseInlineKvPairs(s) {
  const out = {}
  for (const part of s.split(/\s+/).filter(Boolean)) {
    const m = /^([A-Za-z0-9_]+)=(.+)$/.exec(part)
    if (!m) continue
    out[m[1]] = m[2]
  }
  return out
}

