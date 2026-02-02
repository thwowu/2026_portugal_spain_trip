import { useMemo, useState } from 'react'
import { TRANSPORT_DATA } from '../data/transport'
import { TRANSPORT_SEGMENTS, type TransportSegmentId } from '../data/core'
import { useReveal } from '../hooks/useReveal'
import { Lightbox } from '../components/Lightbox'
import { useHashScroll } from '../hooks/useHashScroll'
import { ILLUSTRATION } from '../illustrations'
import { PageHero } from '../components/PageHero'
import { withBaseUrl } from '../utils/asset'
import { FormattedInline, FormattedText } from '../components/FormattedText'
import { ExpandingBox } from '../components/ExpandingBox'
import { titleZhOnly } from '../utils/titleZhOnly'

function mapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

const TRANSPORT_MAP_POINTS: Record<TransportSegmentId, Array<{ label: string; query: string }>> = {
  'lisbon-lagos': [
    { label: 'Lisboa Oriente（Oriente）', query: 'Gare do Oriente Lisbon' },
    { label: 'Lisboa Sete Rios（Sete Rios）', query: 'Lisboa Sete Rios bus station' },
    { label: 'Tunes（轉乘）', query: 'Tunes train station' },
    { label: 'Lagos bus terminal', query: 'Terminal Rodoviário de Lagos' },
    { label: 'Lagos train station', query: 'Estação de Lagos' },
  ],
  'lagos-seville': [
    { label: 'Lagos bus terminal', query: 'Terminal Rodoviário de Lagos' },
    { label: 'Sevilla Plaza de Armas', query: 'Estación de Autobuses Plaza de Armas Seville' },
    { label: 'Sevilla Prado', query: 'Estación de Autobuses Prado de San Sebastián Seville' },
    { label: 'Sevilla Santa Justa', query: 'Sevilla-Santa Justa station' },
    { label: 'Faro（轉乘備案）', query: 'Faro station' },
  ],
  'seville-granada': [
    { label: 'Sevilla Santa Justa', query: 'Sevilla-Santa Justa station' },
    { label: 'Sevilla Plaza de Armas', query: 'Estación de Autobuses Plaza de Armas Seville' },
    { label: 'Granada station', query: 'Granada railway station' },
  ],
  'granada-madrid': [
    { label: 'Granada station', query: 'Granada railway station' },
    { label: 'Madrid Estación Sur（巴士）', query: 'Estación Sur Madrid' },
    { label: 'Avenida de América（巴士）', query: 'Avenida de América Intercambiador Madrid' },
    { label: 'Madrid Airport T4（巴士）', query: 'Madrid Barajas Airport Terminal 4' },
    { label: 'Madrid Puerta de Atocha（火車）', query: 'Madrid Puerta de Atocha station' },
    { label: 'Madrid Chamartín（火車）', query: 'Madrid Chamartín station' },
  ],
}

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
      <h1 className="srOnly">交通（Transport）</h1>
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
                {titleZhOnly(s.label)}
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
          const mapPoints = TRANSPORT_MAP_POINTS[seg.id] ?? []

          return (
            <RevealSection key={seg.id} id={`seg-${seg.id}`}>
              <div className="card">
                <div className="cardInner">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 950, fontSize: 'var(--text-xl)', lineHeight: 1.15 }}>
                      {titleZhOnly(seg.label)}
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

                  {mapPoints.length > 0 ? (
                    <>
                      <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
                        <div className="cardInner">
                          <div style={{ fontWeight: 900 }}>車站/上下車點（Google Maps）</div>
                          <div className="muted" style={{ marginTop: 8 }}>
                            {mapPoints.map((p) => (
                              <div key={`${seg.id}-${p.label}`}>
                                - <FormattedInline text={`[${titleZhOnly(p.label)}](${mapsSearchUrl(p.query)})`} />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div style={{ height: 12 }} />
                    </>
                  ) : null}

                  {trainOptions.length > 0 ? (
                    trainOptions.map((o, idx) => (
                      <Accordion
                        key={`${seg.id}-train-${idx}-${o.title}`}
                        title={trainOptions.length === 1 ? '火車方案' : `火車方案 ${idx + 1}`}
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
                        title={busOptions.length === 1 ? '巴士方案' : `巴士方案 ${idx + 1}`}
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
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  const ref = useReveal<HTMLElement>()
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
        <div style={{ fontWeight: 900 }}>{titleZhOnly(o.title)}</div>
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
                - <FormattedInline text={`[${l.label}](${l.href})`} />
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

