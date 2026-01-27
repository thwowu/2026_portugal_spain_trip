import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { type TransportRatings } from '../data/transport'
import { TRANSPORT_DATA } from '../generated'
import { TRANSPORT_SEGMENTS } from '../data/core'
import { usePlanning } from '../state/planning'
import { Lightbox } from '../components/Lightbox'
import { TransportMapWidget } from '../components/TransportMapWidget'
import { useHashScroll } from '../hooks/useHashScroll'
import { useReveal } from '../hooks/useReveal'
import { ILLUSTRATION } from '../illustrations'
import { PageHero } from '../components/PageHero'

function score(r: TransportRatings, w: Record<string, number>) {
  // ratings are 1..5, normalize to 0..1 and weight
  const keys = Object.keys(r) as Array<keyof TransportRatings>
  const totalW = keys.reduce((a, k) => a + (w[k as string] ?? 0), 0) || 1
  const s = keys.reduce((acc, k) => {
    const wk = w[k as string] ?? 0
    const rk = Math.min(5, Math.max(1, r[k]))
    return acc + wk * ((rk - 1) / 4)
  }, 0)
  return s / totalW
}

function fmtPct(x: number) {
  return `${Math.round(x * 100)}`
}

function Accordion({
  title,
  children,
  defaultOpen,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details open={defaultOpen} className="card" style={{ boxShadow: 'none' }}>
      <summary
        style={{
          listStyle: 'none',
          cursor: 'pointer',
          padding: 14,
          fontWeight: 850,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <span>{title}</span>
        <span className="muted" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="cardInner" style={{ paddingTop: 0 }}>
        {children}
      </div>
    </details>
  )
}

export function TransportPage() {
  const { state, actions } = usePlanning()
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null)
  useHashScroll()

  const weights = useMemo(
    () => ({
      simplicity: state.transportWeights.simplicity,
      luggage: state.transportWeights.luggage,
      risk: state.transportWeights.risk,
      comfort: state.transportWeights.comfort,
      cost: state.transportWeights.cost,
      flexibility: state.transportWeights.flexibility,
    }),
    [state.transportWeights],
  )

  return (
    <div className="container">
      <div className="card">
        <div className="cardInner">
          <PageHero
            title="交通比較"
            subtitle={
              <>
                每段移動都有「火車 vs 巴士」比較、加權評分、以及大建議。權重可在 <Link to="/dashboard">Dashboard</Link>{' '}
                調整。
              </>
            }
            image={{
              src: ILLUSTRATION.heroTransport.src,
              fallbackSrc: ILLUSTRATION.map.src,
              alt: ILLUSTRATION.heroTransport.alt,
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
        {TRANSPORT_DATA.map((seg) => {
          const decision = state.transportDecisions[seg.id]
          const optionScores = seg.options.map((o) => ({
            mode: o.mode,
            score: score(o.ratings, weights),
          }))
          const best = optionScores.sort((a, b) => b.score - a.score)[0]

          return (
            <RevealSection key={seg.id} id={`seg-${seg.id}`}>
              <div className="card">
                <div className="cardInner">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 950, fontSize: 'var(--text-xl)', lineHeight: 1.15 }}>
                      {seg.label}
                    </div>
                    <div className="chip">
                      目前狀態：{decision?.status ? (decision.status === 'candidate' ? '候選' : decision.status === 'decided' ? '已決定' : '放棄') : '—'}
                    </div>
                  </div>

                  <div style={{ marginTop: 10 }} className="muted">
                    Dashboard 一句話原因：{decision?.reason || '（尚未填）'}
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
                        <div className="chip">
                          依你目前權重最佳：{best.mode === 'train' ? '火車' : '巴士'}（{fmtPct(best.score)} 分）
                        </div>
                      </div>
                      <div style={{ marginTop: 8 }}>{seg.tldr.because}</div>
                      <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                        {seg.tldr.reminders.map((r) => (
                          <div key={r} className="muted">
                            - {r}
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          className="btn btnPrimary"
                          onClick={() =>
                            actions.setTransportDecision(seg.id, {
                              status: 'decided',
                              chosenMode: seg.tldr.recommended,
                            })
                          }
                        >
                          直接採用建議
                        </button>
                        <button
                          className="btn"
                          onClick={() =>
                            actions.setTransportDecision(seg.id, {
                              status: 'candidate',
                            })
                          }
                        >
                          先保留候選
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ height: 12 }} />

                  {/* Map widget placeholder (to be replaced by TransportMapWidget) */}
                  <TransportMapWidget segmentId={seg.id} />

                  <div style={{ height: 12 }} />

                  <Accordion title="火車方案（Train）" defaultOpen={seg.tldr.recommended === 'train'}>
                    {renderOption(
                      seg.options.find((o) => o.mode === 'train')!,
                      weights,
                      (src, title) => setLightbox({ src, title }),
                    )}
                  </Accordion>

                  <div style={{ height: 10 }} />

                  <Accordion title="巴士方案（Bus）" defaultOpen={seg.tldr.recommended === 'bus'}>
                    {renderOption(
                      seg.options.find((o) => o.mode === 'bus')!,
                      weights,
                      (src, title) => setLightbox({ src, title }),
                    )}
                  </Accordion>

                  <div style={{ height: 12 }} />

                  {/* Comparison matrix */}
                  <div className="card" style={{ boxShadow: 'none' }}>
                    <div className="cardInner">
                      <div style={{ fontWeight: 900 }}>比較與綜合分析</div>
                      <div className="muted" style={{ marginTop: 6 }}>
                        分數 1–5（越高越好），右側是依你權重換算的加權分數。
                      </div>
                      <hr className="hr" />

                      <div style={{ display: 'grid', gap: 10 }}>
                        {seg.options.map((o) => {
                          const s = score(o.ratings, weights)
                          return (
                            <div key={o.mode} className="card" style={{ boxShadow: 'none', borderStyle: 'dashed' }}>
                              <div className="cardInner">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                  <div style={{ fontWeight: 900 }}>
                                    {o.mode === 'train' ? '火車' : '巴士'}
                                  </div>
                                  <div className="chip">加權：{fmtPct(s)} 分</div>
                                </div>
                                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                                  {Object.entries(o.ratings).map(([k, v]) => (
                                    <div key={k} className="chip">
                                      {k}: {v}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontWeight: 900 }}>Plan B（備案）</div>
                        <div className="muted" style={{ marginTop: 6 }}>
                          {seg.planB.map((b) => (
                            <div key={b}>- {b}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
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

function RevealSection({ id, children }: { id: string; children: React.ReactNode }) {
  const ref = useReveal<HTMLElement>()
  return (
    <section id={id} className="reveal" ref={ref}>
      {children}
    </section>
  )
}

function renderOption(
  o: (typeof TRANSPORT_DATA)[number]['options'][number],
  weights: Record<string, number>,
  onOpenImage: (src: string, title: string) => void,
) {
  const s = score(o.ratings, weights)
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 900 }}>{o.title}</div>
        <div className="chip">加權：{fmtPct(s)} 分</div>
      </div>
      <div className="muted">{o.summary}</div>

      <div>
        <div style={{ fontWeight: 850 }}>怎麼搭（Step-by-step）</div>
        <div className="muted" style={{ marginTop: 6 }}>
          {o.steps.map((s) => (
            <div key={s}>- {s}</div>
          ))}
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
          {o.luggageNotes.map((n) => (
            <div key={n}>- {n}</div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 850 }}>風險提醒</div>
        <div className="muted" style={{ marginTop: 6 }}>
          {o.riskNotes.map((n) => (
            <div key={n}>- {n}</div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 850 }}>截圖（可點放大）</div>
          <div className="muted" style={{ fontSize: 12 }}>
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
              onClick={() => onOpenImage(s.src, s.label)}
              title="點擊放大"
              aria-label={`查看大圖：${s.label}`}
            >
              <img
                src={s.src}
                alt={s.label}
                style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }}
                loading="lazy"
              />
              <div style={{ padding: 10 }}>
                <div style={{ fontWeight: 750, fontSize: 14, lineHeight: 1.25 }}>{s.label}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
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

