import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'

const ROOT = path.resolve(process.cwd(), '..')
const INPUT = path.join(ROOT, '葡西之旅建議.md')

const OUT_DIR = path.join(process.cwd(), 'src', 'content')
fs.mkdirSync(OUT_DIR, { recursive: true })

const files = new Map()
function open(name) {
  const p = path.join(OUT_DIR, name)
  const stream = fs.createWriteStream(p, { encoding: 'utf8' })
  files.set(name, stream)
  return stream
}

const outputs = {
  itinerary: open('itinerary.md'),
  stays_lisbon: open('stays.lisbon.md'),
  transport_lisbon_lagos: open('transport.lisbon-lagos.md'),
  stays_lagos: open('stays.lagos.md'),
  transport_lagos_seville: open('transport.lagos-seville.md'),
  stays_seville: open('stays.seville.md'),
  transport_seville_granada: open('transport.seville-granada.md'),
  stays_granada: open('stays.granada.md'),
  transport_granada_madrid: open('transport.granada-madrid.md'),
  stays_madrid: open('stays.madrid.md'),
  misc: open('misc.md'),
}

function routeForHeading(h) {
  if (h.startsWith('# 里斯本住宿')) return 'stays_lisbon'
  if (h.startsWith('# 里斯本 -> Lagos 交通')) return 'transport_lisbon_lagos'
  if (h.startsWith('# 拉狗 Lagos 住宿')) return 'stays_lagos'
  if (h.startsWith('# 拉狗 -> 塞維爾 交通') || h.startsWith('# 拉狗 -> 賽維爾 交通') || h.startsWith('# **拉狗 -> 賽維爾**')) return 'transport_lagos_seville'
  if (h.startsWith('# 賽維爾 住宿')) return 'stays_seville'
  if (h.startsWith('# 賽維爾 -> 格拉納達 交通')) return 'transport_seville_granada'
  if (h.startsWith('# 格拉納達 住宿')) return 'stays_granada'
  if (h.startsWith('# 格拉納達 -> 馬德里 交通')) return 'transport_granada_madrid'
  if (h.startsWith('# 馬德里住宿')) return 'stays_madrid'
  if (h.startsWith('# 西班牙 Abono')) return 'misc'
  return null
}

function rewriteInlineImages(line) {
  return line
    .replace('![][image3]', '![](/images/transport/lisbon-lagos-bus.png)')
    .replace('![][image4]', '![](/images/transport/lagos-seville-bus.png)')
    .replace('![][image5]', '![](/images/transport/lagos-seville-bus-alt.png)')
    .replace('![][image6]', '![](/images/transport/seville-granada-train.png)')
    .replace('![][image7]', '![](/images/transport/seville-granada-bus.png)')
    .replace('![][image8]', '![](/images/transport/granada-madrid-train.png)')
    .replace('![][image9]', '![](/images/transport/granada-madrid-bus.png)')
    // Day 7/8 images (base64 in original) — keep placeholder for now
    .replace('![][image1]', '*(圖片待補：Ponta da Piedade)*')
    .replace('![][image2]', '*(圖片待補：Benagil)*')
}

async function main() {
  if (!fs.existsSync(INPUT)) {
    console.error('Missing input:', INPUT)
    process.exit(1)
  }

  let current = 'itinerary'
  let inBase64Defs = false

  const rl = readline.createInterface({
    input: fs.createReadStream(INPUT, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  })

  for await (const raw of rl) {
    let line = raw

    // Drop base64 image definitions (they appear as single huge lines).
    if (/^\[image\d+\]:\s*<data:image\//.test(line)) {
      inBase64Defs = true
      continue
    }
    if (inBase64Defs) {
      // base64 defs are contiguous; stop skipping when we hit a normal heading or EOF
      if (/^#\s/.test(line)) inBase64Defs = false
      else continue
    }

    if (/^#\s/.test(line)) {
      const next = routeForHeading(line)
      if (next) current = next
    }

    line = rewriteInlineImages(line)
    outputs[current].write(line + '\n')
  }

  for (const s of files.values()) s.end()
  console.log('Wrote content to', OUT_DIR)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

