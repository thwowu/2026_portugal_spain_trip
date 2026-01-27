import { useEffect, useMemo, useRef } from 'react'
import { MAP_CITIES, MAP_ROUTES, type Point } from '../map/data'
import { useMotionEnabled, useSettings } from '../state/settings'
import { withBaseUrl } from '../utils/asset'

type Route = (typeof MAP_ROUTES)[number]

function routeCmd(to: Point, c?: Point) {
  if (!c) return `L ${to.x} ${to.y}`
  return `Q ${c.x} ${c.y} ${to.x} ${to.y}`
}

function tripPathD(routes: Route[]) {
  const first = routes[0]
  if (!first) return ''
  const start = MAP_CITIES[first.from].pt
  let d = `M ${start.x} ${start.y}`
  for (const r of routes) {
    const from = MAP_CITIES[r.from].pt
    const to = MAP_CITIES[r.to].pt
    // Ensure continuity if data ever changes.
    if (d.endsWith(`${from.x} ${from.y}`) === false) d += ` M ${from.x} ${from.y}`
    d += ` ${routeCmd(to, r.c)}`
  }
  return d
}

export function ItineraryBackground() {
  const motionEnabled = useMotionEnabled()
  const { motion, prefersReducedMotion, uiMode } = useSettings()
  const pathRef = useRef<SVGPathElement | null>(null)
  const busRef = useRef<SVGGElement | null>(null)
  const trainRef = useRef<SVGGElement | null>(null)

  const tripRoutes = useMemo<Route[]>(() => {
    const ids = ['lisbon-lagos', 'lagos-seville', 'seville-granada', 'granada-madrid'] as const
    return ids.map((id) => MAP_ROUTES.find((r) => r.id === id)).filter(Boolean) as Route[]
  }, [])

  const d = useMemo(() => tripPathD(tripRoutes), [tripRoutes])

  useEffect(() => {
    const path = pathRef.current
    const bus = busRef.current
    const train = trainRef.current
    if (!path || !bus || !train) return

    const len = path.getTotalLength()
    let raf = 0
    let start = 0

    const place = (el: SVGGElement, t: number) => {
      const pt = path.getPointAtLength(Math.min(len, Math.max(0, t)) * len)
      el.setAttribute('transform', `translate(${pt.x} ${pt.y})`)
    }

    // Always show both markers (even in low-motion mode).
    place(bus, 0.05)
    place(train, 0.62)

    // Respect OS-level reduced motion: keep markers static.
    if (prefersReducedMotion) return

    // Keep animation in senior/low-motion mode too, but make it much slower.
    // (Still respects OS reduced motion.)
    const loopMs = motionEnabled ? 26000 : 95000

    const tick = (now: number) => {
      if (!start) start = now
      const t = ((now - start) % loopMs) / loopMs
      // Bus slightly leads, train slightly lags.
      place(bus, t)
      place(train, (t + 0.42) % 1)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [motionEnabled, motion, prefersReducedMotion])

  if (!d) return null

  const bgOpacity =
    uiMode === 'senior'
      ? motionEnabled
        ? 0.18
        : 0.17
      : motionEnabled
        ? 0.16
        : 0.14

  const markerOpacity = motionEnabled ? 0.78 : 0.74

  // Theme hooks (scoped by `.pageItinerary` wrapper on the page)
  const primary = 'var(--primary-color, #165b7a)'
  const border = 'var(--border-color, rgba(255,255,255,0.72))'

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <svg
        viewBox="0 0 1024 768"
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: 'absolute',
          inset: 0,
          width: '120%',
          height: '120%',
          left: '-10%',
          top: '-10%',
          filter: 'saturate(0.92) contrast(0.95)',
        }}
      >
        {/* Background map + routes (keep subtle, decorative). */}
        <g opacity={bgOpacity}>
          <image href={withBaseUrl('/map/map.jpg')} x={0} y={0} width={1024} height={768} />

          {/* Path */}
          <path d={d} fill="none" stroke={border} strokeWidth={10} strokeLinecap="round" opacity={0.55} />
          <path ref={pathRef} d={d} fill="none" stroke={primary} strokeWidth={4} strokeLinecap="round" opacity={0.7} />

          {/* City points */}
          {(['lisbon', 'lagos', 'seville', 'granada', 'madrid'] as const).map((cid) => {
            const c = MAP_CITIES[cid]
            return (
              <g key={cid}>
                <circle cx={c.pt.x} cy={c.pt.y} r={10} fill="white" opacity={0.55} />
                <circle cx={c.pt.x} cy={c.pt.y} r={5.5} fill={primary} opacity={0.7} />
              </g>
            )
          })}
        </g>

        {/* Markers: keep more visible than the background map. */}
        <g opacity={markerOpacity}>
          {/* Bus marker */}
          <g ref={busRef}>
            <circle cx={0} cy={0} r={14} fill="rgba(255,255,255,0.70)" stroke={border} strokeWidth={1} />
            <g transform="translate(-12 -9)">
              <rect x={0} y={3} width={24} height={12} rx={4} fill={primary} stroke="rgba(0,0,0,0.28)" strokeWidth={1.4} />
              <rect x={3} y={6} width={7} height={4} rx={1} fill="rgba(255,255,255,0.82)" />
              <rect x={11} y={6} width={7} height={4} rx={1} fill="rgba(255,255,255,0.82)" />
              <rect x={19} y={6} width={3} height={7} rx={1} fill="rgba(255,255,255,0.58)" />
              <circle cx={7} cy={16} r={2.3} fill="rgba(0,0,0,0.5)" />
              <circle cx={17} cy={16} r={2.3} fill="rgba(0,0,0,0.5)" />
            </g>
          </g>

          {/* Train marker (a tiny "car" for visual cue). */}
          <g ref={trainRef}>
            <circle cx={0} cy={0} r={14} fill="rgba(255,255,255,0.70)" stroke={border} strokeWidth={1} />
            <g transform="translate(-12 -9)">
              <rect
                x={0}
                y={3}
                width={24}
                height={12}
                rx={4}
                fill="color-mix(in oklab, var(--primary-color, #a05d34) 86%, black)"
                stroke="rgba(0,0,0,0.28)"
                strokeWidth={1.4}
              />
              <rect x={3} y={6} width={13} height={4} rx={1} fill="rgba(255,255,255,0.82)" />
              <rect x={17} y={6} width={4} height={7} rx={1} fill="rgba(255,255,255,0.58)" />
              <circle cx={7} cy={16} r={2.3} fill="rgba(0,0,0,0.5)" />
              <circle cx={17} cy={16} r={2.3} fill="rgba(0,0,0,0.5)" />
            </g>
          </g>
        </g>
      </svg>

      {/* Vignette to keep content readable */}
      <div
        className="overlay"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(1200px 700px at 20% 15%, rgba(255,255,255,0.00), rgba(255,255,255,0.35)), radial-gradient(1000px 620px at 80% 30%, rgba(255,255,255,0.00), rgba(255,255,255,0.28)), linear-gradient(to bottom, rgba(255,255,255,0.55), rgba(255,255,255,0.12) 40%, rgba(255,255,255,0.55))',
          mixBlendMode: 'screen',
        }}
      />
    </div>
  )
}

