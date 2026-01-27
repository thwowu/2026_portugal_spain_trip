import { useSettings } from '../state/settings'

export function MotionToggle() {
  const { motion, uiMode, prefersReducedMotion, setMotion, setUiMode } = useSettings()

  return (
    <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <div className="muted" style={{ fontSize: 12, lineHeight: 1.2 }}>
          顯示：
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn ${uiMode === 'standard' ? 'btnPrimary' : ''}`}
            onClick={() => setUiMode('standard')}
            aria-pressed={uiMode === 'standard'}
            title="標準模式"
          >
            標準
          </button>
          <button
            className={`btn ${uiMode === 'senior' ? 'btnPrimary' : ''}`}
            onClick={() => setUiMode('senior')}
            aria-pressed={uiMode === 'senior'}
            title="長輩模式（字更大、更好按）"
          >
            長輩
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <div className="muted" style={{ fontSize: 12, lineHeight: 1.2 }}>
          {prefersReducedMotion ? '系統：減少動態' : '動態：'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn ${motion === 'standard' ? 'btnPrimary' : ''}`}
            onClick={() => setMotion('standard')}
            aria-pressed={motion === 'standard'}
            title="標準動態（仍會尊重系統減少動態）"
          >
            標準
          </button>
          <button
            className={`btn ${motion === 'low' ? 'btnPrimary' : ''}`}
            onClick={() => setMotion('low')}
            aria-pressed={motion === 'low'}
            title="低動態（盡量減少動畫）"
          >
            低動態
          </button>
        </div>
      </div>
    </div>
  )
}

