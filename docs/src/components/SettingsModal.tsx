import { useState } from 'react'
import { useSettings, type FontScale } from '../state/settings'
import { usePlanning } from '../state/planning'
import {
  createPlanningExportV1,
  defaultPlanningExportFileName,
  downloadJsonFile,
  mergePlanningState,
  parsePlanningExportV1,
} from '../state/planningExport'
import { Modal } from './Modal'
import { MotionToggle } from './MotionToggle'

const SCALE_LABEL: Record<FontScale, string> = {
  0: '大',
  1: '更大（推薦）',
  2: '最大',
}

export function SettingsModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { fontScale, setFontScale, resetRecommended } = useSettings()
  const { state: planning, actions: planningActions } = usePlanning()
  const [importStatus, setImportStatus] = useState<{ kind: 'idle' | 'ok' | 'error'; message: string }>({
    kind: 'idle',
    message: '',
  })

  const title = '設定'

  return (
    <Modal
      open={open}
      ariaLabel={title}
      onClose={onClose}
      overlayClassName="modalOverlay modalOverlayHigh"
    >
      <div className="cardInner">
          <div className="modalHeader">
            <div>
              <div className="modalTitle">設定</div>
              <div className="muted modalSub">
                字體預設偏大、好閱讀；如果覺得太大/太小，可在這裡調整。
              </div>
            </div>
          </div>

          <hr className="hr" />

          <div className="card modalSectionCard">
            <div className="cardInner">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'baseline',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ fontWeight: 900 }}>顯示與動態</div>
                <div className="chip">模式</div>
              </div>

              <div style={{ marginTop: 12 }}>
                <MotionToggle />
              </div>

              <div className="muted" style={{ marginTop: 10, fontSize: 'var(--text-sm)' }}>
                想看到「滑動時的動畫」（例如地圖上的小火車），把「動態」切到「標準」。
              </div>
            </div>
          </div>

          <div style={{ height: 10 }} />

          <div className="card modalSectionCard">
            <div className="cardInner">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 900 }}>字體大小</div>
                <div className="chip">{SCALE_LABEL[fontScale]}</div>
              </div>

              <div style={{ marginTop: 12 }}>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={fontScale}
                  onChange={(e) => setFontScale(Number(e.target.value) as FontScale)}
                  style={{ width: '100%' }}
                  aria-label="字體大小滑桿"
                />
              </div>

              <div className="muted" style={{ marginTop: 10, fontSize: 'var(--text-sm)' }}>
                你現在看到的內容會立即跟著變大/變小（不用重新整理）。
              </div>
            </div>
          </div>

          <div style={{ height: 10 }} />

          <div className="card modalSectionCard">
            <div className="cardInner">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 900 }}>資料備份</div>
                <div className="chip">Export / Import</div>
              </div>

              <div className="muted" style={{ marginTop: 10, fontSize: 'var(--text-sm)' }}>
                匯出可以備份到手機/電腦；匯入可以把備份載回來（會合併到目前狀態）。
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  className="btn"
                  type="button"
                  data-testid="planning-export"
                  onClick={() => {
                    const payload = createPlanningExportV1(planning)
                    const filename = defaultPlanningExportFileName(payload.createdAt)
                    downloadJsonFile(filename, payload)
                    setImportStatus({ kind: 'ok', message: '已匯出（已觸發下載）。' })
                  }}
                >
                  匯出 JSON
                </button>

                <label className="btn" style={{ cursor: 'pointer' }}>
                  匯入 JSON
                  <input
                    type="file"
                    accept="application/json"
                    data-testid="planning-import"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.currentTarget.files?.[0]
                      if (!file) return
                      try {
                        const raw = await file.text()
                        const parsedJson = JSON.parse(raw)
                        const parsed = parsePlanningExportV1(parsedJson)
                        if (!parsed) {
                          setImportStatus({ kind: 'error', message: '匯入失敗：檔案格式不符合（version/schema 不對）。' })
                          return
                        }
                        const next = mergePlanningState(planning, parsed.payload.planning)
                        planningActions.replaceState(next)
                        setImportStatus({ kind: 'ok', message: '匯入成功：已更新資料。' })
                      } catch {
                        setImportStatus({ kind: 'error', message: '匯入失敗：不是有效的 JSON 檔。' })
                      } finally {
                        // Allow importing the same file again.
                        e.currentTarget.value = ''
                      }
                    }}
                  />
                </label>

                {importStatus.kind !== 'idle' ? (
                  <div
                    className="muted"
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: importStatus.kind === 'error' ? 'color-mix(in oklab, var(--danger) 70%, var(--text))' : undefined,
                    }}
                    aria-label="匯入匯出狀態"
                  >
                    {importStatus.message}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div style={{ height: 10 }} />

          <div className="modalActions">
            <button className="btn btnPrimary" onClick={onClose}>
              完成
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                resetRecommended()
                onClose()
              }}
            >
              一鍵回到推薦設定
            </button>
          </div>
      </div>
    </Modal>
  )
}

