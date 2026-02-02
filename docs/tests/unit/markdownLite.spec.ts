import { describe, expect, it } from 'vitest'
import { parseBasicBlocks } from '../../src/markdownLite/blocks'
import { inlineToPlainText, tokenizeInline } from '../../src/markdownLite/inline'
import { splitTrailingUrlPunct } from '../../src/markdownLite/utils'
import { parseRichBlocks } from '../../src/markdownLite/richContent'

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

    it('parses {{bi:zh|en}} tokens', () => {
      expect(tokenizeInline('A{{bi:中文|English}}B')).toEqual([
        { kind: 'text', value: 'A' },
        { kind: 'bilingual', zh: '中文', en: 'English' },
        { kind: 'text', value: 'B' },
      ])
    })

    it('parses {{bilink:zh|en|href}} tokens', () => {
      expect(tokenizeInline('A{{bilink:中文|English|https://example.com}}B')).toEqual([
        { kind: 'text', value: 'A' },
        { kind: 'bilingual_link', zh: '中文', en: 'English', href: 'https://example.com' },
        { kind: 'text', value: 'B' },
      ])
    })

    it('does not parse {{bilink:...}} when href is not http(s)', () => {
      expect(tokenizeInline('A{{bilink:中文|English|javascript:alert(1)}}B')).toEqual([
        { kind: 'text', value: 'A{{bilink:中文|English|javascript:alert(1)}}B' },
      ])
      expect(tokenizeInline('A{{bilink:中文|English|file:///etc/passwd}}B')).toEqual([
        { kind: 'text', value: 'A{{bilink:中文|English|file:///etc/passwd}}B' },
      ])
    })

    it('does not parse bi/bilink tokens inside inline code', () => {
      expect(tokenizeInline('hello `{{bi:中文|English}}` world')).toEqual([
        { kind: 'text', value: 'hello ' },
        { kind: 'code', value: '{{bi:中文|English}}' },
        { kind: 'text', value: ' world' },
      ])
      expect(tokenizeInline('hello `{{bilink:中文|English|https://example.com}}` world')).toEqual([
        { kind: 'text', value: 'hello ' },
        { kind: 'code', value: '{{bilink:中文|English|https://example.com}}' },
        { kind: 'text', value: ' world' },
      ])
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

  describe('inlineToPlainText', () => {
    it('strips markdown punctuation for bold/code', () => {
      expect(inlineToPlainText('**Bold** and `Code`')).toBe('Bold and Code')
    })

    it('uses link label (or href) and normalizes whitespace', () => {
      expect(inlineToPlainText('Go  to  [X](https://example.com)\nnow')).toBe('Go to X now')
    })

    it('keeps bare URLs as text', () => {
      expect(inlineToPlainText('see https://example.com，')).toBe('see https://example.com，')
    })

    it('handles mixed tokens', () => {
      expect(inlineToPlainText('::重點:: **bold** *it*')).toBe('重點 bold it')
    })
  })

  describe('parseRichBlocks', () => {
    it('extracts gallery tokens and removes them from text', () => {
      const blocks = parseRichBlocks('Intro {{gallery:相簿|/a.png|https://b.com/c.jpg}} end', {
        resolveUrl: (s) => `RESOLVED:${s}`,
      })
      expect(blocks[0]?.kind).toBe('p')
      if (blocks[0]?.kind !== 'p') return
      expect(blocks[0].galleries.length).toBe(1)
      expect(blocks[0].galleries[0]?.title).toBe('相簿')
      expect(blocks[0].galleries[0]?.images.map((x) => x.src)).toEqual([
        'RESOLVED:/a.png',
        'RESOLVED:https://b.com/c.jpg',
      ])
      expect(blocks[0].text).not.toContain('gallery')
    })

    it('treats markdown image links to image URLs as image blocks', () => {
      const blocks = parseRichBlocks('[Cover](https://example.com/a.png)', {
        resolveUrl: (s) => `R:${s}`,
      })
      expect(blocks).toEqual([{ kind: 'image', alt: 'Cover', src: 'R:https://example.com/a.png' }])
    })
  })
})

