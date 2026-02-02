import { describe, expect, it } from 'vitest'
import { sanitizeHref } from '../../src/utils/sanitizeHref'

describe('sanitizeHref', () => {
  it('allows absolute http(s) URLs', () => {
    expect(sanitizeHref('https://example.com/x')).toBe('https://example.com/x')
    expect(sanitizeHref('http://example.com/x')).toBe('http://example.com/x')
  })

  it('rejects non-http(s) schemes and obfuscated schemes', () => {
    expect(sanitizeHref('javascript:alert(1)')).toBeNull()
    expect(sanitizeHref('data:text/html,<h1>x</h1>')).toBeNull()
    expect(sanitizeHref('file:///etc/passwd')).toBeNull()
    expect(sanitizeHref('java\nscript:alert(1)')).toBeNull()
    expect(sanitizeHref('java\u0000script:alert(1)')).toBeNull()
  })
})

