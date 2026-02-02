import { useMemo } from 'react'
import type { GalleryImage } from './GalleryLightbox'
import { FormattedInline, FormattedText } from './FormattedText'
import { TextCarouselCard } from './TextCarouselCard'
import { withBaseUrl } from '../utils/asset'
import { prefersReducedMotion } from '../utils/motion'
import { extractH3CarouselItems } from '../utils/extractCarouselItems'
import { parseRichBlocks, type RichBlock, type RichUlItem } from '../markdownLite/richContent'

export function RichContent({
  content,
  className = 'prose',
  showToc = false,
  onOpenImage,
  onOpenGallery,
}: {
  content: string
  className?: string
  showToc?: boolean
  onOpenImage?: (src: string, title: string) => void
  onOpenGallery?: (images: GalleryImage[], title: string) => void
}) {
  const blocks = useMemo(() => parseRichBlocks(content, { resolveUrl: withBaseUrl }), [content])
  const headings = useMemo(
    () => blocks.filter((b) => b.kind === 'h') as Array<Extract<RichBlock, { kind: 'h' }>>,
    [blocks],
  )
  const topicIndexItems = useMemo(() => {
    if (!showToc) return []

    const items = extractH3CarouselItems(content, { snippetMaxLen: 120 })
    if (items.length < 3) return []

    // Map each H3 slice to the corresponding rendered heading id (handles duplicates by order).
    const h3Headings = headings.filter((h) => h.level === 3)
    const out: Array<{ title: string; summary: string; id: string }> = []
    let cursor = 0

    for (const it of items) {
      let found: (typeof h3Headings)[number] | null = null
      for (let i = cursor; i < h3Headings.length; i++) {
        const h = h3Headings[i]!
        if (h.text === it.title) {
          found = h
          cursor = i + 1
          break
        }
      }
      if (!found) continue
      out.push({ title: it.title, summary: it.summary, id: found.id })
    }

    return out
  }, [content, headings, showToc])

  const isKeyTakeawaysHeading = (t: string) => {
    const s = (t ?? '').trim().toLowerCase()
    return (
      s === 'key takeaways' ||
      s.includes('key takeaways') ||
      s.includes('重點') ||
      s.includes('摘要') ||
      s.includes('先看這裡')
    )
  }

  const renderUl = (items: RichUlItem[], keyPrefix: string, depth = 0) => {
    const ulStyle: React.CSSProperties =
      depth === 0
        ? { margin: 0, paddingLeft: 18 }
        : { margin: '6px 0 0 0', paddingLeft: 18 }

    return (
      <ul style={ulStyle}>
        {items.map((it, i) => {
          const key = `${keyPrefix}-${depth}-${i}-${it.text}`
          return (
            <li key={key} style={{ marginTop: i === 0 ? 0 : 6 }}>
              <FormattedInline text={it.text} />
              {it.children.length > 0 ? renderUl(it.children, key, depth + 1) : null}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className={className}>
      {showToc && topicIndexItems.length >= 3 ? (
        <div className="not-prose longformWide" aria-label="主題索引" style={{ marginBottom: 12 }}>
          <TextCarouselCard
            title="主題索引"
            subtitle="點「詳情…」可直接跳到該段落。"
            items={topicIndexItems.map((it) => ({
              title: it.title,
              summary: it.summary,
              onOpen: () => {
                const el = document.getElementById(it.id)
                el?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
              },
            }))}
          />
        </div>
      ) : null}
      {showToc && headings.length >= 2 ? (
        <nav className="not-prose longformWide" aria-label="目錄" style={{ marginBottom: 12 }}>
          <details className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }} open={false}>
            <summary className="cardInner" style={{ cursor: 'pointer', fontWeight: 900 }}>
              目錄（點開）
            </summary>
            <div className="cardInner" style={{ paddingTop: 0 }}>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {headings.map((h) => (
                  <li key={h.id} style={{ marginTop: 6 }}>
                    <button
                      type="button"
                      className="btn"
                      style={{ minHeight: 34, padding: '8px 12px', fontSize: 'var(--text-sm)' }}
                      onClick={() => {
                        const el = document.getElementById(h.id)
                        el?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
                      }}
                      aria-label={`跳到：${h.text}`}
                    >
                      {h.text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </nav>
      ) : null}
      {(() => {
        const out: React.ReactNode[] = []
        let headingCount = 0
        let paragraphCount = 0
        for (let idx = 0; idx < blocks.length; idx++) {
          const b = blocks[idx]!

          // Summary/Key takeaways: render as a distinct callout card when followed by a UL.
          if (b.kind === 'h' && isKeyTakeawaysHeading(b.text)) {
            const next = blocks[idx + 1]
            if (next?.kind === 'ul') {
              out.push(
                <section
                  key={`takeaways-${b.id}`}
                  className="not-prose longformWide card"
                  style={{ boxShadow: 'none', background: 'var(--surface-2)' }}
                  aria-label={b.text}
                >
                  <div className="cardInner">
                    <div style={{ fontWeight: 950, fontSize: 'var(--text-lg)', lineHeight: 1.15 }}>{b.text}</div>
                    <div style={{ marginTop: 10 }}>{renderUl(next.items, `takeaways-ul-${idx}`)}</div>
                  </div>
                </section>,
              )
              idx += 1
              continue
            }
          }

        if (b.kind === 'h') {
          const isFirstHeading = headingCount === 0
          headingCount += 1
          const Tag = b.level === 4 ? 'h4' : 'h3'
          const isSectionHeading = b.level === 3
          out.push(
            <Tag
              key={idx}
              id={b.id}
              className={`longformHeading ${isSectionHeading ? 'longformWide rcSectionHeading' : 'rcSubHeading'}`}
              data-rc-first={isFirstHeading ? '1' : undefined}
              style={{
                margin: idx === 0 ? 0 : 'var(--rc-heading-gap, 14px) 0 0 0',
                fontWeight: 950,
                lineHeight: 1.18,
              }}
            >
              <FormattedInline text={b.text} />
            </Tag>
          )
          continue
        }

        if (b.kind === 'image') {
          out.push(
            <button
              key={idx}
              type="button"
              className="inlineImageCard longformWide not-prose"
              onClick={() => onOpenImage?.(b.src, b.alt)}
              title="點擊放大"
              aria-label={`查看大圖：${b.alt}`}
              style={{ marginTop: idx === 0 ? 0 : 'var(--rc-block-gap, 10px)' }}
            >
              <img src={b.src} alt={b.alt} loading="lazy" />
              <div className="inlineImageCaption">{b.alt}</div>
            </button>
          )
          continue
        }

        if (b.kind === 'quote') {
          out.push(
            <blockquote
              key={idx}
              className="rcQuote"
              style={{ margin: idx === 0 ? 0 : 'var(--rc-block-gap, 10px) 0 0 0' }}
            >
              <FormattedText text={b.text} className={className} />
            </blockquote>
          )
          continue
        }

        if (b.kind === 'ul') {
          out.push(
            <div key={idx} style={{ marginTop: idx === 0 ? 0 : 'var(--rc-block-gap, 10px)' }}>
              {renderUl(b.items, `ul-${idx}`)}
            </div>,
          )
          continue
        }

        if (b.kind === 'ol') {
          out.push(
            <ol
              key={idx}
              style={{
                margin: idx === 0 ? 0 : 'var(--rc-block-gap, 10px) 0 0 0',
                paddingLeft: 22,
              }}
            >
              {b.items.map((it, i) => (
                <li key={`${idx}-${i}-${it}`} style={{ marginTop: i === 0 ? 0 : 6 }}>
                  <FormattedInline text={it} />
                </li>
              ))}
            </ol>,
          )
          continue
        }

        const hasText = b.text.trim().length > 0
        const shouldDropCap = hasText && paragraphCount === 0
        if (hasText) paragraphCount += 1
        out.push(
          <div key={idx} style={{ marginTop: idx === 0 ? 0 : 'var(--rc-block-gap, 10px)' }}>
            {hasText ? (
              <p className={`rcParagraph ${shouldDropCap ? 'rcDropcap' : ''}`} style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                <FormattedInline text={b.text} />
              </p>
            ) : null}

            {b.galleries.length > 0 ? (
              <div
                className="not-prose"
                style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: hasText ? 10 : 0 }}
              >
                {b.galleries.map((g, i) => {
                  const title = g.title || '圖庫'
                  return (
                    <button
                      key={`${idx}-g-${i}-${title}`}
                      type="button"
                      className="btn"
                      style={{ minHeight: 34, padding: '8px 12px' }}
                      onClick={() => onOpenGallery?.(g.images as unknown as GalleryImage[], title)}
                      aria-label={`開啟圖庫：${title}`}
                      title="點擊開啟圖庫"
                    >
                      {title === '圖庫' ? '圖庫' : `圖庫：${title}`}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
        )
        }
        return out
      })()}
    </div>
  )
}

