import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'

type Props = {
  title: string
  meta?: React.ReactNode
  children: React.ReactNode

  /** px. Use 0 for true accordion; use >0 for "peek" read-more. */
  collapsedHeight?: number
  defaultOpen?: boolean

  moreLabel?: string
  lessLabel?: string

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
  collapsedHeight = 0,
  defaultOpen = false,
  moreLabel = '展開…',
  lessLabel = '收起…',
  footerToggle = 'auto',
  className,
  style,
}: Props) {
  const contentId = useId()
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(defaultOpen)
  const [measured, setMeasured] = useState(0)

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

  const showFooterToggle = footerToggle === true || (footerToggle === 'auto' && collapsedHeight > 0)

  return (
    <section className={cx('card', 'expBox', className)} style={style}>
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
        style={{ '--exp-max': `${maxHeight}px` } as React.CSSProperties}
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

