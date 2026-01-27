import { useEffect, useMemo, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { IconItinerary, IconStays, IconTransport } from './NavIcons'
import { useMotionEnabled } from '../state/settings'
import { withBaseUrl } from '../utils/asset'
import { Modal } from './Modal'

export function OnboardingModal({
  onClose,
}: {
  onClose: () => void
}) {
  const allowMotion = useMotionEnabled()
  const primaryBtnRef = useRef<HTMLButtonElement | null>(null)

  const cards = useMemo(
    () =>
      [
        {
          icon: <IconItinerary />,
          title: '行程（最重要）',
          subtitle: '每天做什麼：先看摘要，需要再展開細節。',
          heroSrc: withBaseUrl('/illustrations/cover-3d.png'),
          heroAlt: '示意插圖：行程（3D）',
          bullets: ['先看摘要 → 需要再展開', '右下角「快速跳轉」可直接跳城市'],
        },
        {
          icon: <IconTransport />,
          title: '交通（看大建議就夠）',
          subtitle: '火車 vs 巴士比較：先看「大建議」。',
          heroSrc: withBaseUrl('/illustrations/3d-train-on-landscape.png'),
          heroAlt: '示意插圖：交通（3D）',
          bullets: ['合理就按「直接採用建議」', '不確定就先跳過，晚點再回來'],
        },
        {
          icon: <IconStays />,
          title: '住宿（寫一句話原因）',
          subtitle: '給爸媽一眼看懂：交通方便／不用爬坡／有電梯。',
          heroSrc: withBaseUrl('/illustrations/3d-hotel-building-isometric.png'),
          heroAlt: '示意插圖：住宿（3D）',
          bullets: ['先標「候選」就好', '需要時再看風險矩陣/量化評分'],
        },
      ] as const,
    [],
  )

  useEffect(() => {
    // Preload hero images.
    for (const c of cards) {
      const img = new Image()
      img.decoding = 'async'
      img.src = c.heroSrc
    }
  }, [cards])

  return (
    <Modal
      open
      ariaLabel="第一次使用說明"
      onClose={onClose}
      overlayClassName={`modalOverlay onbOverlay ${allowMotion ? 'onbMotion' : 'onbNoMotion'}`}
      cardClassName={`card modalCard onbCard ${allowMotion ? 'onbMotion' : 'onbNoMotion'}`}
    >
      <div className="cardInner">
          <div className="modalHeader">
            <div>
              <div className="modalTitle">第一次使用：給爸媽的 30 秒導覽</div>
              <div className="muted modalSub">
                之後也可以從右上角「使用說明」再打開。
              </div>
            </div>
            <button className="btn modalCloseBtn" onClick={onClose}>
              關閉
            </button>
          </div>

          <hr className="hr" />

          {/* Single-page onboarding: 3 big cards */}
          <div className={`onbStep ${allowMotion ? 'onbMotion' : 'onbNoMotion'}`}>
            <div className="muted" style={{ marginTop: 2 }}>
              先看<strong>行程</strong>就好；其他頁面需要時再看。
            </div>

            <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
              {cards.map((c, idx) => (
                <div key={c.title} className="card modalSectionCard">
                  <div className="cardInner">
                    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <span className="chip" aria-hidden="true">
                        {idx + 1}
                      </span>
                      <div style={{ fontWeight: 950, fontSize: 'var(--text-lg)' }}>{c.title}</div>
                    </div>

                    <div className="muted" style={{ marginTop: 8 }}>
                      {c.subtitle}
                    </div>

                    <div className="onbHero">
                      <img
                        className={`onbHeroImg ${allowMotion ? 'onbMotion' : 'onbNoMotion'}`}
                        src={c.heroSrc}
                        alt={c.heroAlt}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>

                    <div className="prose" style={{ marginTop: 10 }}>
                      <ul>
                        {c.bullets.map((b, i) => (
                          <li
                            key={b}
                            className={`onbBullet ${allowMotion ? 'onbMotion' : 'onbNoMotion'}`}
                            style={{ ['--d' as const]: `${i * 25}ms` } as React.CSSProperties}
                          >
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="muted" style={{ marginTop: 12 }}>
              「景點」可以晚點再看（有空再慢慢補連結）。
            </div>
          </div>

          <div className="modalActions">
            <button
              className="btn btnPrimary"
              ref={primaryBtnRef}
              onClick={onClose}
            >
              開始使用
            </button>

            <NavLink to="/itinerary" className="btn" onClick={onClose}>
              先看行程
            </NavLink>

            <button className="btn" type="button" onClick={onClose}>
              跳過
            </button>

            <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>（按 Esc 也可關閉）</div>
          </div>
      </div>
    </Modal>
  )
}

