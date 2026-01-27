import { useEffect, useMemo, useRef, useState } from 'react'
import { withBaseUrl } from '../utils/asset'

type Props = {
  src: string
  fallbackSrc?: string
  /** Bigger = chunkier pixels */
  pixelSize?: number
  className?: string
}

/**
 * Render a pixelated (low-res) version of an image using <canvas>.
 * Designed as a decorative background layer (position absolutely via CSS).
 */
export function PixelatedBackground({ src, fallbackSrc, pixelSize = 16, className }: Props) {
  const primary = useMemo(() => withBaseUrl(src), [src])
  const fallback = useMemo(() => withBaseUrl(fallbackSrc ?? ''), [fallbackSrc])

  const [imgSrc, setImgSrc] = useState(primary)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    setImgSrc(primary)
  }, [primary])

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return

    let cancelled = false
    let raf = 0
    const img = new Image()
    img.decoding = 'async'
    img.src = imgSrc

    const coverDraw = () => {
      if (cancelled) return
      const wCss = Math.max(1, Math.floor(host.clientWidth))
      const hCss = Math.max(1, Math.floor(host.clientHeight))
      if (wCss <= 1 || hCss <= 1) return
      if (!img.naturalWidth || !img.naturalHeight) return

      // Render to a low-res buffer; CSS scaling does the pixelation.
      const w = Math.max(1, Math.floor(wCss / pixelSize))
      const h = Math.max(1, Math.floor(hCss / pixelSize))

      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.imageSmoothingEnabled = false

      // background-size: cover (but at low-res)
      const iw = img.naturalWidth
      const ih = img.naturalHeight
      const scale = Math.max(w / iw, h / ih)
      const sw = w / scale
      const sh = h / scale
      const sx = Math.max(0, (iw - sw) / 2)
      const sy = Math.max(0, (ih - sh) / 2)

      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
    }

    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(coverDraw)
    }

    const ro = new ResizeObserver(() => schedule())
    ro.observe(host)

    img.onload = () => schedule()
    img.onerror = () => {
      if (!fallbackSrc) return
      if (!fallback) return
      if (imgSrc !== fallback) setImgSrc(fallback)
    }

    // Initial attempt (in case cache hits and onload fires quickly).
    schedule()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [imgSrc, fallbackSrc, fallback, pixelSize])

  return (
    <div ref={hostRef} className={className} aria-hidden="true">
      <canvas ref={canvasRef} className="pixelBgCanvas" />
    </div>
  )
}

