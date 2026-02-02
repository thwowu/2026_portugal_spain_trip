import path from 'node:path'

import { StaysFileSchema } from '../content-schema.mjs'
import { readUtf8 } from '../md/md.mjs'
import { parseStaysCityMd } from '../md/parse-stays.mjs'
import { tsExportConst } from '../lib/tsgen.mjs'
import { listMarkdownFiles, writeOrCheck } from '../lib/io.mjs'

export function generateStays({ rootDir, contentDir, generatedDir, check }) {
  const sourcePaths = listMarkdownFiles(contentDir).filter(
    (p) => path.basename(p).startsWith('stays.') && !p.endsWith('.legacy.md'),
  )
  const cities = sourcePaths.map((p) => parseStaysCityMd({ sourcePath: p, raw: readUtf8(p) }))
  const parsed = StaysFileSchema.parse({ version: 1, cities })

  const out = path.join(generatedDir, 'stays.ts')
  const ts = tsExportConst({
    rootDir,
    sourceLabel: sourcePaths.length ? sourcePaths[0] : path.join(contentDir, 'stays.*.md'),
    imports: ["import type { CityStay } from '../data/stays'"],
    exportName: 'STAYS_DATA',
    typeName: 'CityStay[]',
    value: parsed.cities,
  })
  writeOrCheck(out, ts, check)
}

