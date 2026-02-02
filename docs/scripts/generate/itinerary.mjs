import path from 'node:path'

import { ItineraryFileSchema } from '../content-schema.mjs'
import { readUtf8 } from '../md/md.mjs'
import { parseItineraryMd } from '../md/parse-itinerary.mjs'
import { tsExportConst } from '../lib/tsgen.mjs'
import { writeOrCheck } from '../lib/io.mjs'
import { validateItinerary } from '../lib/validate.mjs'

export function generateItinerary({ rootDir, contentDir, generatedDir, check }) {
  const sourcePath = path.join(contentDir, 'itinerary.md')
  const raw = readUtf8(sourcePath)
  const phases = parseItineraryMd({ sourcePath, raw })
  const parsed = ItineraryFileSchema.parse({ version: 1, phases })
  validateItinerary(parsed.phases)

  const out = path.join(generatedDir, 'itinerary.ts')
  const ts = tsExportConst({
    rootDir,
    sourceLabel: sourcePath,
    imports: ["import type { ItineraryPhase } from '../data/itinerary'"],
    exportName: 'ITINERARY_PHASES',
    typeName: 'ItineraryPhase[]',
    value: parsed.phases,
  })
  writeOrCheck(out, ts, check)
}

