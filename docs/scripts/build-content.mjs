import path from 'node:path'
import process from 'node:process'

import { parseArgs } from './lib/args.mjs'
import { ensureDir } from './lib/io.mjs'
import { generateItinerary } from './generate/itinerary.mjs'
import { generateTransport } from './generate/transport.mjs'
import { generateStays } from './generate/stays.mjs'
import { generateAttractions } from './generate/attractions.mjs'
import { generateExtensions } from './generate/extensions.mjs'

const ROOT = process.cwd()
const CONTENT_DIR = path.join(ROOT, 'src', 'content')
const GENERATED_DIR = path.join(ROOT, 'src', 'generated')

async function main() {
  const { check, only } = parseArgs(process.argv.slice(2))
  ensureDir(GENERATED_DIR)

  const ctx = { rootDir: ROOT, contentDir: CONTENT_DIR, generatedDir: GENERATED_DIR, check }

  if (only.has('itinerary')) generateItinerary(ctx)
  if (only.has('transport')) generateTransport(ctx)
  if (only.has('stays')) generateStays(ctx)
  if (only.has('attractions')) generateAttractions(ctx)
  if (only.has('extensions')) generateExtensions(ctx)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

