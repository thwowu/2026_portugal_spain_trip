import { useEffect, useMemo, useState } from 'react'
import { TRANSPORT_DATA } from '../generated'
import { TRANSPORT_SEGMENTS, type TransportSegmentId } from '../data/core'
import { useProgress } from '../state/progress'
import { usePlanning } from '../state/planning'
import { Lightbox } from '../components/Lightbox'
import { useHashScroll } from '../hooks/useHashScroll'
import { useReveal } from '../hooks/useReveal'
import { ILLUSTRATION } from '../illustrations'
import { PageHero } from '../components/PageHero'
import { withBaseUrl } from '../utils/asset'
import { FormattedInline, FormattedText } from '../components/FormattedText'
import { ExpandingBox } from '../components/ExpandingBox'

function Accordion({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <ExpandingBox
      title={title}
      variant="modal"
      viewLabel="看完整說明"
      modalAriaLabel={title}
      style={{ boxShadow: 'none' }}
    >
      {children}
    </ExpandingBox>
  )
}

export function TransportPage() {
  const { actions: progressActions } = useProgress()
  const { state: planning, actions: planningActions } = usePlanning()
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null)
  useHashScroll()

  const transportById = useMemo(() => {
    return new Map(TRANSPORT_DATA.map((s) => [s.id, s] as const))
  }, [])

  const orderedSegments = useMemo(() => {
    // Ensure rendering order follows the trip flow (SSOT: TRANSPORT_SEGMENTS),
    // not the auto-generated file order of TRANSPORT_DATA.
    return TRANSPORT_SEGMENTS.map((s) => transportById.get(s.id)).filter(Boolean) as typeof TRANSPORT_DATA
  }, [transportById])

  return (
    <div className="container">
      <div className="card">
        <div className="cardInner">
          <PageHero
            title="交通比較"
            subtitle={
              <>
                每段移動都有「火車 vs 巴士」比較、以及大建議（含步驟）。
              </>
            }
            image={{
              src: ILLUSTRATION.safety.src,
              fallbackSrc: ILLUSTRATION.elderly.src,
              alt: ILLUSTRATION.safety.alt,
            }}
          />

          <hr className="hr" />

          <div className="chipRow">
            {TRANSPORT_SEGMENTS.map((s) => (
              <button
                key={s.id}
                className="btn"
                onClick={() => document.getElementById(`seg-${s.id}`)?.scrollIntoView({ behavior: 'smooth' })}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div style={{ display: 'grid', gap: 14 }}>
        {orderedSegments.map((seg) => {
          const trainOptions = seg.options.filter((o) => o.mode === 'train')
          const busOptions = seg.options.filter((o) => o.mode === 'bus')
          const decision = planning.transportDecisions[seg.id] ?? { segmentId: seg.id, choice: null, reason: '' }

          return (
            <RevealSection key={seg.id} id={`seg-${seg.id}`} segmentId={seg.id} onSeen={progressActions.markTransportSeen}>
              <div className="card">
                <div className="cardInner">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 950, fontSize: 'var(--text-xl)', lineHeight: 1.15 }}>
                      {seg.label}
                    </div>
                  </div>

                  <hr className="hr" />

                  {/* TL;DR */}
                  <div className="card pulseOnce" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
                    <div className="cardInner">
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 900 }}>大建議</div>
                        <div className="chip">
                          推薦：{seg.tldr.recommended === 'train' ? '火車' : '巴士'}
                        </div>
                      </div>
                      <div className="muted" style={{ marginTop: 10 }}>
                        {renderMixedList(seg.tldr.reminders, { ordered: false })}
                      </div>
                    </div>
                  </div>

                  <div style={{ height: 12 }} />

                  {/* Decision (persisted) */}
                  <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }} data-testid={`transport-decision-${seg.id}`}>
                    <div className="cardInner">
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 900 }}>我的決定</div>
                        {decision.choice ? <div className="chip">已選：{decision.choice === 'train' ? '火車' : '巴士'}</div> : <div className="chip">未決定</div>}
                      </div>

                      <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                        <fieldset style={{ border: 0, padding: 0, margin: 0 }} aria-label={`${seg.label} 我的決定`}>
                          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <input
                                type="radio"
                                name={`transport-choice-${seg.id}`}
                                checked={decision.choice === 'train'}
                                onChange={() => planningActions.setTransportDecision(seg.id, { choice: 'train' })}
                              />
                              火車
                            </label>
                            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <input
                                type="radio"
                                name={`transport-choice-${seg.id}`}
                                checked={decision.choice === 'bus'}
                                onChange={() => planningActions.setTransportDecision(seg.id, { choice: 'bus' })}
                              />
                              巴士
                            </label>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => planningActions.setTransportDecision(seg.id, { choice: null, reason: '' })}
                              aria-label={`清除決定：${seg.label}`}
                            >
                              清除
                            </button>
                          </div>
                        </fieldset>

                        <div>
                          <div style={{ fontWeight: 850 }}>理由（給未來的自己）</div>
                          <div className="muted" style={{ marginTop: 6, fontSize: 'var(--text-sm)' }}>
                            一句話即可：為什麼選這個？有什麼注意點？
                          </div>
                          <textarea
                            value={decision.reason}
                            onChange={(e) => planningActions.setTransportDecision(seg.id, { reason: e.target.value })}
                            rows={3}
                            style={{
                              width: '100%',
                              marginTop: 8,
                              padding: 10,
                              borderRadius: 12,
                              border: '1px solid var(--hairline)',
                              background: 'var(--surface)',
                              color: 'var(--text)',
                              resize: 'vertical',
                            }}
                            placeholder="例如：巴士直達、站更近；但要提早到站排隊。"
                            aria-label={`交通決定理由：${seg.label}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ height: 12 }} />

                  {trainOptions.length > 0 ? (
                    trainOptions.map((o, idx) => (
                      <Accordion
                        key={`${seg.id}-train-${idx}-${o.title}`}
                        title={trainOptions.length === 1 ? '火車方案（Train）' : `火車方案（Train）${idx + 1}`}
                      >
                        {renderOption(o, (src, title) => setLightbox({ src, title }))}
                      </Accordion>
                    ))
                  ) : (
                    <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                      （此段目前未提供火車方案）
                    </div>
                  )}

                  <div style={{ height: 10 }} />

                  {busOptions.length > 0 ? (
                    busOptions.map((o, idx) => (
                      <Accordion
                        key={`${seg.id}-bus-${idx}-${o.title}`}
                        title={busOptions.length === 1 ? '巴士方案（Bus）' : `巴士方案（Bus）${idx + 1}`}
                      >
                        {renderOption(o, (src, title) => setLightbox({ src, title }))}
                      </Accordion>
                    ))
                  ) : (
                    <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                      （此段目前未提供巴士方案）
                    </div>
                  )}

                  <div style={{ height: 12 }} />

                  {seg.planB?.length ? (
                    <div className="card" style={{ boxShadow: 'none' }}>
                      <div className="cardInner">
                        <div style={{ fontWeight: 900 }}>Plan B（備案）</div>
                        <div className="muted" style={{ marginTop: 6 }}>
                          {renderMixedList(seg.planB, { ordered: false })}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </RevealSection>
          )
        })}
      </div>

      <Lightbox
        open={!!lightbox}
        src={lightbox?.src ?? ''}
        alt={lightbox?.title ?? '截圖'}
        title={lightbox?.title}
        onClose={() => setLightbox(null)}
      />
    </div>
  )
}

function RevealSection({
  id,
  segmentId,
  onSeen,
  children,
}: {
  id: string
  segmentId: TransportSegmentId
  onSeen: (id: TransportSegmentId) => void
  children: React.ReactNode
}) {
  const ref = useReveal<HTMLElement>()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          onSeen(segmentId)
          io.unobserve(e.target)
        }
      },
      { root: null, rootMargin: '0px 0px -30% 0px', threshold: 0.25 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [onSeen, segmentId, ref])
  return (
    <section id={id} className="reveal" ref={ref}>
      {children}
    </section>
  )
}

function renderOption(
  o: (typeof TRANSPORT_DATA)[number]['options'][number],
  onOpenImage: (src: string, title: string) => void,
) {
  const toJpg = (src: string) => (src.endsWith('.png') ? src.replace(/\.png$/i, '.jpg') : src)
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 900 }}>{o.title}</div>
      </div>
      <div className="muted">{o.summary}</div>

      <div>
        <div style={{ fontWeight: 850 }}>怎麼搭（Step-by-step）</div>
        <div className="muted" style={{ marginTop: 6 }}>
          {renderMixedList(o.steps, { ordered: true })}
        </div>
      </div>

      {o.bookingLinks.length > 0 && (
        <div>
          <div style={{ fontWeight: 850 }}>購票/查詢</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {o.bookingLinks.map((l) => (
              <div key={l.href}>
                - <a href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={{ fontWeight: 850 }}>大行李/麻煩程度</div>
        <div className="muted" style={{ marginTop: 6 }}>
          {renderMixedList(o.luggageNotes, { ordered: false })}
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 850 }}>風險提醒</div>
        <div className="muted" style={{ marginTop: 6 }}>
          {renderMixedList(o.riskNotes, { ordered: false })}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 850 }}>截圖（可點放大）</div>
          <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
            左右滑看更多
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            paddingBottom: 6,
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
          aria-label="截圖輪播（左右滑動）"
        >
          {o.screenshots.map((s) => (
            <button
              key={s.src}
              className="btn"
              style={{
                flex: '0 0 min(260px, 78%)',
                scrollSnapAlign: 'start',
                borderRadius: 14,
                padding: 0,
                overflow: 'hidden',
                textAlign: 'left',
                background: 'var(--surface)',
              }}
              onClick={() => onOpenImage(withBaseUrl(toJpg(s.src)), s.label)}
              title="點擊放大"
              aria-label={`查看大圖：${s.label}`}
            >
              <picture>
                <source srcSet={withBaseUrl(toJpg(s.src))} type="image/jpeg" />
                <img
                  src={withBaseUrl(s.src)}
                  alt={s.label}
                  style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
              <div style={{ padding: 10 }}>
                <div style={{ fontWeight: 750, fontSize: 'var(--text-sm)', lineHeight: 1.25 }}>{s.label}</div>
                <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  點擊放大
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function isMiniHeading(line: string) {
  const t = (line ?? '').trim()
  return /^#{3,4}\s*\S/.test(t)
}

function normalizeMiniHeading(line: string) {
  // We treat "###" / "####" lines as mini headings.
  // Our FormattedText supports "##/###" headings; normalize #### → ###.
  const t = (line ?? '').trim()
  const m = /^#{3,4}\s*(.+)$/.exec(t)
  if (!m) return null
  const title = (m[1] ?? '').trim()
  if (!title) return null
  return `### ${title}`
}

