import { useEffect, useMemo, useRef, useState } from 'react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import { withBaseUrl } from '../utils/asset'

export type GalleryImage = {
  src: string
  alt?: string
  caption?: string
}

export function GalleryLightbox({
  open,
  title,
  images,
  initialIndex,
  onClose,
}: {
  open: boolean
  title?: string
  images: GalleryImage[]
  initialIndex?: number
  onClose: () => void
}) {
  // Mount/unmount the stateful lightbox so we can initialize index without
  // calling setState inside an effect (react-hooks/set-state-in-effect).
  if (!open) return null
  return (
    <GalleryLightboxInner
      open={open}
      title={title}
      images={images}
      initialIndex={initialIndex}
      onClose={onClose}
    />
  )
}

function GalleryLightboxInner({
  open,
  title,
  images,
  initialIndex,
  onClose,
}: {
  open: boolean
  title?: string
  images: GalleryImage[]
  initialIndex?: number
  onClose: () => void
}) {
  const safeInitial = Math.max(0, Math.min(images.length - 1, initialIndex ?? 0))
  const [idx, setIdx] = useState<number>(safeInitial)
  const [collapsed, setCollapsed] = useState<boolean>(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(images.length - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, images.length])

  useEffect(() => {
    if (!open) return

    const focusClose = () => {
      const btn = closeBtnRef.current
      if (btn && document.contains(btn)) btn.focus?.()
    }

    const raf = window.requestAnimationFrame(focusClose)
    return () => window.cancelAnimationFrame(raf)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const root = panelRef.current
      if (!root) return
      const target = e.target as Node | null
      if (target && root.contains(target)) return
      onClose()
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [open, onClose])

  const active = images[idx]

  const headerTitle = useMemo(() => {
    const t = (title ?? '').trim()
    if (t) return t
    return '圖庫'
  }, [title])

  if (!active) return null

  const canPrev = idx > 0
  const canNext = idx < images.length - 1

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={headerTitle}
      className={`card galleryPanel ${collapsed ? 'galleryPanelCollapsed' : ''}`}
    >
      <div className="galleryPanelHeader">
        <div className="galleryPanelTitleRow">
          <div className="galleryPanelTitle" title={headerTitle}>
            {headerTitle}
          </div>
          <div className="galleryPanelCount muted">
            {idx + 1}/{images.length}
          </div>
        </div>

        <div className="galleryPanelActions">
          <button
            className="btn galleryIconBtn"
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? '展開圖庫' : '收合圖庫'}
            aria-expanded={!collapsed}
            title={collapsed ? '展開' : '收合'}
          >
            {collapsed ? '▴' : '▾'}
          </button>

          <button
            className="btn galleryIconBtn"
            type="button"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={!canPrev}
            aria-label="上一張"
            title="上一張（←）"
          >
            ←
          </button>
          <button
            className="btn galleryIconBtn"
            type="button"
            onClick={() => setIdx((i) => Math.min(images.length - 1, i + 1))}
            disabled={!canNext}
            aria-label="下一張"
            title="下一張（→）"
          >
            →
          </button>
          <button
            className="btn galleryCloseBtn"
            type="button"
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="關閉"
            title="關閉（ESC）"
          >
            ✕
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="galleryPanelMedia">
            <img
              className="galleryPanelBackdrop"
              src={withBaseUrl(active.src)}
              alt=""
              aria-hidden="true"
              draggable={false}
            />
            <TransformWrapper
              initialScale={1}
              minScale={1}
              maxScale={4}
              wheel={{ step: 0.12 }}
              doubleClick={{ disabled: true }}
              panning={{ velocityDisabled: true }}
            >
              <TransformComponent
                wrapperStyle={{ width: '100%', height: 'min(48vh, 420px)' }}
                contentStyle={{ width: '100%', height: '100%' }}
              >
                <img
                  src={withBaseUrl(active.src)}
                  alt={active.alt ?? active.caption ?? headerTitle}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </TransformComponent>
            </TransformWrapper>
            <div className="galleryPanelMediaShade" aria-hidden="true" />
            <div className="galleryPanelMediaOverlay" aria-hidden="true">
              <div className="galleryPanelMediaOverlayInner">
                <div className="galleryPanelMediaOverlayTitle">{headerTitle}</div>
                <div className="galleryPanelMediaOverlayMeta">
                  <span>
                    {idx + 1}/{images.length}
                  </span>
                  {(active.caption || title) && (
                    <span className="galleryPanelMediaOverlayCaption">{(active.caption ?? '').trim()}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="galleryPanelFooter">
            <div className="galleryPanelThumbs" aria-label="縮圖（左右滑動）">
              {images.map((im, i) => (
                <button
                  key={`${im.src}-${i}`}
                  type="button"
                  className={`galleryThumb ${i === idx ? 'galleryThumbActive' : ''}`}
                  onClick={() => setIdx(i)}
                  aria-label={`切換到第 ${i + 1} 張`}
                >
                  <img src={withBaseUrl(im.src)} alt={im.alt ?? im.caption ?? `縮圖 ${i + 1}`} loading="lazy" />
                </button>
              ))}
            </div>

            <div className="galleryPanelMeta">
              {(active.caption || title) && <div className="galleryPanelCaption muted">{active.caption ?? ''}</div>}
              <div className="galleryPanelHint muted">ESC 關閉、←/→ 切換、滾輪縮放、拖曳可平移</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

