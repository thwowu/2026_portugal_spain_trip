import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const CONTENT_DIR = path.join(ROOT, 'src', 'content')

function splitLines(text) {
  return (text ?? '').replace(/\r\n/g, '\n').split('\n')
}

function dedupeRepeatedSuffix(s) {
  // Dedupe immediate repetitions like "：foo：foo" or ": foo: foo"
  return String(s)
    .replace(/([：:]\s*[^：:]+)\1+/g, '$1')
    .replace(/^(.+?)\s+\1$/g, '$1')
    .replace(/(\s{2,})/g, ' ')
}

function repairLine(line) {
  let s = line

  // 0) Fix patterns like:
  // - **Foo**：BAR- [**Foo**：BAR](href) tail tail
  // → - **Foo**： BAR-with-link tail
  {
    const m = /^(\s*-\s+)\*\*(.+?)\*\*\s*([：:])\s*(.+?)-\s+\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\s*(.*)$/.exec(s)
    if (m) {
      const lead = m[1]
      const head = (m[2] ?? '').trim()
      const colon = m[3] ?? '：'
      const prefix = (m[4] ?? '').trim()
      const injectedLabel = (m[5] ?? '')
      const href = (m[6] ?? '').trim()
      let tail = (m[7] ?? '').trim()

      // Only apply when the injected label clearly repeats the lead + prefix (our corruption signature).
      if (injectedLabel.includes(head) && injectedLabel.includes(prefix)) {
        // Small heuristics: keep common verbs outside the link for readability.
        let verb = ''
        let label = prefix
        for (const v of ['選', '俯瞰']) {
          if (label.startsWith(`${v} `)) {
            verb = `${v} `
            label = label.slice((`${v} `).length).trim()
            break
          }
        }
        label = label.replace(/\s+/g, ' ').trim()
        if (!label) label = prefix

        tail = dedupeRepeatedSuffix(tail)
        const linked = `[${label}](${href})`
        return `${lead}**${head}**${colon} ${verb}${linked}${tail ? ` ${tail}` : ''}`.replace(/\s+$/, '')
      }
    }
  }

  // 0) Fix "- **X**： ... - [**X**： ...](href) ..." style corruptions
  // Convert to: "- **X**： ... [<afterColon>](href) ..."
  {
    const m = /^(\s*-\s+)\*\*(.+?)\*\*\s*([：:])\s*(.+?)-\s+\[\*\*([^\]]+?)\*\*\]\((https?:\/\/[^)\s]+)\)\s*(.*)$/.exec(s)
    if (m) {
      const lead = m[1]
      const x = (m[2] ?? '').trim()
      const colon = m[3] ?? '：'
      const beforeLink = (m[4] ?? '').trimEnd()
      const linkedLabelRaw = (m[5] ?? '').trim()
      const href = (m[6] ?? '').trim()
      let after = (m[7] ?? '').trim()

      // Pick link label as the part after the last colon in the injected label.
      const parts = linkedLabelRaw.split(/[：:]/).map((p) => p.trim()).filter(Boolean)
      let linkLabel = parts.length ? parts[parts.length - 1] : linkedLabelRaw
      linkLabel = linkLabel.replace(/\*\*/g, '').trim()
      if (!linkLabel) linkLabel = 'Google Maps'

      // Dedupe if the tail repeats exactly.
      after = dedupeRepeatedSuffix(after)

      const mid = beforeLink ? `${beforeLink} ` : ''
      return `${lead}**${x}**${colon} ${mid}[${linkLabel}](${href})${after ? ` ${after}` : ''}`.replace(/\s+$/, '')
    }
  }

  // 0.5) Fix "- X ... - [**X](href)**：desc**：desc" (without initial bold lead)
  {
    const m = /^(\s*-\s+)(.+?)-\s+\[\*\*([^\]]+?)\]\((https?:\/\/[^)\s]+)\)\*\*\s*([：:])\s*(.*)$/.exec(s)
    if (m) {
      const lead = m[1]
      const x = (m[2] ?? '').trimEnd()
      const labelRaw = (m[3] ?? '').trim()
      const href = (m[4] ?? '').trim()
      const colon = m[5] ?? '：'
      let desc = (m[6] ?? '').trim()
      // keep only first chunk if duplicated marker exists
      desc = desc.split(/\*{2}\s*[：:]/)[0]?.trim() ?? desc
      desc = dedupeRepeatedSuffix(desc)
      const label = labelRaw.replace(/\*\*/g, '').trim() || x || '地點'
      return desc ? `${lead}**[${label}](${href})**${colon} ${desc}` : `${lead}**[${label}](${href})**`
    }
  }

  // 1) Fix duplicated headings like:
  // "### Title### [Title](url)：desc：desc"
  {
    const m = /^(#{3,4})\s*(.+?)\s*#{3,4}\s*\[\2\]\((https?:\/\/[^)\s]+)\)(.*)$/.exec(s)
    if (m) {
      const h = m[1]
      const title = m[2].trim()
      const href = m[3].trim()
      const suffix = dedupeRepeatedSuffix(m[4] ?? '')
      return `${h} [${title}](${href})${suffix}`.replace(/\s+$/, '')
    }
  }

  // 2) Fix duplicated numbered items like:
  // "1. Foo1. [Foo](url) ..."
  {
    const m = /^(\s*\d+\.\s+)(.+?)\1\[\2\]\((https?:\/\/[^)\s]+)\)(.*)$/.exec(s)
    if (m) {
      const lead = m[1]
      const label = m[2].trim()
      const href = m[3].trim()
      const suffix = dedupeRepeatedSuffix(m[4] ?? '')
      return `${lead}[${label}](${href})${suffix}`.replace(/\s+$/, '')
    }
  }

  // 3) Fix duplicated list bullets with bold/link corruption like:
  // "- **X- [**X](url)**：desc**：desc"
  {
    const m = /^(\s*-\s+)\*\*(.+?)-\s+\[\*\*\2\]\((https?:\/\/[^)\s]+)\)\*\*\s*([：:])\s*(.*)$/.exec(s)
    if (m) {
      const lead = m[1]
      const title = (m[2] ?? '').trim()
      const href = (m[3] ?? '').trim()
      const colon = m[4] ?? '：'
      let desc = (m[5] ?? '').trim()
      // If description contains a duplicated "**：" marker, keep only the first chunk.
      desc = desc.split(/\*{2}\s*[：:]/)[0]?.trim() ?? desc
      desc = dedupeRepeatedSuffix(desc)
      return desc ? `${lead}**[${title}](${href})**${colon} ${desc}` : `${lead}**[${title}](${href})**`
    }
  }

  // 4) Fix duplicated list bullets without initial bold wrapper like:
  // "- Foo- [**Foo](url)**：desc**：desc"
  {
    const m = /^(\s*-\s+)(.+?)-\s+\[\*\*\2\]\((https?:\/\/[^)\s]+)\)\*\*\s*([：:])\s*(.*)$/.exec(s)
    if (m) {
      const lead = m[1]
      const title = (m[2] ?? '').trim()
      const href = (m[3] ?? '').trim()
      const colon = m[4] ?? '：'
      let desc = (m[5] ?? '').trim()
      desc = desc.split(/\*{2}\s*[：:]/)[0]?.trim() ?? desc
      desc = dedupeRepeatedSuffix(desc)
      return desc ? `${lead}**[${title}](${href})**${colon} ${desc}` : `${lead}**[${title}](${href})**`
    }
  }

  // 5) Remove obvious duplicated sentence fragments created by earlier replacement, e.g. "... 。  。"
  s = s.replace(/。\s*。\s*$/, '。')
  s = s.replace(/\s{2,}$/, '')
  return s
}

function repairFile(text) {
  const lines = splitLines(text)
  let inFence = false
  const out = lines.map((line) => {
    const t = line.trimStart()
    if (t.startsWith('```')) {
      inFence = !inFence
      return line
    }
    if (inFence) return line
    return repairLine(line)
  })
  return out.join('\n')
}

function listContentFiles() {
  if (!fs.existsSync(CONTENT_DIR)) return []
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.md'))
    .filter((f) => !f.endsWith('.legacy.md'))
    .filter((f) => f !== 'README.md')
    .sort()
    .map((f) => path.join(CONTENT_DIR, f))
}

function main() {
  const files = listContentFiles()
  let changed = 0
  for (const p of files) {
    const prev = fs.readFileSync(p, 'utf8')
    const next = repairFile(prev)
    if (next !== prev) {
      fs.writeFileSync(p, next, 'utf8')
      changed++
      console.log(`Repaired: ${path.relative(ROOT, p)}`)
    }
  }
  console.log(`Done. Repaired files: ${changed}/${files.length}`)
}

main()

