import './App.css'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { ScrollProgress } from './components/ScrollProgress'
import { IconAttractions, IconItinerary, IconStays, IconTransport } from './components/NavIcons'
import { SettingsModal } from './components/SettingsModal'

const ItineraryPage = lazy(() => import('./pages/ItineraryPage').then((m) => ({ default: m.ItineraryPage })))
const TransportPage = lazy(() => import('./pages/TransportPage').then((m) => ({ default: m.TransportPage })))
const StaysPage = lazy(() => import('./pages/StaysPage').then((m) => ({ default: m.StaysPage })))
const AttractionsPage = lazy(() => import('./pages/AttractionsPage').then((m) => ({ default: m.AttractionsPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

function AppRoutes() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="routeFrame">
      <Suspense
        fallback={
          <div className="container">
            <div className="card">
              <div className="cardInner">
                <div className="muted">載入中…</div>
              </div>
            </div>
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Navigate to="/itinerary" replace />} />
          <Route path="/itinerary" element={<ItineraryPage />} />
          <Route path="/transport" element={<TransportPage />} />
          <Route path="/stays" element={<StaysPage />} />
          <Route path="/attractions" element={<AttractionsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </div>
  )
}

function App() {
  const topBarRef = useRef<HTMLDivElement | null>(null)
  const bottomNavRef = useRef<HTMLElement | null>(null)

  const [showSettings, setShowSettings] = useState(false)

  const openSettings = () => setShowSettings(true)

  useEffect(() => {
    const root = document.documentElement
    const setVars = () => {
      if (topBarRef.current) root.style.setProperty('--topbar-h', `${topBarRef.current.offsetHeight}px`)
      if (bottomNavRef.current) root.style.setProperty('--bottomnav-h', `${bottomNavRef.current.offsetHeight}px`)
    }

    setVars()

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(setVars) : null
    if (ro) {
      if (topBarRef.current) ro.observe(topBarRef.current)
      if (bottomNavRef.current) ro.observe(bottomNavRef.current)
    }
    window.addEventListener('resize', setVars)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', setVars)
    }
  }, [])

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="topBar" ref={topBarRef}>
        <div className="topBarInner">
          <div className="brand">
            <div className="brandTitle">葡西雙國深度走訪｜城景與海岸一次收齊</div>
            <div className="brandSub">
              用底部選單切換：行程 / 交通 / 住宿 / 景點
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button className="btn topBarHelpBtn" onClick={openSettings} type="button">
              設定
            </button>
          </div>
        </div>
        <ScrollProgress />
      </div>

      <div className="appShell">
        <AppRoutes />

        <footer className="siteFooter" aria-label="Impressum / Disclaimer">
          <div className="siteFooterInner">
            <div className="siteFooterTitle">Impressum / Disclaimer</div>
            <div className="siteFooterText">
              本網站與內容僅供私人旅行規劃使用，非商業、非官方資訊；請勿散佈或重新發布。使用者需自行判斷資訊正確性與風險。
            </div>
          </div>
        </footer>
      </div>

      <nav className="bottomNav" aria-label="主選單" ref={bottomNavRef}>
        <div className="bottomNavInner">
          <NavLink
            to="/itinerary"
            className={({ isActive }) => `navItem ${isActive ? 'navItemActive' : ''}`}
          >
            <span className="navIcon" aria-hidden="true">
              <IconItinerary />
            </span>
            <span className="navLabel">行程</span>
          </NavLink>
          <NavLink
            to="/transport"
            className={({ isActive }) => `navItem ${isActive ? 'navItemActive' : ''}`}
          >
            <span className="navIcon" aria-hidden="true">
              <IconTransport />
            </span>
            <span className="navLabel">交通</span>
          </NavLink>
          <NavLink
            to="/stays"
            className={({ isActive }) => `navItem ${isActive ? 'navItemActive' : ''}`}
          >
            <span className="navIcon" aria-hidden="true">
              <IconStays />
            </span>
            <span className="navLabel">住宿</span>
          </NavLink>
          <NavLink
            to="/attractions"
            className={({ isActive }) => `navItem ${isActive ? 'navItemActive' : ''}`}
          >
            <span className="navIcon" aria-hidden="true">
              <IconAttractions />
            </span>
            <span className="navLabel">景點</span>
          </NavLink>
        </div>
      </nav>

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </BrowserRouter>
  )
}

export default App
