import { useEffect, useState } from 'react'
import { STAYS_DATA } from '../generated'
import { CITIES, type CityId } from '../data/core'
import { usePlanning } from '../state/planning'
import { useProgress } from '../state/progress'
import { useSettings } from '../state/settings'
import { useHashScroll } from '../hooks/useHashScroll'
import { useReveal } from '../hooks/useReveal'
import { ILLUSTRATION } from '../illustrations'
import { PageHero } from '../components/PageHero'
import type { MarkdownTable } from '../data/stays'
import { FormattedInline } from '../components/FormattedText'
import { Modal } from '../components/Modal'
import { ExpandingBox } from '../components/ExpandingBox'

function statusPill(status: 'primary' | 'secondary' | 'backup' | undefined) {
  if (!status) return null
  const label = status === 'primary' ? '首選' : status === 'secondary' ? '次選' : '備案'
  return <span className="chip">{label}</span>
}

function TableView({ table }: { table: MarkdownTable }) {
  const cols = table.headers.length
  return (
    <div className="tableWrap">
      <table className="matrixTable">
        <thead>
          <tr>
            {table.headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            <tr key={r.label}>
              <td className="matrixTableRowLabel">{r.label}</td>
              {Array.from({ length: Math.max(0, cols - 1) }).map((_, idx) => (
                <td key={idx}>{r.values[idx] ?? ''}</td>
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
  const { state: progress, actions: progressActions } = useProgress()
  const { showSeenHints } = useSettings()
  useHashScroll()
  const [modal, setModal] = useState<{ cityId: CityId; kind: 'risk' | 'scoring' } | null>(null)

  return (
    <div className="container">
      <div className="card">
        <div className="cardInner">
          <PageHero
            title="住宿"
            subtitle={
              <>
                每城市固定模板：住宿推薦＋入住提醒＋附近交通節點＋「大眾交通怎麼買」＋省錢密技。
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
            <RevealSection key={c.cityId} id={`stay-${c.cityId}`} cityId={c.cityId as CityId} onSeen={progressActions.markStaySeen}>
              <div className="card">
                <div className="cardInner">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 950, fontSize: 'var(--text-xl)', lineHeight: 1.15 }}>
                      {c.title}
                    </div>
                    <div className="chip">
                    狀態：
                    {decision?.status === 'decided' ? '已決定' : decision?.status === 'rejected' ? '放棄' : '候選'}
                    </div>
                    {showSeenHints && progress.staysSeen[c.cityId as CityId] ? <div className="chip">已看過</div> : null}
                  </div>

                  <div className="muted" style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 'var(--text-sm)', marginBottom: 6 }}>一句話原因（給父母看的）</div>
                  <input
                    value={decision?.reason ?? ''}
                    onChange={(e) => actions.setStayDecision(c.cityId as CityId, { reason: e.target.value })}
                    placeholder="例：交通方便、不用爬坡、有電梯"
                    style={{
                      width: '100%',
                      borderRadius: 12,
                      border: '1px solid var(--hairline)',
                      padding: '12px 12px',
                      fontSize: 'var(--text-md)',
                    }}
                  />
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
                      defaultOpen={false}
                      collapsedHeight={160}
                      moreLabel="看完整說明…"
                      lessLabel="收起說明…"
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
                      defaultOpen={false}
                      collapsedHeight={160}
                      moreLabel="看完整清單…"
                      lessLabel="收起清單…"
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

                    <div className="card" style={{ boxShadow: 'none' }}>
                      <div className="cardInner">
                        <div style={{ fontWeight: 900 }}>風險矩陣 / 量化比較</div>
                        <div className="muted" style={{ marginTop: 8 }}>
                          需要時再打開看（手機比較不佔版面）。
                        </div>
                        <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <button className="btn" onClick={() => setModal({ cityId: c.cityId as CityId, kind: 'risk' })}>
                            看風險矩陣
                          </button>
                          <button className="btn" onClick={() => setModal({ cityId: c.cityId as CityId, kind: 'scoring' })}>
                            看量化評分
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="card" style={{ boxShadow: 'none' }}>
                      <div className="cardInner">
                        <div style={{ fontWeight: 900 }}>快速標記狀態</div>
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

      {modal && (
        <StayMatrixModal
          cityId={modal.cityId}
          kind={modal.kind}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function StayMatrixModal({
  cityId,
  kind,
  onClose,
}: {
  cityId: CityId
  kind: 'risk' | 'scoring'
  onClose: () => void
}) {
  const city = STAYS_DATA.find((c) => c.cityId === cityId)
  if (!city) return null

  return (
    <Modal
      open
      ariaLabel={kind === 'risk' ? '風險評估矩陣' : '量化評分模型'}
      onClose={onClose}
      overlayClassName="modalOverlay modalOverlayHigh"
      cardClassName="card modalCard modalCardWide"
    >
      <div className="cardInner">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
              {CITIES[cityId].label}
            </div>
            <div style={{ fontWeight: 950, fontSize: 'var(--text-xl)', lineHeight: 1.15, marginTop: 6 }}>
              {kind === 'risk' ? '風險評估矩陣（Risk matrix）' : '量化評分模型（權重＋分數表）'}
            </div>
          </div>
          <button className="btn" onClick={onClose}>
            關閉
          </button>
        </div>

        <hr className="hr" />

        {kind === 'risk' ? (
          <div className="muted">
            <TableView table={city.riskMatrix} />
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
              <div className="cardInner">
                <div style={{ fontWeight: 850, marginBottom: 6 }}>權重</div>
                <div className="muted">
                  {city.scoringModel.weights.map((w) => (
                    <div key={w.criterion}>
                      - {w.criterion}（weight={w.weight}）
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="muted">
              <TableView table={city.scoringModel.table} />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function RevealSection({
  id,
  cityId,
  onSeen,
  children,
}: {
  id: string
  cityId: CityId
  onSeen: (cityId: CityId) => void
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
          onSeen(cityId)
          io.unobserve(e.target)
        }
      },
      { root: null, rootMargin: '0px 0px -30% 0px', threshold: 0.25 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [onSeen, cityId, ref])
  return (
    <section id={id} className="reveal" ref={ref}>
      {children}
    </section>
  )
}

