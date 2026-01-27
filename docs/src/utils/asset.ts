/**
 * Resolve URLs for assets stored under `docs/public/*` on GitHub Pages.
 *
 * On GitHub Pages project sites, the app is served under `/<repo>/`,
 * so absolute paths like `/images/foo.png` would 404.
 *
 * This helper prefixes such paths with `import.meta.env.BASE_URL`.
 */
export function withBaseUrl(src: string): string {
  if (!src) return src

  // Leave fully-qualified and special URLs untouched.
  if (
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('data:') ||
    src.startsWith('blob:')
  ) {
    return src
  }

  // If it's already prefixed, keep it idempotent.
  const base = import.meta.env.BASE_URL || '/'
  if (src.startsWith(base)) return src

  // Prefix absolute public paths with the base.
  if (src.startsWith('/')) return `${base}${src.slice(1)}`

  // Relative paths are assumed to already be correct.
  return src
}

