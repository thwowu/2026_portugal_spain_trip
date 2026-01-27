import { useMemo, useRef } from 'react'
import { useSettings, type FontScale } from '../state/settings'
import { useProgress } from '../state/progress'
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
  const { fontScale, setFontScale, showSeenHints, setShowSeenHints, resetRecommended } = useSettings()
  const { actions: progressActions } = useProgress()
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  const title = useMemo(() => '設定', [])

  return (
    <Modal
      open={open}
      ariaLabel={title}
      onClose={onClose}
      overlayClassName="modalOverlay modalOverlayHigh"
      initialFocusRef={closeBtnRef}
    >
      <div className="cardInner">
          <div className="modalHeader">
            <div>
              <div className="modalTitle">設定</div>
              <div className="muted modalSub">
                字體預設以長輩友善為主；如果覺得太大/太小，可在這裡調整。
              </div>
            </div>
            <button className="btn modalCloseBtn" ref={closeBtnRef} onClick={onClose}>
              關閉
            </button>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 900 }}>已讀/已看過提示</div>
                <button
                  type="button"
                  className={`btn ${showSeenHints ? 'btnPrimary' : ''}`}
                  onClick={() => setShowSeenHints(!showSeenHints)}
                  aria-pressed={showSeenHints}
                >
                  {showSeenHints ? '開' : '關'}
                </button>
              </div>
              <div className="muted" style={{ marginTop: 8, fontSize: 'var(--text-sm)' }}>
                開啟後，看過某段內容會顯示「已看過」，方便爸媽知道哪些已經掃過。
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn" type="button" onClick={() => progressActions.clearAllSeen()}>
                  清除已讀/已看過標記
                </button>
              </div>
            </div>
          </div>

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

