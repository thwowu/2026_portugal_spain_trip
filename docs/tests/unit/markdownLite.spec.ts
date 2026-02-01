import { describe, expect, it } from 'vitest'
import { parseBasicBlocks } from '../../src/markdownLite/blocks'
import { tokenizeInline } from '../../src/markdownLite/inline'
import { splitTrailingUrlPunct } from '../../src/markdownLite/utils'

describe('markdownLite', () => {
  describe('splitTrailingUrlPunct', () => {
    it('splits common trailing punctuation', () => {
      expect(splitTrailingUrlPunct('https://a.com).')).toEqual({ url: 'https://a.com', punct: ').' })
      expect(splitTrailingUrlPunct('https://a.com，')).toEqual({ url: 'https://a.com', punct: '，' })
      expect(splitTrailingUrlPunct('https://a.com')).toEqual({ url: 'https://a.com', punct: '' })
    })
  })

  describe('tokenizeInline', () => {
    it('does not parse markdown inside inline code', () => {
      expect(tokenizeInline('hello `a **b**` world')).toEqual([
        { kind: 'text', value: 'hello ' },
        { kind: 'code', value: 'a **b**' },
        { kind: 'text', value: ' world' },
      ])
    })

    it('parses markdown links', () => {
      expect(tokenizeInline('[X](https://example.com)')).toEqual([{ kind: 'link', label: 'X', href: 'https://example.com' }])
    })

    it('auto-links bare URLs and preserves trailing punctuation', () => {
      expect(tokenizeInline('see https://example.com，')).toEqual([
        { kind: 'text', value: 'see ' },
        { kind: 'url', href: 'https://example.com' },
        { kind: 'text', value: '，' },
      ])
    })

    it('parses mark/bold/italic tokens', () => {
      expect(tokenizeInline('::重點:: **bold** *it*')).toEqual([
        { kind: 'mark', value: '重點' },
        { kind: 'text', value: ' ' },
        { kind: 'bold', value: 'bold' },
        { kind: 'text', value: ' ' },
        { kind: 'italic', value: 'it' },
      ])
    })
  })

  describe('parseBasicBlocks', () => {
    it('supports heading-first-line without blank lines', () => {
      expect(parseBasicBlocks('### T\nline2')).toEqual([
        { kind: 'h', level: 3, text: 'T' },
        { kind: 'p', text: 'line2' },
      ])
    })

    it('parses block quotes', () => {
      expect(parseBasicBlocks('> a\n> b')).toEqual([{ kind: 'quote', text: 'a\nb' }])
    })

    it('parses checklists', () => {
      expect(parseBasicBlocks('- [x] ok\n- [ ] todo')).toEqual([
        {
          kind: 'checklist',
          items: [
            { checked: true, text: 'ok' },
            { checked: false, text: 'todo' },
          ],
        },
      ])
    })
  })
})

