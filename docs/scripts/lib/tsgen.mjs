import path from 'node:path'

export function tsHeader({ rootDir, sourceLabel }) {
  const rel = path.relative(rootDir, sourceLabel)
  return [
    '/**',
    ' * AUTO-GENERATED FILE. DO NOT EDIT.',
    ` * Source: ${rel}`,
    ' */',
    '',
  ].join('\n')
}

export function tsExportConst({ rootDir, sourceLabel, imports, exportName, typeName, value }) {
  const header = tsHeader({ rootDir, sourceLabel })
  const importLines = imports.length ? imports.join('\n') + '\n\n' : ''
  const json = JSON.stringify(value, null, 2)
  return header + importLines + `export const ${exportName}: ${typeName} = ${json}\n`
}

