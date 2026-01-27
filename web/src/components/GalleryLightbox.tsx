import { useEffect, useMemo, useState } from 'react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import { useMotionEnabled } from '../state/settings'

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
  const motionEnabled = useMotionEnabled()
  const safeInitial = Math.max(0, Math.min(images.length - 1, initialIndex ?? 0))
  const [idx, setIdx] = useState<number>(safeInitial)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(images.length - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, images.length])

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
      role="dialog"
      aria-modal="true"
      aria-label={headerTitle}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.62)',
        display: 'grid',
        placeItems: 'center',
        padding: 18,
        zIndex: 110,
        opacity: 1,
        transition: motionEnabled ? 'opacity 160ms ease' : undefined,
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1040px, 100%)',
          boxShadow: '0 28px 90px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
      >
        <div
          className="cardInner"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: 12,
            borderBottom: '1px solid var(--hairline)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 850 }}>{headerTitle}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {idx + 1}/{images.length}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={!canPrev} aria-label="上一張">
              ←
            </button>
            <button className="btn" onClick={() => setIdx((i) => Math.min(images.length - 1, i + 1))} disabled={!canNext} aria-label="下一張">
              →
            </button>
            <button className="btn" onClick={onClose}>
              關閉
            </button>
          </div>
        </div>

        <div style={{ background: 'black' }}>
          <TransformWrapper
            initialScale={1}
            minScale={1}
            maxScale={4}
            wheel={{ step: 0.12 }}
            doubleClick={{ disabled: true }}
            panning={{ velocityDisabled: true }}
          >
            <TransformComponent wrapperStyle={{ width: '100%', height: 'min(72vh, 720px)' }} contentStyle={{ width: '100%', height: '100%' }}>
              <img
                src={active.src}
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
        </div>

        <div style={{ padding: 12, borderTop: '1px solid var(--hairline)', background: 'var(--surface)' }}>
          <div
            style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              paddingBottom: 6,
              WebkitOverflowScrolling: 'touch',
            }}
            aria-label="縮圖（左右滑動）"
          >
            {images.map((im, i) => (
              <button
                key={`${im.src}-${i}`}
                type="button"
                className={`galleryThumb ${i === idx ? 'galleryThumbActive' : ''}`}
                onClick={() => setIdx(i)}
                aria-label={`切換到第 ${i + 1} 張`}
              >
                <img src={im.src} alt={im.alt ?? im.caption ?? `縮圖 ${i + 1}`} loading="lazy" />
              </button>
            ))}
          </div>
          {(active.caption || title) && (
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              {active.caption ?? ''}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

