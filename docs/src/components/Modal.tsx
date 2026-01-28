import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'

export function Modal({
  open,
  ariaLabel,
  overlayClassName = 'modalOverlay',
  cardClassName = 'card modalCard',
  onClose,
  floatingClose = true,
  closeAriaLabel = '關閉',
  initialFocusRef,
  overlayStyle,
  cardStyle,
  children,
}: {
  open: boolean
  ariaLabel: string
  overlayClassName?: string
  cardClassName?: string
  onClose: () => void
  /** Show an always-visible top-right close button (recommended for long content). */
  floatingClose?: boolean
  /** Accessible label for the close button. */
  closeAriaLabel?: string
  initialFocusRef?: RefObject<HTMLElement | null>
  overlayStyle?: CSSProperties
  cardStyle?: CSSProperties
  children: ReactNode
}) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
  const lastActiveRef = useRef<HTMLElement | null>(null)

  useLockBodyScroll(open)

  useEffect(() => {
    if (!open) return
    const el = document.activeElement
    lastActiveRef.current = el instanceof HTMLElement ? el : null
  }, [open])

  useEffect(() => {
    if (open) return
    const prev = lastActiveRef.current
    lastActiveRef.current = null
    if (prev && document.contains(prev)) prev.focus?.()
  }, [open])

  useEffect(() => {
    if (!open) return

    const focusFirst = () => {
      const preferred = initialFocusRef?.current
      if (preferred && document.contains(preferred)) {
        preferred.focus?.()
        return
      }

      const closeBtn = closeBtnRef.current
      if (floatingClose && closeBtn && document.contains(closeBtn)) {
        closeBtn.focus?.()
        return
      }

      const root = cardRef.current
      if (!root) return
      const selector =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      const first = root.querySelector<HTMLElement>(selector)
      ;(first ?? root).focus?.()
    }

    const raf = window.requestAnimationFrame(focusFirst)
    return () => window.cancelAnimationFrame(raf)
  }, [open, initialFocusRef, floatingClose])

  useEffect(() => {
    if (!open) return

    const getFocusables = () => {
      const closeBtn = closeBtnRef.current
      const root = cardRef.current
      if (!root) return [] as HTMLElement[]
      const selector =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      const withinCard = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((el) => el.tabIndex !== -1)
      return (floatingClose && closeBtn && !closeBtn.disabled ? [closeBtn, ...withinCard] : withinCard) as HTMLElement[]
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key !== 'Tab') return
      const focusables = getFocusables()
      if (focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (e.shiftKey) {
        if (!active || active === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, floatingClose])

  if (!open) return null
  if (typeof document === 'undefined') return null

  // Render into <body> to avoid `position: fixed` being constrained by
  // transformed ancestors (e.g. reveal animations), which can make the overlay
  // appear only within a card and "lock" the UI.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={onClose}
      className={overlayClassName}
      style={overlayStyle}
    >
      {floatingClose ? (
        <div className="modalCloseDock" aria-hidden="false">
          <button
            ref={closeBtnRef}
            type="button"
            className="btn modalCloseIconBtn"
            aria-label={closeAriaLabel}
            title={`${closeAriaLabel}（ESC）`}
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
          >
            ✕
          </button>
        </div>
      ) : null}
      <div
        ref={cardRef}
        className={cardClassName}
        onClick={(e) => e.stopPropagation()}
        style={cardStyle}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

