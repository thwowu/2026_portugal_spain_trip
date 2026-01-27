import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { TRANSPORT_SEGMENTS, type CityId, type TransportMode, CITIES } from '../data/core'
import { ILLUSTRATION } from '../illustrations'
import { PageHero } from '../components/PageHero'
import { usePlanning, type ChecklistCategory, type DecisionStatus, type TransportWeights } from '../state/planning'
import {
  createPlanningExportV1,
  defaultPlanningExportFileName,
  downloadJsonFile,
  mergePlanningState,
  parsePlanningExportV1,
} from '../state/planningExport'
import { createContentPatchExportV1, defaultContentPatchExportFileName } from '../state/contentPatchExport'

const STATUS_LABEL: Record<DecisionStatus, string> = {
  candidate: '候選',
  decided: '已決定',
  rejected: '放棄',
}

const CATEGORY_LABEL: Record<ChecklistCategory, string> = {
  tickets: '門票',
  stays: '訂房',
  transport: '交通',
  backup: '備案',
  other: '其他',
}

function StatusButtons({
  value,
  onChange,
}: {
  value: DecisionStatus
  onChange: (next: DecisionStatus) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {(['candidate', 'decided', 'rejected'] as const).map((s) => (
        <button
          key={s}
          className={`btn ${value === s ? 'btnPrimary' : ''}`}
          onClick={() => onChange(s)}
        >
          {STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const { state, actions } = usePlanning()
  const [newTodoText, setNewTodoText] = useState('')
  const [newTodoCategory, setNewTodoCategory] = useState<ChecklistCategory>('tickets')
  const [newChangelog, setNewChangelog] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const importInputRef = useRef<HTMLInputElement | null>(null)

  const citiesForPlanning = useMemo(
    () => (Object.keys(CITIES) as CityId[]).filter((c) => c !== 'sintra'),
    [],
  )

  return (
    <div className="container">
      <div className="card">
        <div className="cardInner">
          <PageHero
            title="規劃看板"
            subtitle="這裡用來跟父母對齊「選哪個 / 為什麼 / 下一步要做什麼」。"
            image={{
              src: ILLUSTRATION.heroDashboard.src,
              fallbackSrc: ILLUSTRATION.elderly.src,
              alt: ILLUSTRATION.heroDashboard.alt,
            }}
          />

          <hr className="hr" />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className="btn"
              onClick={() => {
                const payload = createPlanningExportV1(state)
                const filename = defaultPlanningExportFileName(payload.createdAt)
                downloadJsonFile(filename, payload)
              }}
            >
              匯出 JSON（用 LINE 傳給我）
            </button>
            <button
              className="btn"
              onClick={() => {
                const payload = createContentPatchExportV1(state)
                const filename = defaultContentPatchExportFileName(payload.createdAt)
                downloadJsonFile(filename, payload)
              }}
            >
              匯出內容更新 JSON（給 AI）
            </button>
            <button className="btn" onClick={() => importInputRef.current?.click()}>
              匯入 JSON
            </button>
            <div className="muted" style={{ fontSize: 13 }}>
              下載後可在手機「檔案 / 下載」找到，直接用 LINE 傳檔。
            </div>
            {importMsg && (
              <div className="muted" style={{ fontSize: 13 }}>
                {importMsg}
              </div>
            )}
          </div>

          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return

              try {
                const text = await f.text()
                const json = JSON.parse(text)
                const parsed = parsePlanningExportV1(json)
                if (!parsed) {
                  setImportMsg('匯入失敗：檔案格式不符合（不是 v1 匯出檔）。')
                  return
                }
                actions.replaceState(mergePlanningState(state, parsed.payload.planning))
                setImportMsg(`已匯入：${f.name}`)
              } catch {
                setImportMsg('匯入失敗：無法解析 JSON。')
              }
            }}
          />
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        <div className="cardInner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src={ILLUSTRATION.map.src}
              alt={ILLUSTRATION.map.alt}
              style={{ width: 34, height: 34, objectFit: 'contain' }}
            />
            <div style={{ fontWeight: 850, fontSize: 'var(--text-lg)' }}>交通決策</div>
            <div className="muted" style={{ marginLeft: 'auto', fontSize: 13 }}>
              <Link to="/transport">查看交通詳情</Link>
            </div>
          </div>

          <hr className="hr" />

          <div style={{ display: 'grid', gap: 12 }}>
            {TRANSPORT_SEGMENTS.map((seg) => {
              const d = state.transportDecisions[seg.id]
              return (
                <div key={seg.id} className="card" style={{ boxShadow: 'none' }}>
                  <div className="cardInner">
                    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                      <div style={{ fontWeight: 800 }}>{seg.label}</div>
                      <div className="chip">{STATUS_LABEL[d.status]}</div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <StatusButtons
                        value={d.status}
                        onChange={(status) =>
                          actions.setTransportDecision(seg.id, { status })
                        }
                      />
                    </div>

                    <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        className={`btn ${
                          d.chosenMode === 'train' ? 'btnPrimary' : ''
                        }`}
                        onClick={() =>
                          actions.setTransportDecision(seg.id, {
                            chosenMode: 'train' as TransportMode,
                          })
                        }
                      >
                        火車
                      </button>
                      <button
                        className={`btn ${
                          d.chosenMode === 'bus' ? 'btnPrimary' : ''
                        }`}
                        onClick={() =>
                          actions.setTransportDecision(seg.id, {
                            chosenMode: 'bus' as TransportMode,
                          })
                        }
                      >
                        巴士
                      </button>
                      <div className="muted" style={{ alignSelf: 'center' }}>
                        {d.chosenMode ? `已選：${d.chosenMode === 'train' ? '火車' : '巴士'}` : '尚未選擇'}
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <Link to={`/transport#seg-${seg.id}`}>跳到這段交通</Link>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                        一句話原因（給父母看的）
                      </div>
                      <input
                        value={d.reason}
                        onChange={(e) =>
                          actions.setTransportDecision(seg.id, { reason: e.target.value })
                        }
                        placeholder="例：轉乘少、行李比較好處理"
                        style={{
                          width: '100%',
                          borderRadius: 12,
                          border: '1px solid var(--hairline)',
                          padding: '12px 12px',
                          fontSize: 'var(--text-md)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        <div className="cardInner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src={ILLUSTRATION.suitcase.src}
              alt={ILLUSTRATION.suitcase.alt}
              style={{ width: 28, height: 28, objectFit: 'contain' }}
            />
            <div style={{ fontWeight: 850, fontSize: 'var(--text-lg)' }}>住宿決策</div>
            <div className="muted" style={{ marginLeft: 'auto', fontSize: 13 }}>
              <Link to="/stays">查看住宿詳情</Link>
            </div>
          </div>

          <hr className="hr" />

          <div style={{ display: 'grid', gap: 12 }}>
            {citiesForPlanning.map((cityId) => {
              const d = state.stayDecisions[cityId]
              return (
                <div key={cityId} className="card" style={{ boxShadow: 'none' }}>
                  <div className="cardInner">
                    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                      <div style={{ fontWeight: 800 }}>{CITIES[cityId].label}</div>
                      <div className="chip">{STATUS_LABEL[d.status]}</div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <StatusButtons
                        value={d.status}
                        onChange={(status) => actions.setStayDecision(cityId, { status })}
                      />
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                        一句話原因（例如：不用爬坡、有電梯、24h 櫃檯）
                      </div>
                      <input
                        value={d.reason}
                        onChange={(e) =>
                          actions.setStayDecision(cityId, { reason: e.target.value })
                        }
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

                    <div style={{ marginTop: 10 }}>
                      <Link to={`/stays#stay-${cityId}`}>跳到這個城市住宿</Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        <div className="cardInner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src={ILLUSTRATION.signpost.src}
              alt={ILLUSTRATION.signpost.alt}
              style={{ width: 34, height: 34, objectFit: 'contain' }}
            />
            <div style={{ fontWeight: 850, fontSize: 'var(--text-lg)' }}>景點優先序</div>
            <div className="muted" style={{ marginLeft: 'auto', fontSize: 13 }}>
              <Link to="/attractions">查看景點詳情</Link>
            </div>
          </div>

          <div className="muted" style={{ marginTop: 8 }}>
            規劃階段先決定每個城市「必去 3 個」，再慢慢補內容。
          </div>

          <hr className="hr" />

          <div className="chipRow">
            {citiesForPlanning.map((cityId) => (
              <Link key={cityId} className="btn" to={`/attractions#attr-${cityId}`}>
                {CITIES[cityId].label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        <div className="cardInner">
          <div style={{ fontWeight: 850, fontSize: 'var(--text-lg)' }}>交通權重（加權評分用）</div>
          <div className="muted" style={{ marginTop: 6 }}>
            規劃討論時可拉權重，讓「怕麻煩 vs 省錢」更具體。
          </div>

          <hr className="hr" />

          {(
            [
              ['simplicity', '簡便性'],
              ['luggage', '大行李友善'],
              ['risk', '風險性'],
              ['comfort', '舒適度'],
              ['cost', '成本'],
              ['flexibility', '彈性'],
            ] as const
          ).map(([k, label]) => (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 46px', gap: 12, alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>{label}</div>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={state.transportWeights[k]}
                onChange={(e) => {
                  const key = k as keyof TransportWeights
                  const patch = { [key]: Number(e.target.value) } satisfies Partial<TransportWeights>
                  actions.setTransportWeights(patch)
                }}
              />
              <div className="muted" style={{ fontSize: 13, textAlign: 'right' }}>
                {Math.round(state.transportWeights[k] * 100)}
              </div>
            </div>
          ))}
          <div className="muted" style={{ fontSize: 13 }}>
            提醒：目前不會自動把總和校正成 100%，之後可再加「一鍵平均/正規化」。
          </div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        <div className="cardInner">
          <div style={{ fontWeight: 850, fontSize: 'var(--text-lg)' }}>待辦清單</div>
          <div className="muted" style={{ marginTop: 6 }}>
            這裡是規劃階段的 next actions（買票/訂房/預約/備案）。
          </div>

          <hr className="hr" />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select
              value={newTodoCategory}
              onChange={(e) => setNewTodoCategory(e.target.value as ChecklistCategory)}
              style={{
                borderRadius: 12,
                border: '1px solid var(--hairline)',
                padding: '12px 12px',
                minHeight: 44,
              }}
            >
              {(Object.keys(CATEGORY_LABEL) as ChecklistCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
            <input
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="新增待辦…"
              style={{
                flex: '1 1 260px',
                borderRadius: 12,
                border: '1px solid var(--hairline)',
                padding: '12px 12px',
                fontSize: 'var(--text-md)',
                minHeight: 44,
              }}
            />
            <button
              className="btn btnPrimary"
              onClick={() => {
                if (!newTodoText.trim()) return
                actions.addChecklistItem(newTodoText, newTodoCategory)
                setNewTodoText('')
              }}
            >
              新增
            </button>
          </div>

          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            {state.checklist.length === 0 ? (
              <div className="muted">尚未新增待辦。</div>
            ) : (
              state.checklist.map((item) => (
                <div
                  key={item.id}
                  className="card"
                  style={{ boxShadow: 'none', borderStyle: 'dashed' }}
                >
                  <div className="cardInner" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button
                      className={`btn ${item.done ? 'btnPrimary' : ''}`}
                      onClick={() => actions.toggleChecklistItem(item.id)}
                      aria-pressed={item.done}
                      title="完成/取消完成"
                    >
                      {item.done ? '✓' : '□'}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 750, textDecoration: item.done ? 'line-through' : 'none' }}>
                        {item.text}
                      </div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        {CATEGORY_LABEL[item.category]}
                      </div>
                    </div>
                    <button className="btn btnDanger" onClick={() => actions.deleteChecklistItem(item.id)}>
                      刪除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        <div className="cardInner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src={ILLUSTRATION.signpost.src}
              alt={ILLUSTRATION.signpost.alt}
              style={{ width: 34, height: 34, objectFit: 'contain' }}
            />
            <div style={{ fontWeight: 850, fontSize: 'var(--text-lg)' }}>變更紀錄</div>
          </div>

          <div className="muted" style={{ marginTop: 6 }}>
            每次你改行程，寫一句「改了什麼/為什麼」，父母比較容易跟上。
          </div>

          <hr className="hr" />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={newChangelog}
              onChange={(e) => setNewChangelog(e.target.value)}
              placeholder="例：把 Day 9 改成 Lagos→Seville，避免整天拉車。"
              style={{
                flex: '1 1 360px',
                borderRadius: 12,
                border: '1px solid var(--hairline)',
                padding: '12px 12px',
                fontSize: 'var(--text-md)',
                minHeight: 44,
              }}
            />
            <button
              className="btn btnPrimary"
              onClick={() => {
                if (!newChangelog.trim()) return
                actions.addChangelog(newChangelog)
                setNewChangelog('')
              }}
            >
              新增
            </button>
          </div>

          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            {state.changelog.length === 0 ? (
              <div className="muted">尚未新增變更紀錄。</div>
            ) : (
              state.changelog.map((entry) => (
                <div key={entry.id} className="card" style={{ boxShadow: 'none' }}>
                  <div className="cardInner" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <img
                      src={ILLUSTRATION.safety.src}
                      alt={ILLUSTRATION.safety.alt}
                      style={{ width: 28, height: 28, objectFit: 'contain', marginTop: 2 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 750 }}>{entry.text}</div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        {new Date(entry.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button className="btn btnDanger" onClick={() => actions.deleteChangelog(entry.id)}>
                      刪除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

