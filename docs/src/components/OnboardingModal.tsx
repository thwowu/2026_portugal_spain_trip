import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { IconItinerary, IconStays, IconTransport } from './NavIcons'
import { useMotionEnabled } from '../state/settings'
import { withBaseUrl } from '../utils/asset'
import { Modal } from './Modal'

export function OnboardingModal({ onClose }: { onClose: () => void }) {
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
          title: '交通（先看大建議）',
          subtitle: '火車 vs 巴士：先看「大建議」，需要再看完整。',
          heroSrc: withBaseUrl('/illustrations/3d-train-on-landscape.png'),
          heroAlt: '示意插圖：交通（3D）',
          bullets: ['先寫一句話原因（給爸媽看）', '需要細節再展開下面卡片'],
        },
        {
          icon: <IconStays />,
          title: '住宿（寫一句話原因）',
          subtitle: '給爸媽一眼看懂：交通方便／不用爬坡／有電梯。',
          heroSrc: withBaseUrl('/illustrations/suitcase.png'),
          heroAlt: '示意插圖：住宿',
          bullets: ['先把原因寫好就夠', '需要時再看風險/注意'],
        },
      ] as const,
    [],
  )

  const [step, setStep] = useState(0)
  const [interacted, setInteracted] = useState(false)
  const total = cards.length
  const current = cards[Math.max(0, Math.min(total - 1, step))] ?? cards[0]
  const isFirst = step <= 0
  const isLast = step >= total - 1

  useEffect(() => {
    // Preload hero images.
    for (const c of cards) {
      const img = new Image()
      img.decoding = 'async'
      img.src = c.heroSrc
    }
  }, [cards])

  useEffect(() => {
    // Auto-advance briefly for first-time users, but stop as soon as they interact.
    if (isLast) return
    if (interacted) return
    if (!allowMotion) return
    const t = window.setTimeout(() => {
      setStep((s) => Math.min(total - 1, s + 1))
    }, 6000)
    return () => window.clearTimeout(t)
  }, [step, total, isLast, interacted, allowMotion])

  return (
    <Modal
      open
      ariaLabel="第一次使用說明"
      onClose={onClose}
      initialFocusRef={primaryBtnRef}
      overlayClassName={`modalOverlay onbOverlay ${allowMotion ? 'onbMotion' : 'onbNoMotion'}`}
      cardClassName={`card modalCard onbCard ${allowMotion ? 'onbMotion' : 'onbNoMotion'}`}
    >
      <div className="cardInner">
        <div className="modalHeader">
          <div>
            <div className="modalTitle">第一次使用：給爸媽的 30 秒導覽</div>
            <div className="muted modalSub">之後也可以從右上角「使用說明」再打開，或到「設定」裡重播。</div>
          </div>
        </div>

        <hr className="hr" />

        <div key={String(step)} className={`onbStep onbSlide ${allowMotion ? 'onbMotion' : 'onbNoMotion'}`}>
          <div className="muted" style={{ marginTop: 2 }}>
            第 {step + 1}/{total} 頁：先看<strong>行程</strong>就好；其他頁面需要時再看。
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="card modalSectionCard">
              <div className="cardInner">
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span className="chip" aria-hidden="true">
                    {step + 1}
                  </span>
                  <div style={{ display: 'inline-flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
                    <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center' }}>
                      {current.icon}
                    </span>
                    <div style={{ fontWeight: 950, fontSize: 'var(--text-lg)', minWidth: 0 }}>{current.title}</div>
                  </div>
                </div>

                <div className="muted" style={{ marginTop: 8 }}>
                  {current.subtitle}
                </div>

                <div className="onbHero">
                  <img
                    className={`onbHeroImg ${allowMotion ? 'onbMotion' : 'onbNoMotion'}`}
                    src={current.heroSrc}
                    alt={current.heroAlt}
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                <div className="prose" style={{ marginTop: 10 }}>
                  <ul>
                    {current.bullets.map((b, i) => (
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
          </div>

          <div className="muted" style={{ marginTop: 12 }}>
            「景點」可以晚點再看（有空再慢慢補連結）。
          </div>

          <div className="onbDots" aria-label="導覽進度">
            {cards.map((c, i) => (
              <button
                key={c.title}
                type="button"
                className={`onbDot ${i === step ? 'onbDotActive' : ''}`}
                aria-label={`第 ${i + 1} 頁`}
                aria-current={i === step ? 'true' : undefined}
                onClick={() => {
                  setInteracted(true)
                  setStep(i)
                }}
              />
            ))}
          </div>
        </div>

        <div className="modalActions">
          <button
            className="btn"
            type="button"
            onClick={() => {
              setInteracted(true)
              setStep((s) => Math.max(0, s - 1))
            }}
            disabled={isFirst}
          >
            上一頁
          </button>

          {!isLast ? (
            <button
              className="btn btnPrimary"
              ref={primaryBtnRef}
              type="button"
              onClick={() => {
                setInteracted(true)
                setStep((s) => Math.min(total - 1, s + 1))
              }}
            >
              下一頁
            </button>
          ) : (
            <button className="btn btnPrimary" ref={primaryBtnRef} onClick={onClose}>
              開始使用
            </button>
          )}

          <NavLink to="/itinerary" className="btn" onClick={onClose}>
            先看行程
          </NavLink>

          <button className="btn" type="button" onClick={onClose}>
            跳過
          </button>

          <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            （按 Esc 也可關閉）
          </div>
        </div>
      </div>
    </Modal>
  )
}
