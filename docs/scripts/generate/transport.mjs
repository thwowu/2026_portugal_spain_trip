import path from 'node:path'

import { TransportFileSchema } from '../content-schema.mjs'
import { readUtf8 } from '../md/md.mjs'
import { parseTransportSegmentMd } from '../md/parse-transport.mjs'
import { tsExportConst } from '../lib/tsgen.mjs'
import { listMarkdownFiles, writeOrCheck } from '../lib/io.mjs'

export function generateTransport({ rootDir, contentDir, generatedDir, check }) {
  const sourcePaths = listMarkdownFiles(contentDir).filter(
    (p) => path.basename(p).startsWith('transport.') && !p.endsWith('.legacy.md'),
  )
  const segments = sourcePaths.map((p) => parseTransportSegmentMd({ sourcePath: p, raw: readUtf8(p) }))
  const parsed = TransportFileSchema.parse({ version: 1, segments })

  const out = path.join(generatedDir, 'transport.ts')
  const ts = tsExportConst({
    rootDir,
    sourceLabel: sourcePaths.length ? sourcePaths[0] : path.join(contentDir, 'transport.*.md'),
    imports: ["import type { TransportSegment } from '../data/transport'"],
    exportName: 'TRANSPORT_DATA',
    typeName: 'TransportSegment[]',
    value: parsed.segments,
  })
  writeOrCheck(out, ts, check)
}

