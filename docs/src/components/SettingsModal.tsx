import { useSettings, type FontScale } from '../state/settings'
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

