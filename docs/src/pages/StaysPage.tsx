import { useMemo } from 'react'
import { STAYS_DATA } from '../generated'
import { CITIES, STAYS_CITY_ORDER } from '../data/core'
import { useHashScroll } from '../hooks/useHashScroll'
import { useReveal } from '../hooks/useReveal'
import { PageHero } from '../components/PageHero'
import { FormattedInline } from '../components/FormattedText'
import { ExpandingBox } from '../components/ExpandingBox'

function statusPill(status: 'primary' | 'secondary' | 'backup' | undefined) {
  if (!status) return null
  const label = status === 'primary' ? '首選' : status === 'secondary' ? '次選' : '備案'
  return <span className="chip">{label}</span>
}

export function StaysPage() {
  useHashScroll()

  const orderedStays = useMemo(() => {
    const idx = new Map<string, number>(STAYS_CITY_ORDER.map((id, i) => [id, i]))
    return [...STAYS_DATA].sort((a, b) => (idx.get(a.cityId) ?? 999) - (idx.get(b.cityId) ?? 999))
  }, [])

  return (
    <div className="container">
      <div className="card">
        <div className="cardInner">
          <div className="staysHero">
            <div className="staysHeroContent">
              <PageHero
                title="住宿"
                subtitle={
                  <>
                    每城市固定模板：住宿推薦、入住/省錢提醒、附近交通節點與票卡怎麼買。
                  </>
                }
              />
            </div>
          </div>

          <hr className="hr" />

          <div className="chipRow">
            {orderedStays.map((c) => (
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
        {orderedStays.map((c) => {
          return (
            <RevealSection key={c.cityId} id={`stay-${c.cityId}`}>
              <div className="card">
                <div className="cardInner">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 950, fontSize: 'var(--text-xl)', lineHeight: 1.15 }}>
                      {c.title}
                    </div>
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
                                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                                    {o.why.map((x, idx) => (
                                      <li key={x} style={{ marginTop: idx === 0 ? 0 : 6 }}>
                                        <FormattedInline text={x} />
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {o.risks.length > 0 && (
                                <div style={{ marginTop: 10 }}>
                                  <div style={{ fontWeight: 850 }}>風險/注意</div>
                                  <div className="muted" style={{ marginTop: 6 }}>
                                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                                      {o.risks.map((x, idx) => (
                                        <li key={x} style={{ marginTop: idx === 0 ? 0 : 6 }}>
                                          <FormattedInline text={x} />
                                        </li>
                                      ))}
                                    </ul>
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

                    <ExpandingBox
                      title="當地大眾運輸怎麼買/怎麼用"
                      variant="modal"
                      viewLabel="看完整說明"
                      modalAriaLabel="當地大眾運輸怎麼買/怎麼用"
                      style={{ boxShadow: 'none', background: 'var(--surface-2)' }}
                    >
                      <div className="muted" style={{ marginTop: 8 }}>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {c.publicTransportHowToBuy.map((x, idx) => (
                            <li key={x} style={{ marginTop: idx === 0 ? 0 : 6 }}>
                              <FormattedInline text={x} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    </ExpandingBox>

                    <ExpandingBox
                      title="省錢密技"
                      variant="modal"
                      viewLabel="看完整清單"
                      modalAriaLabel="省錢密技"
                      style={{ boxShadow: 'none', background: 'var(--surface-2)' }}
                    >
                      <div className="muted" style={{ marginTop: 8 }}>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {c.moneySavingTips.map((x, idx) => (
                            <li key={x} style={{ marginTop: idx === 0 ? 0 : 6 }}>
                              <FormattedInline text={x} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    </ExpandingBox>
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

