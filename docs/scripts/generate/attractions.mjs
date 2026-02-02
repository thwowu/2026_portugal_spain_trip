import path from 'node:path'

import { AttractionsFileSchema } from '../content-schema.mjs'
import { readUtf8 } from '../md/md.mjs'
import { parseAttractionsCityMd } from '../md/parse-attractions.mjs'
import { tsExportConst } from '../lib/tsgen.mjs'
import { listMarkdownFiles, writeOrCheck } from '../lib/io.mjs'

export function generateAttractions({ rootDir, contentDir, generatedDir, check }) {
  const sourcePaths = listMarkdownFiles(contentDir).filter(
    (p) => path.basename(p).startsWith('attractions.') && !p.endsWith('.legacy.md'),
  )
  const cities = sourcePaths.map((p) => parseAttractionsCityMd({ sourcePath: p, raw: readUtf8(p) }))
  const parsed = AttractionsFileSchema.parse({ version: 1, cities })

  const out = path.join(generatedDir, 'attractions.ts')
  const ts = tsExportConst({
    rootDir,
    sourceLabel: sourcePaths.length ? sourcePaths[0] : path.join(contentDir, 'attractions.*.md'),
    imports: ["import type { CityAttractions } from '../data/attractions'"],
    exportName: 'ATTRACTIONS_DATA',
    typeName: 'CityAttractions[]',
    value: parsed.cities,
  })
  writeOrCheck(out, ts, check)
}

