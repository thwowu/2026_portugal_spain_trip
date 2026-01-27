import { Link } from 'react-router-dom'
import { STAYS_DATA } from '../generated'
import { CITIES, type CityId } from '../data/core'
import { usePlanning } from '../state/planning'
import { useHashScroll } from '../hooks/useHashScroll'
import { useReveal } from '../hooks/useReveal'
import { ILLUSTRATION } from '../illustrations'
import { PageHero } from '../components/PageHero'
import type { MarkdownTable } from '../data/stays'

function statusPill(status: 'primary' | 'secondary' | 'backup' | undefined) {
  if (!status) return null
  const label = status === 'primary' ? '首選' : status === 'secondary' ? '次選' : '備案'
  return <span className="chip">{label}</span>
}

function TableView({ table }: { table: MarkdownTable }) {
  const cols = table.headers.length
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
        <thead>
          <tr>
            {table.headers.map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            <tr key={r.label}>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', fontWeight: 750 }}>{r.label}</td>
              {Array.from({ length: Math.max(0, cols - 1) }).map((_, idx) => (
                <td key={idx} style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                  {r.values[idx] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function StaysPage() {
  const { state, actions } = usePlanning()
  useHashScroll()

  return (
    <div className="container">
      <div className="card">
        <div className="cardInner">
          <PageHero
            title="住宿"
            subtitle={
              <>
                每城市固定模板：住宿推薦＋入住提醒＋附近交通節點＋「大眾交通怎麼買」＋省錢密技。你也可以在{' '}
                <Link to="/dashboard">Dashboard</Link> 記錄「已決定/候選」與一句話原因。
              </>
            }
            image={{
              src: ILLUSTRATION.heroStays.src,
              fallbackSrc: ILLUSTRATION.suitcase.src,
              alt: ILLUSTRATION.heroStays.alt,
            }}
          />

          <hr className="hr" />

          <div className="chipRow">
            {STAYS_DATA.map((c) => (
              <button
                key={c.cityId}
                className="btn"
                onClick={() => document.getElementById(`stay-${c.cityId}`)?.scrollIntoView({ behavior: 'smooth' })}
              >
                {CITIES[c.cityId].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div style={{ display: 'grid', gap: 14 }}>
        {STAYS_DATA.map((c) => {
          const decision = state.stayDecisions[c.cityId]
          return (
            <RevealSection key={c.cityId} id={`stay-${c.cityId}`}>
              <div className="card">
                <div className="cardInner">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 950, fontSize: 'var(--text-xl)', lineHeight: 1.15 }}>
                      {c.title}
                    </div>
                    <div className="chip">
                      Dashboard：{decision?.status === 'decided' ? '已決定' : decision?.status === 'rejected' ? '放棄' : '候選'}
                    </div>
                  </div>

                  <div className="muted" style={{ marginTop: 8 }}>
                    一句話原因：{decision?.reason || '（尚未填）'}
                  </div>

                  <hr className="hr" />

                  <div style={{ display: 'grid', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>住宿推薦</div>
                      <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                        {c.options.map((o) => (
                          <div key={o.name} className="card" style={{ boxShadow: 'none' }}>
                            <div className="cardInner">
                              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                                <div style={{ fontWeight: 900 }}>{o.name}</div>
                                {statusPill(o.statusHint)}
                              </div>
                              {o.why.length > 0 && (
                                <div className="muted" style={{ marginTop: 8 }}>
                                  {o.why.map((x) => (
                                    <div key={x}>- {x}</div>
                                  ))}
                                </div>
                              )}
                              {o.risks.length > 0 && (
                                <div style={{ marginTop: 10 }}>
                                  <div style={{ fontWeight: 850 }}>風險/注意</div>
                                  <div className="muted" style={{ marginTop: 6 }}>
                                    {o.risks.map((x) => (
                                      <div key={x}>- {x}</div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {o.links.length > 0 && (
                                <div style={{ marginTop: 10 }}>
                                  <div style={{ fontWeight: 850 }}>連結</div>
                                  <div className="muted" style={{ marginTop: 6 }}>
                                    {o.links.map((l) => (
                                      <div key={l.href}>
                                        - <a href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
                      <div className="cardInner">
                        <div style={{ fontWeight: 900 }}>當地大眾運輸怎麼買/怎麼用</div>
                        <div className="muted" style={{ marginTop: 8 }}>
                          {c.publicTransportHowToBuy.map((x) => (
                            <div key={x}>- {x}</div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
                      <div className="cardInner">
                        <div style={{ fontWeight: 900 }}>省錢密技</div>
                        <div className="muted" style={{ marginTop: 8 }}>
                          {c.moneySavingTips.map((x) => (
                            <div key={x}>- {x}</div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="card" style={{ boxShadow: 'none' }}>
                      <div className="cardInner">
                        <div style={{ fontWeight: 900 }}>風險評估矩陣（Risk matrix）</div>
                        <div className="muted" style={{ marginTop: 10 }}>
                          <TableView table={c.riskMatrix} />
                        </div>
                      </div>
                    </div>

                    <div className="card" style={{ boxShadow: 'none' }}>
                      <div className="cardInner">
                        <div style={{ fontWeight: 900 }}>量化評分模型（權重＋分數表）</div>
                        <div className="muted" style={{ marginTop: 10 }}>
                          <div style={{ fontWeight: 850, marginBottom: 6 }}>權重</div>
                          {c.scoringModel.weights.map((w) => (
                            <div key={w.criterion}>
                              - {w.criterion}（weight={w.weight}）
                            </div>
                          ))}
                        </div>
                        <div className="muted" style={{ marginTop: 10 }}>
                          <TableView table={c.scoringModel.table} />
                        </div>
                      </div>
                    </div>

                    <div className="card" style={{ boxShadow: 'none' }}>
                      <div className="cardInner">
                        <div style={{ fontWeight: 900 }}>在 Dashboard 快速標記</div>
                        <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <button
                            className="btn btnPrimary"
                            onClick={() => actions.setStayDecision(c.cityId as CityId, { status: 'decided' })}
                          >
                            標記已決定
                          </button>
                          <button
                            className="btn"
                            onClick={() => actions.setStayDecision(c.cityId as CityId, { status: 'candidate' })}
                          >
                            標記候選
                          </button>
                          <button
                            className="btn btnDanger"
                            onClick={() => actions.setStayDecision(c.cityId as CityId, { status: 'rejected' })}
                          >
                            標記放棄
                          </button>
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

