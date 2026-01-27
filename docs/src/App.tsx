import './App.css'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { MotionToggle } from './components/MotionToggle'
import { ScrollProgress } from './components/ScrollProgress'
import { DashboardPage } from './pages/DashboardPage'
import { ItineraryPage } from './pages/ItineraryPage'
import { TransportPage } from './pages/TransportPage'
import { StaysPage } from './pages/StaysPage'
import { AttractionsPage } from './pages/AttractionsPage'
import { NotFoundPage } from './pages/NotFoundPage'

function App() {
  return (
    <BrowserRouter>
      <div className="topBar">
        <div className="topBarInner">
          <div className="brand">
            <div className="brandTitle">葡西之旅規劃</div>
            <div className="brandSub">
              Dashboard 先決策，其他分頁再深入
            </div>
          </div>
          <MotionToggle />
        </div>
        <ScrollProgress />
      </div>

      <div className="appShell">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/itinerary" element={<ItineraryPage />} />
          <Route path="/transport" element={<TransportPage />} />
          <Route path="/stays" element={<StaysPage />} />
          <Route path="/attractions" element={<AttractionsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>

        <footer className="siteFooter" aria-label="Impressum / Disclaimer">
          <div className="siteFooterInner">
            <div className="siteFooterTitle">Impressum / Disclaimer</div>
            <div className="siteFooterText">
              本網站與內容僅供私人旅行規劃使用，非商業、非官方資訊；請勿散佈或重新發布。使用者需自行判斷資訊正確性與風險。
            </div>
          </div>
        </footer>
      </div>

      <nav className="bottomNav" aria-label="主選單">
        <div className="bottomNavInner">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `navItem ${isActive ? 'navItemActive' : ''}`}
          >
            <span className="navIcon" aria-hidden="true">
              ■
            </span>
            <span className="navLabel">看板</span>
          </NavLink>
          <NavLink
            to="/itinerary"
            className={({ isActive }) => `navItem ${isActive ? 'navItemActive' : ''}`}
          >
            <span className="navIcon" aria-hidden="true">
              ↯
            </span>
            <span className="navLabel">行程</span>
          </NavLink>
          <NavLink
            to="/transport"
            className={({ isActive }) => `navItem ${isActive ? 'navItemActive' : ''}`}
          >
            <span className="navIcon" aria-hidden="true">
              ⇄
            </span>
            <span className="navLabel">交通</span>
          </NavLink>
          <NavLink
            to="/stays"
            className={({ isActive }) => `navItem ${isActive ? 'navItemActive' : ''}`}
          >
            <span className="navIcon" aria-hidden="true">
              ⌂
            </span>
            <span className="navLabel">住宿</span>
          </NavLink>
          <NavLink
            to="/attractions"
            className={({ isActive }) => `navItem ${isActive ? 'navItemActive' : ''}`}
          >
            <span className="navIcon" aria-hidden="true">
              ★
            </span>
            <span className="navLabel">景點</span>
          </NavLink>
        </div>
      </nav>
    </BrowserRouter>
  )
}

export default App
