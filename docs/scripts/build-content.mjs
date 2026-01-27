import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import {
  AttractionsFileSchema,
  ExtensionsFileSchema,
  ItineraryFileSchema,
  StaysFileSchema,
  TransportFileSchema,
} from './content-schema.mjs'

const ROOT = process.cwd()
const CONTENT_DIR = path.join(ROOT, 'src', 'content')
const GENERATED_DIR = path.join(ROOT, 'src', 'generated')

const ONLY_KINDS = ['itinerary', 'transport', 'stays', 'attractions', 'extensions']

import { readUtf8 } from './md/md.mjs'
import { parseAttractionsCityMd } from './md/parse-attractions.mjs'
import { parseExtensionsCityMd } from './md/parse-extensions.mjs'
import { parseStaysCityMd } from './md/parse-stays.mjs'
import { parseTransportSegmentMd } from './md/parse-transport.mjs'
import { parseItineraryMd } from './md/parse-itinerary.mjs'

function parseArgs(argv) {
  const args = { check: false, only: new Set(ONLY_KINDS) }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--check') {
      args.check = true
      continue
    }
    if (a === '--only') {
      const v = argv[i + 1]
      if (!v) throw new Error('Missing value for --only')
      if (!ONLY_KINDS.includes(v)) {
        throw new Error(`Invalid --only value: ${v}. Expected one of: ${ONLY_KINDS.join(', ')}`)
      }
      args.only = new Set([v])
      i++
      continue
    }
    throw new Error(`Unknown arg: ${a}`)
  }
  return args
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function normalizeNewlines(s) {
  return s.replace(/\r\n/g, '\n')
}

function writeOrCheck(filePath, content, check) {
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

function tsHeader(sourceLabel) {
  const rel = path.relative(ROOT, sourceLabel)
  return [
    '/**',
    ' * AUTO-GENERATED FILE. DO NOT EDIT.',
    ` * Source: ${rel}`,
    ' */',
    '',
  ].join('\n')
}

function tsExportConst({ sourceLabel, imports, exportName, typeName, value }) {
  const header = tsHeader(sourceLabel)
  const importLines = imports.length ? imports.join('\n') + '\n\n' : ''
  const json = JSON.stringify(value, null, 2)
  return (
    header +
    importLines +
    `export const ${exportName}: ${typeName} = ${json}\n`
  )
}

function validateItinerary(phases) {
  // day should be contiguous 1..N
  const days = phases.flatMap((p) => p.days.map((d) => d.day)).sort((a, b) => a - b)
  for (let i = 0; i < days.length; i++) {
    const expected = i + 1
    if (days[i] !== expected) {
      throw new Error(`Itinerary day numbers must be contiguous starting at 1. Missing Day ${expected}.`)
    }
  }
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => path.join(dir, f))
}

async function main() {
  const { check, only } = parseArgs(process.argv.slice(2))
  ensureDir(GENERATED_DIR)

  if (only.has('itinerary')) {
    const sourcePath = path.join(CONTENT_DIR, 'itinerary.md')
    const raw = readUtf8(sourcePath)
    const phases = parseItineraryMd({ sourcePath, raw })
    const parsed = ItineraryFileSchema.parse({ version: 1, phases })
    validateItinerary(parsed.phases)
    const out = path.join(GENERATED_DIR, 'itinerary.ts')
    const ts = tsExportConst({
      sourceLabel: sourcePath,
      imports: ["import type { ItineraryPhase } from '../data/itinerary'"],
      exportName: 'ITINERARY_PHASES',
      typeName: 'ItineraryPhase[]',
      value: parsed.phases,
    })
    writeOrCheck(out, ts, check)
  }

  if (only.has('transport')) {
    const sourcePaths = listFiles(CONTENT_DIR).filter((p) => path.basename(p).startsWith('transport.') && !p.endsWith('.legacy.md'))
    const segments = sourcePaths.map((p) => parseTransportSegmentMd({ sourcePath: p, raw: readUtf8(p) }))
    const parsed = TransportFileSchema.parse({ version: 1, segments })
    const out = path.join(GENERATED_DIR, 'transport.ts')
    const ts = tsExportConst({
      sourceLabel: sourcePaths.length ? sourcePaths[0] : path.join(CONTENT_DIR, 'transport.*.md'),
      imports: ["import type { TransportSegment } from '../data/transport'"],
      exportName: 'TRANSPORT_DATA',
      typeName: 'TransportSegment[]',
      value: parsed.segments,
    })
    writeOrCheck(out, ts, check)
  }

  if (only.has('stays')) {
    const sourcePaths = listFiles(CONTENT_DIR).filter((p) => path.basename(p).startsWith('stays.') && !p.endsWith('.legacy.md'))
    const cities = sourcePaths.map((p) => parseStaysCityMd({ sourcePath: p, raw: readUtf8(p) }))
    const parsed = StaysFileSchema.parse({ version: 1, cities })
    const out = path.join(GENERATED_DIR, 'stays.ts')
    const ts = tsExportConst({
      sourceLabel: sourcePaths.length ? sourcePaths[0] : path.join(CONTENT_DIR, 'stays.*.md'),
      imports: ["import type { CityStay } from '../data/stays'"],
      exportName: 'STAYS_DATA',
      typeName: 'CityStay[]',
      value: parsed.cities,
    })
    writeOrCheck(out, ts, check)
  }

  if (only.has('attractions')) {
    const sourcePaths = listFiles(CONTENT_DIR).filter((p) => path.basename(p).startsWith('attractions.') && !p.endsWith('.legacy.md'))
    const cities = sourcePaths.map((p) => parseAttractionsCityMd({ sourcePath: p, raw: readUtf8(p) }))
    const parsed = AttractionsFileSchema.parse({ version: 1, cities })
    const out = path.join(GENERATED_DIR, 'attractions.ts')
    const ts = tsExportConst({
      sourceLabel: sourcePaths.length ? sourcePaths[0] : path.join(CONTENT_DIR, 'attractions.*.md'),
      imports: ["import type { CityAttractions } from '../data/attractions'"],
      exportName: 'ATTRACTIONS_DATA',
      typeName: 'CityAttractions[]',
      value: parsed.cities,
    })
    writeOrCheck(out, ts, check)
  }

  if (only.has('extensions')) {
    const sourcePaths = listFiles(CONTENT_DIR).filter((p) => path.basename(p).startsWith('extensions.') && !p.endsWith('.legacy.md'))
    const cities = sourcePaths.map((p) => parseExtensionsCityMd({ sourcePath: p, raw: readUtf8(p) }))
    const parsed = ExtensionsFileSchema.parse({ version: 1, cities })
    const out = path.join(GENERATED_DIR, 'extensions.ts')
    const ts = tsExportConst({
      sourceLabel: sourcePaths.length ? sourcePaths[0] : path.join(CONTENT_DIR, 'extensions.*.md'),
      imports: ["import type { CityExtensions } from '../data/extensions'"],
      exportName: 'EXTENSIONS_DATA',
      typeName: 'CityExtensions[]',
      value: parsed.cities,
    })
    writeOrCheck(out, ts, check)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

