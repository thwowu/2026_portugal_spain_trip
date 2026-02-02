import fs from 'node:fs'
import path from 'node:path'

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function normalizeNewlines(s) {
  return s.replace(/\r\n/g, '\n')
}

export function writeOrCheck(filePath, content, check) {
  const next = normalizeNewlines(content).trimEnd() + '\n'
  if (!fs.existsSync(filePath)) {
    if (check) throw new Error(`Missing generated file (run content:build): ${filePath}`)
    fs.writeFileSync(filePath, next, 'utf8')
    return
  }
  const prev = normalizeNewlines(fs.readFileSync(filePath, 'utf8'))
  if (prev !== next) {
    if (check) {
      throw new Error(`Generated file out of date: ${filePath}\nRun: npm run content:build`)
    }
    fs.writeFileSync(filePath, next, 'utf8')
  }
}

export function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => path.join(dir, f))
}