function renderMixedList(items: string[], { ordered }: { ordered: boolean }) {
  const rows = (items ?? []).map((x) => x ?? '').map((x) => x.trim()).filter(Boolean)
  if (rows.length === 0) return null

  const blocks: Array<
    | { kind: 'h'; text: string }
    | { kind: 'list'; ordered: boolean; start: number; items: string[] }
  > = []

  let buf: string[] = []
  let listIndex = 1
  const flush = () => {
    if (buf.length === 0) return
    blocks.push({ kind: 'list', ordered, start: listIndex, items: buf })
    if (ordered) listIndex += buf.length
    buf = []
  }

  for (const r of rows) {
    const h = isMiniHeading(r) ? normalizeMiniHeading(r) : null
    if (h) {
      flush()
      blocks.push({ kind: 'h', text: h })
      continue
    }
    buf.push(r)
  }
  flush()

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {blocks.map((b, idx) => {
        if (b.kind === 'h') {
          return <FormattedText key={`h-${idx}-${b.text}`} text={b.text} className="prose" />
        }
        if (b.ordered) {
          return (
            <ol
              key={`ol-${idx}-${b.items[0] ?? ''}`}
              className="treeList treeListOrdered"
              start={b.start}
            >
              {b.items.map((s) => (
                <li key={s} style={{ marginTop: 6 }}>
                  <FormattedInline text={s} />
                </li>
              ))}
            </ol>
          )
        }
        return (
          <ul key={`ul-${idx}-${b.items[0] ?? ''}`} style={{ margin: 0, paddingLeft: 18 }}>
            {b.items.map((s) => (
              <li key={s} style={{ marginTop: 6 }}>
                <FormattedInline text={s} />
              </li>
            ))}
          </ul>
        )
      })}
    </div>
  )
}

