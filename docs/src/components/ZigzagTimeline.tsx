import { FormattedInline } from './FormattedText'
import { RichContent } from './RichContent'

export type ZigzagTimelineItem = {
  title: string
  summary?: string
  content: string
  onOpen?: () => void
}

export function ZigzagTimeline({
  title,
  subtitle,
  items,
  testId,
}: {
  title?: string
  subtitle?: string
  items: ZigzagTimelineItem[]
  testId?: string
}) {
  if (items.length === 0) return null
  return (
    <section className="zigzagTimeline" data-testid={testId}>
      {title ? <div className="zigzagTimelineTitle">{title}</div> : null}
      {subtitle ? <div className="muted zigzagTimelineSubtitle">{subtitle}</div> : null}
      <div className="zigzagTimelineList" aria-label={title ?? '路線'}>
        {items.map((it, idx) => (
          <div key={`${it.title}-${idx}`} className="zigzagTimelineItem">
            <div className="zigzagTimelineMilestone" aria-hidden="true">
              {idx + 1}
            </div>
            <div className="zigzagTimelineCard card" style={{ boxShadow: 'none' }}>
              <div className="cardInner">
                <div className="zigzagTimelineItemTitle">
                  <FormattedInline text={it.title} />
                </div>
                {it.summary ? <div className="muted zigzagTimelineItemSummary">{it.summary}</div> : null}
                {!it.onOpen ? (
                  <div className="zigzagTimelineItemBody">
                    <RichContent content={it.content} className="attrProse" />
                  </div>
                ) : null}
                {it.onOpen ? (
                  <div className="zigzagTimelineItemActions">
                    <button type="button" className="btn btnPrimary" onClick={it.onOpen} aria-label={`詳情：${it.title}`}>
                      詳情…
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

