import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'

export function Modal({
  open,
  ariaLabel,
  overlayClassName = 'modalOverlay',
  cardClassName = 'card modalCard',
  onClose,
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
  initialFocusRef?: RefObject<HTMLElement | null>
  overlayStyle?: CSSProperties
  cardStyle?: CSSProperties
  children: ReactNode
}) {
  const cardRef = useRef<HTMLDivElement | null>(null)
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

      const root = cardRef.current
      if (!root) return
      const selector =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      const first = root.querySelector<HTMLElement>(selector)
      ;(first ?? root).focus?.()
    }

    const raf = window.requestAnimationFrame(focusFirst)
    return () => window.cancelAnimationFrame(raf)
  }, [open, initialFocusRef])

  useEffect(() => {
    if (!open) return

    const getFocusables = () => {
      const root = cardRef.current
      if (!root) return [] as HTMLElement[]
      const selector =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((el) => el.tabIndex !== -1)
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
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={onClose}
      className={overlayClassName}
      style={overlayStyle}
    >
      <div
        ref={cardRef}
        className={cardClassName}
        onClick={(e) => e.stopPropagation()}
        style={cardStyle}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  )
}

