import { useEffect, useMemo, useRef, useState } from 'react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import type { TransportSegmentId } from '../data/core'
import { MAP_CITIES, MAP_ROUTES, pathD, type Point } from '../map/data'
import { useMotionEnabled } from '../state/settings'

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
  const route = useMemo(() => MAP_ROUTES.find((r) => r.id === segmentId), [segmentId])
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const pathRef = useRef<SVGPathElement | null>(null)
  const markerRef = useRef<SVGCircleElement | null>(null)

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
    if (!motionEnabled) return
    const path = pathRef.current
    const marker = markerRef.current
    if (!path || !marker) return

    let raf = 0
    const durationMs = 10_000
    const len = path.getTotalLength()
    const start = performance.now()

    const tick = () => {
      const now = performance.now()
      const t = ((now - start) % durationMs) / durationMs
      const pt = path.getPointAtLength(t * len)
      marker.setAttribute('cx', String(pt.x))
      marker.setAttribute('cy', String(pt.y))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
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
          <div className="muted" style={{ fontSize: 13 }}>
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
                        src="/map/map.png"
                        alt="Iberian Peninsula map"
                        style={{ width: '100%', height: '100%', display: 'block' }}
                        draggable={false}
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
                          stroke="rgba(255,255,255,0.95)"
                          strokeWidth={6}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={0.85}
                        />
                        <path
                          ref={pathRef}
                          d={geo.d}
                          fill="none"
                          stroke="rgba(22,91,122,0.95)"
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
                              <circle cx={c.pt.x} cy={c.pt.y} r={6} fill="rgba(22,91,122,0.95)" />
                            </g>
                          )
                        })}

                        {/* moving marker placeholder: activated in map-motion todo */}
                        {motionEnabled && (
                          <circle
                            ref={markerRef}
                            cx={geo.a.x}
                            cy={geo.a.y}
                            r={7}
                            fill="rgba(255,200,55,0.95)"
                            stroke="rgba(0,0,0,0.35)"
                            strokeWidth={2}
                            opacity={0.95}
                          />
                        )}
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

