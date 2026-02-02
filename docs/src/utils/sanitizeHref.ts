/**
 * Allowlist-based URL sanitizer for rendering external links.
 *
 * We treat authored content as "semi-trusted" (copy/paste), so we explicitly
 * disallow dangerous schemes like `javascript:` / `data:` / `file:`.
 *
 * Default policy: only allow absolute http(s) URLs.
 */
const DEFAULT_ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

function stripControlAndWhitespace(input: string) {
  // Prevent obfuscated schemes like "java\nscript:" or "java\u0000script:"
  // by removing ASCII control chars + whitespace.
  //
  // Note: implemented without a control-char regex to satisfy eslint `no-control-regex`.
  let out = ''
  for (let i = 0; i < input.length; i++) {
    const ch = input[i] ?? ''
    const code = ch.charCodeAt(0)
    if (code <= 0x1f || code === 0x7f) continue
    if (/\s/.test(ch)) continue
    out += ch
  }
  return out
}

export function sanitizeHref(rawHref: string): string | null {
  const raw = (rawHref ?? '').toString().trim()
  if (!raw) return null

  const normalized = stripControlAndWhitespace(raw)
  // Most strict default: allow only absolute http(s) URLs.
  if (!/^https?:\/\//i.test(normalized)) return null

  try {
    const u = new URL(normalized)
    if (!DEFAULT_ALLOWED_PROTOCOLS.has(u.protocol)) return null
    return u.toString()
  } catch {
    return null
  }
}

