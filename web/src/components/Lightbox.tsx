import { useEffect } from 'react'
import { useMotionEnabled } from '../state/settings'

export function Lightbox({
  open,
  src,
  alt,
  title,
  onClose,
}: {
  open: boolean
  src: string
  alt: string
  title?: string
  onClose: () => void
}) {
  const motionEnabled = useMotionEnabled()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ?? '圖片預覽'}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.62)',
        display: 'grid',
        placeItems: 'center',
        padding: 18,
        zIndex: 100,
        opacity: 1,
        transition: motionEnabled ? 'opacity 160ms ease' : undefined,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(980px, 100%)',
          background: 'var(--surface)',
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.12)',
          overflow: 'hidden',
          boxShadow: '0 28px 90px rgba(0,0,0,0.35)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: 12,
            borderBottom: '1px solid var(--hairline)',
          }}
        >
          <div style={{ fontWeight: 850 }}>{title ?? '圖片'}</div>
          <button className="btn" onClick={onClose}>
            關閉
          </button>
        </div>
        <div style={{ background: 'black' }}>
          <img
            src={src}
            alt={alt}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              transform: motionEnabled ? 'translateY(0)' : undefined,
            }}
          />
        </div>
      </div>
    </div>
  )
}

