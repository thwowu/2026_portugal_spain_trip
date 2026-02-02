export const ONLY_KINDS = ['itinerary', 'transport', 'stays', 'attractions', 'extensions']

export function parseArgs(argv) {
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

