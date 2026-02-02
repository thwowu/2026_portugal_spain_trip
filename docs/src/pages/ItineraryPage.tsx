import { ItineraryScrolly } from '../components/ItineraryScrolly'

export function ItineraryPage() {
  return (
    <div className="pageItinerary">
      <h1 className="srOnly">行程（Itinerary）</h1>
      <div className="container">
        <div className="card">
          <div className="cardInner">
            <div>
              <div>
                <div style={{ fontWeight: 950, fontSize: 'var(--text-2xl)', lineHeight: 1.1 }}>Day 1–15 總行程</div>
                <div className="muted" style={{ marginTop: 10 }}>
                  滑動卡片，地圖同步；需要細節再點開。
                </div>
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

