import { useEffect, useMemo, useRef, useState } from 'react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import type { TransportSegmentId } from '../data/core'
import { MAP_CITIES, MAP_ROUTES, pathD, type Point } from '../map/data'
import { useMotionEnabled } from '../state/settings'
import { withBaseUrl } from '../utils/asset'

function bbox(pts: Point[]) {
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }
}

export function TransportMapWidget({
  segmentId,
  height = 240,
}: {
  segmentId: TransportSegmentId
  height?: number
}) {
  const motionEnabled = useMotionEnabled()
  const primary = 'var(--primary-color, #165b7a)'
  const border = 'var(--border-color, rgba(255,255,255,0.95))'
  const route = useMemo(() => MAP_ROUTES.find((r) => r.id === segmentId), [segmentId])
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const pathRef = useRef<SVGPathElement | null>(null)
  const markerRef = useRef<SVGGElement | null>(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    const onLoad = () => setImgSize({ w: img.naturalWidth || 1024, h: img.naturalHeight || 768 })
    if (img.complete) onLoad()
    else img.addEventListener('load', onLoad)
    return () => img.removeEventListener('load', onLoad)
  }, [])

  const geo = useMemo(() => {
    if (!route) return null
    const a = MAP_CITIES[route.from].pt
    const b = MAP_CITIES[route.to].pt
    const c = route.c
    const d = pathD(a, b, c)
    const box = bbox(c ? [a, b, c] : [a, b])
    return { a, b, c, d, box }
  }, [route])

  useEffect(() => {
    // Always show the marker (even in low-motion mode).
    const marker = markerRef.current
    if (!marker || !geo) return
    marker.setAttribute('transform', `translate(${geo.a.x} ${geo.a.y})`)
  }, [geo, segmentId])

  useEffect(() => {
    if (!motionEnabled) return
    const path = pathRef.current
    const marker = markerRef.current
    const frame = frameRef.current
    if (!path || !marker || !frame) return

    const len = path.getTotalLength()
    let raf = 0

    const update = () => {
      raf = 0
      const rect = frame.getBoundingClientRect()
      // Progress as the widget scrolls through the viewport:
      // 0 when it's just below the viewport, 1 when it's just above.
      const raw = (window.innerHeight - rect.top) / (window.innerHeight + rect.height)
      const t = Math.min(1, Math.max(0, raw))
      const pt = path.getPointAtLength(t * len)
      marker.setAttribute('transform', `translate(${pt.x} ${pt.y})`)
    }

    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(update)
    }

    // Initialize once in case we land mid-page.
    update()

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [motionEnabled, segmentId])

  if (!route || !geo) {
    return (
      <div className="card" style={{ boxShadow: 'none' }}>
        <div className="cardInner">
          <div className="muted">找不到地圖路線資料。</div>
        </div>
      </div>
    )
  }

  const viewBox = imgSize ? `0 0 ${imgSize.w} ${imgSize.h}` : '0 0 1024 768'
  const mapW = imgSize?.w ?? 1024
  const mapH = imgSize?.h ?? 768

  return (
    <div className="card" style={{ boxShadow: 'none' }}>
      <div className="cardInner">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 900 }}>地圖</div>
          <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            單指拖曳、雙指縮放、雙擊放大；右下角有＋/－/重置
          </div>
        </div>

        <div style={{ height: 10 }} />

        <div
          className="card"
          style={{
            boxShadow: 'none',
            overflow: 'hidden',
            borderRadius: 16,
            borderStyle: 'solid',
          }}
        >
          <TransformWrapper
            minScale={1}
            maxScale={3}
            initialScale={1}
            limitToBounds
            centerOnInit
            wheel={{ step: 0.2 }}
            doubleClick={{ step: 0.6, mode: 'zoomIn' }}
            panning={{ velocityDisabled: true }}
          >
            {({ zoomIn, zoomOut, resetTransform, setTransform }) => {
              const fitToRoute = () => {
                // Fit the route bounding box into container.
                // We approximate by centering on the bbox center and choosing a scale.
                const padding = 80
                const frameW = frameRef.current?.clientWidth ?? 360
                const frameH = frameRef.current?.clientHeight ?? height
                const bw = geo.box.maxX - geo.box.minX + padding * 2
                const bh = geo.box.maxY - geo.box.minY + padding * 2
                const scale = Math.max(
                  1,
                  Math.min(3, Math.min(frameW / bw, frameH / bh) * 1.0),
                )
                const cx = (geo.box.minX + geo.box.maxX) / 2
                const cy = (geo.box.minY + geo.box.maxY) / 2
                // TransformWrapper uses x/y as translation in px in the scaled space
                const tx = -cx * scale + frameW / 2
                const ty = -cy * scale + frameH / 2
                setTransform(tx, ty, scale, 200)
              }

              return (
                <div ref={frameRef} style={{ position: 'relative', height }}>
                  <TransformComponent
                    wrapperStyle={{ width: '100%', height: '100%' }}
                    contentStyle={{ width: mapW, height: mapH }}
                  >
                    <div style={{ position: 'relative', width: mapW, height: mapH }}>
                      <img
                        ref={imgRef}
                        src={withBaseUrl('/map/map.jpg')}
                        alt="Iberian Peninsula map"
                        style={{ width: '100%', height: '100%', display: 'block' }}
                        draggable={false}
                        loading="lazy"
                        decoding="async"
                      />
                      <svg
                        viewBox={viewBox}
                        preserveAspectRatio="none"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          pointerEvents: 'none',
                        }}
                      >
                        <path
                          d={geo.d}
                          fill="none"
                          stroke={border}
                          strokeWidth={6}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={0.85}
                        />
                        <path
                          ref={pathRef}
                          d={geo.d}
                          fill="none"
                          stroke={primary}
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* city points */}
                        {[route.from, route.to].map((cid) => {
                          const c = MAP_CITIES[cid]
                          return (
                            <g key={cid}>
                              <circle cx={c.pt.x} cy={c.pt.y} r={10} fill="white" opacity={0.85} />
                              <circle cx={c.pt.x} cy={c.pt.y} r={6} fill={primary} opacity={0.95} />
                            </g>
                          )
                        })}

                        {/* bus marker (scroll-linked when motion is enabled) */}
                        <g ref={markerRef} aria-hidden="true">
                          {/* glow */}
                          <circle cx={0} cy={0} r={12} fill="rgba(255,255,255,0.75)" />
                          {/* bus (tiny SVG icon) */}
                          <g transform="translate(-11 -9)">
                            {/* body */}
                            <rect
                              x={0}
                              y={3}
                              width={22}
                              height={12}
                              rx={4}
                              fill={motionEnabled ? primary : 'color-mix(in oklab, var(--primary-color, #165b7a) 55%, white)'}
                              stroke="rgba(0,0,0,0.35)"
                              strokeWidth={1.5}
                            />
                            {/* windows */}
                            <rect x={3} y={6} width={6} height={4} rx={1} fill="rgba(255,255,255,0.88)" />
                            <rect x={10} y={6} width={6} height={4} rx={1} fill="rgba(255,255,255,0.88)" />
                            {/* door */}
                            <rect x={17} y={6} width={3} height={7} rx={1} fill="rgba(255,255,255,0.65)" />
                            {/* wheels */}
                            <circle cx={6} cy={16} r={2.2} fill="rgba(0,0,0,0.55)" />
                            <circle cx={16} cy={16} r={2.2} fill="rgba(0,0,0,0.55)" />
                          </g>
                        </g>
                      </svg>
                    </div>
                  </TransformComponent>

                  {/* Controls */}
                  <div
                    style={{
                      position: 'absolute',
                      right: 10,
                      bottom: 10,
                      display: 'grid',
                      gap: 8,
                      gridAutoFlow: 'row',
                    }}
                  >
                    <button className="btn btnPrimary" onClick={() => zoomIn()} aria-label="放大">
                      ＋
                    </button>
                    <button className="btn btnPrimary" onClick={() => zoomOut()} aria-label="縮小">
                      －
                    </button>
                    <button className="btn" onClick={() => fitToRoute()} aria-label="重置並對焦路線">
                      重置
                    </button>
                    <button className="btn" onClick={() => resetTransform()} aria-label="回到全圖">
                      全圖
                    </button>
                  </div>
                </div>
              )
            }}
          </TransformWrapper>
        </div>
      </div>
    </div>
  )
}

