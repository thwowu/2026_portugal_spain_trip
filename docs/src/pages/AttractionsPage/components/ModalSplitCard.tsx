import { useEffect, useRef, useState } from 'react'
import { Modal } from '../../../components/Modal'
import { FormattedInline } from '../../../components/FormattedText'

export function ModalSplitCard({
  ariaLabel,
  headerTitle,
  headerSub,
  onClose,
  overlayClassName = 'modalOverlay modalOverlayHigh',
  cardStyle,
  bodyTestId,
  progressTestId,
  footer,
  children,
}: {
  ariaLabel: string
  headerTitle: string
  headerSub?: string
  onClose: () => void
  overlayClassName?: string
  cardStyle?: React.CSSProperties
  bodyTestId?: string
  progressTestId?: string
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  const [scrollProgress, setScrollProgress] = useState(0)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  const computeProgress = () => {
    const el = bodyRef.current
    if (!el) return
    const denom = el.scrollHeight - el.clientHeight
    const p = denom <= 0 ? 1 : Math.min(1, Math.max(0, el.scrollTop / denom))
    setScrollProgress(p)
  }

  useEffect(() => {
    const raf = window.requestAnimationFrame(computeProgress)
    return () => window.cancelAnimationFrame(raf)
    // Recompute on open/content change signaled via ariaLabel changes.
  }, [ariaLabel])

  return (
    <Modal
      open
      ariaLabel={ariaLabel}
      onClose={onClose}
      overlayClassName={overlayClassName}
      cardClassName="card modalCard modalCardSplit"
      cardStyle={cardStyle}
    >
      <div className="modalCardSplitHeader">
        <div className="modalCardSplitHeaderTitle">
          <FormattedInline text={headerTitle} />
        </div>
        {headerSub ? <div className="modalCardSplitHeaderSub">{headerSub}</div> : null}
      </div>

      <div ref={bodyRef} className="modalCardSplitBody" onScroll={computeProgress} data-testid={bodyTestId}>
        {children}
      </div>

      <div className="modalCardSplitProgressTrack" aria-hidden="true">
        <div
          className="modalCardSplitProgressFill"
          style={{ width: `${Math.round(scrollProgress * 100)}%` }}
          data-testid={progressTestId}
        />
      </div>

      <div className="modalCardSplitFooter">
        {footer ?? (
          <>
            <button className="btn" type="button" onClick={onClose}>
              關閉
            </button>
            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
              （ESC 也可關閉）
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

