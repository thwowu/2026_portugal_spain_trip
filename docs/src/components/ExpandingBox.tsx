import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Modal } from './Modal'

type Props = {
  title: React.ReactNode
  meta?: React.ReactNode
  children: React.ReactNode

  /**
   * - 'accordion' (default): header toggles inline expand/collapse
   * - 'modal': show only header + "view full" button; content rendered in a Modal
   */
  variant?: 'accordion' | 'modal'

  /** px. Use 0 for true accordion; use >0 for "peek" read-more. */
  collapsedHeight?: number
  defaultOpen?: boolean

  moreLabel?: string
  lessLabel?: string

  /** For `variant="modal"`. */
  viewLabel?: string
  viewDisabled?: boolean
  /** For `variant="modal"`. Prefer passing a plain string for accessibility. */
  modalAriaLabel?: string

  /**
   * Show the bottom "展開/收起" button.
   * - true: always show
   * - false: never show (header toggle only)
   * - 'auto': show only when collapsedHeight > 0 (read-more peek)
   */
  footerToggle?: boolean | 'auto'

  /** Wrapper classes; defaults include `card` + `expBox`. */
  className?: string
  /** Extra inline style for wrapper (e.g. boxShadow: 'none'). */
  style?: React.CSSProperties
}

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ')
}

export function ExpandingBox({
  title,
  meta,
  children,
  variant = 'accordion',
  collapsedHeight = 0,
  defaultOpen = false,
  moreLabel = '展開…',
  lessLabel = '收起…',
  viewLabel = '看完整說明',
  viewDisabled = false,
  modalAriaLabel,
  footerToggle = 'auto',
  className,
  style,
}: Props) {
  const contentId = useId()
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(defaultOpen)
  const [modalOpen, setModalOpen] = useState(false)
  const [measured, setMeasured] = useState(0)

  const hasPeek = collapsedHeight > 0

  const maxHeight = useMemo(() => {
    if (open) return Math.max(measured, collapsedHeight)
    return collapsedHeight
  }, [open, measured, collapsedHeight])

  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return

    const measure = () => {
      // Use scrollHeight so it includes overflow content.
      setMeasured(el.scrollHeight)
    }

    measure()

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (ro) ro.observe(el)

    // Images might load after first measure.
    window.addEventListener('load', measure, { once: true })

    return () => {
      ro?.disconnect()
      window.removeEventListener('load', measure)
    }
  }, [])

  // Only show "read more" when there's actually something to expand.
  const needsPeekToggle = hasPeek && measured > collapsedHeight + 8
  const showFooterToggle =
    footerToggle === true || (footerToggle === 'auto' && collapsedHeight > 0 && needsPeekToggle)

  const fadeBg = typeof style?.background === 'string' ? style.background : undefined
  const mergedStyle = (fadeBg
    ? ({ ...style, '--exp-fade-bg': fadeBg } as React.CSSProperties)
    : style) as React.CSSProperties | undefined

  if (variant === 'modal') {
    const aria = modalAriaLabel ?? (typeof title === 'string' ? title : '完整說明')
    return (
      <>
        <section className={cx('card', 'expBox', 'expBoxModal', className)} style={mergedStyle}>
          <div className="expHeader expHeaderRow" role="group" aria-label={aria}>
            <span className="expHeaderTitle">{title}</span>
            <span className="expHeaderRight">
              {meta ? <span className="expHeaderMeta">{meta}</span> : null}
              <button
                type="button"
                className="btn btnPrimary"
                onClick={() => setModalOpen(true)}
                disabled={viewDisabled}
              >
                {viewLabel}
              </button>
            </span>
          </div>
        </section>

        <Modal
          open={modalOpen}
          ariaLabel={aria}
          onClose={() => setModalOpen(false)}
          overlayClassName="modalOverlay modalOverlayHigh"
          cardClassName="card modalCard"
          cardStyle={{ maxWidth: 'min(860px, 100%)' }}
        >
          <div className="cardInner">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 950, fontSize: 'var(--text-xl)', lineHeight: 1.15 }}>{title}</div>
                {meta ? (
                  <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 6 }}>
                    {meta}
                  </div>
                ) : null}
              </div>
              <button className="btn" onClick={() => setModalOpen(false)}>
                關閉
              </button>
            </div>

            <hr className="hr" />

            {children}
          </div>
        </Modal>
      </>
    )
  }

  return (
    <section
      className={cx('card', 'expBox', open && 'expOpen', !open && 'expClosed', hasPeek && 'expPeek', className)}
      style={mergedStyle}
    >
      <button
        type="button"
        className="expHeader"
        aria-controls={contentId}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="expHeaderTitle">{title}</span>
        <span className="expHeaderRight">
          {meta ? <span className="expHeaderMeta">{meta}</span> : null}
          <span className={cx('expChevron', open && 'expChevronOpen')} aria-hidden="true">
            ▾
          </span>
        </span>
      </button>

      <div
        id={contentId}
        className={cx('expContentWrap', !open && 'expContentWrapClosed')}
        style={{ '--exp-max': `${maxHeight}px`, '--exp-collapsed': `${collapsedHeight}px` } as React.CSSProperties}
      >
        <div ref={contentRef} className="expContentInner">
          {children}
        </div>
      </div>

      {showFooterToggle && (
        <div className={cx('expToggle', !open && 'expToggleClosed')}>
          <button type="button" className="btn expToggleBtn" onClick={() => setOpen((v) => !v)}>
            {open ? lessLabel : moreLabel}
          </button>
        </div>
      )}
    </section>
  )
}

