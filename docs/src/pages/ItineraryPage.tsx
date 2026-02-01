import { useEffect } from 'react'
import { ILLUSTRATION } from '../illustrations'
import { ItineraryScrolly } from '../components/ItineraryScrolly'
import { useProgress } from '../state/progress'

export function ItineraryPage() {
  const { actions: progressActions } = useProgress()

  // Keep existing behavior: opening the itinerary marks Day 1 as seen.
  // (The scrolly view will continue marking days as you scroll.)
  useEffect(() => {
    progressActions.markItineraryDaySeen(1)
  }, [progressActions])

  return (
    <div className="pageItinerary">
      <h1 className="srOnly">行程（Itinerary）</h1>
      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="card">
          <div className="cardInner">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 14 }}>
              <div>
                <div style={{ fontWeight: 950, fontSize: 'var(--text-2xl)', lineHeight: 1.1 }}>Day 1–15 總行程</div>
                <div className="muted" style={{ marginTop: 10 }}>
                  滑動卡片，地圖同步；需要細節再點開。
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <img
                  src={ILLUSTRATION.cover3d.src}
                  alt={ILLUSTRATION.cover3d.alt}
                  style={{ width: 120, height: 120, objectFit: 'contain' }}
                />
              </div>
            </div>

            <hr className="hr" />
          </div>
        </div>

        <div style={{ height: 12 }} />

        {/* Scrollytelling layout owns the scroll container + fixed map. */}
        <ItineraryScrolly />
      </div>
    </div>
  )
}

