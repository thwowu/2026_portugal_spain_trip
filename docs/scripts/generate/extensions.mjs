import path from 'node:path'

import { ExtensionsFileSchema } from '../content-schema.mjs'
import { readUtf8 } from '../md/md.mjs'
import { parseExtensionsCityMd } from '../md/parse-extensions.mjs'
import { tsExportConst } from '../lib/tsgen.mjs'
import { listMarkdownFiles, writeOrCheck } from '../lib/io.mjs'

export function generateExtensions({ rootDir, contentDir, generatedDir, check }) {
  const sourcePaths = listMarkdownFiles(contentDir).filter(
    (p) => path.basename(p).startsWith('extensions.') && !p.endsWith('.legacy.md'),
  )
  const cities = sourcePaths.map((p) => parseExtensionsCityMd({ sourcePath: p, raw: readUtf8(p) }))
  const parsed = ExtensionsFileSchema.parse({ version: 1, cities })

  const out = path.join(generatedDir, 'extensions.ts')
  const ts = tsExportConst({
    rootDir,
    sourceLabel: sourcePaths.length ? sourcePaths[0] : path.join(contentDir, 'extensions.*.md'),
    imports: ["import type { CityExtensions } from '../data/extensions'"],
    exportName: 'EXTENSIONS_DATA',
    typeName: 'CityExtensions[]',
    value: parsed.cities,
  })
  writeOrCheck(out, ts, check)
}

