import { useEffect, useMemo, useRef } from 'react'
import { MAP_CITIES, MAP_ROUTES, type Point } from '../map/data'
import { useMotionEnabled, useSettings } from '../state/settings'
import { withBaseUrl } from '../utils/asset'
import type { CityId } from '../data/core'

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

export function ItineraryBackground({ activeCityId }: { activeCityId: CityId }) {
  const motionEnabled = useMotionEnabled()
  const { motion, prefersReducedMotion } = useSettings()
  const pathRef = useRef<SVGPathElement | null>(null)
  const busRef = useRef<SVGGElement | null>(null)
  const trainRef = useRef<SVGGElement | null>(null)
  const rafRef = useRef<number>(0)
  const lastBusPtRef = useRef<Point | null>(null)
  const lastTrainPtRef = useRef<Point | null>(null)

  const tripRoutes = useMemo<Route[]>(() => {
    const ids = ['lisbon-lagos', 'lagos-seville', 'seville-granada', 'granada-madrid'] as const
    return ids.map((id) => MAP_ROUTES.find((r) => r.id === id)).filter(Boolean) as Route[]
  }, [])

  const d = useMemo(() => tripPathD(tripRoutes), [tripRoutes])

  useEffect(() => {
    const bus = busRef.current
    const train = trainRef.current
    if (!bus || !train) return

    const placeAt = (el: SVGGElement, pt: Point) => {
      el.setAttribute('transform', `translate(${pt.x} ${pt.y})`)
    }

    const routeOrder: Array<Exclude<CityId, 'sintra'>> = ['lisbon', 'lagos', 'seville', 'granada', 'madrid']

    const nextTravelCity = (cityId: CityId): Exclude<CityId, 'sintra'> => {
      const cur: Exclude<CityId, 'sintra'> = cityId === 'sintra' ? 'lisbon' : cityId
      const idx = routeOrder.indexOf(cur)
      if (idx < 0) return 'lisbon'
      return routeOrder[Math.min(routeOrder.length - 1, idx + 1)] ?? 'madrid'
    }

    const busTarget = MAP_CITIES[activeCityId].pt
    const trainTarget = MAP_CITIES[nextTravelCity(activeCityId)].pt

    const busFrom = lastBusPtRef.current ?? busTarget
    const trainFrom = lastTrainPtRef.current ?? trainTarget

    lastBusPtRef.current = busTarget
    lastTrainPtRef.current = trainTarget

    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const durationMs = prefersReducedMotion ? 0 : motionEnabled ? 520 : 900
    if (durationMs <= 0) {
      placeAt(bus, busTarget)
      placeAt(train, trainTarget)
      return
    }

    const ease = (t: number) => 1 - Math.pow(1 - t, 3)
    const start = performance.now()

    const tick = (now: number) => {
      const raw = (now - start) / durationMs
      const t = raw >= 1 ? 1 : raw <= 0 ? 0 : raw
      const k = ease(t)
      placeAt(bus, { x: busFrom.x + (busTarget.x - busFrom.x) * k, y: busFrom.y + (busTarget.y - busFrom.y) * k })
      placeAt(
        train,
        { x: trainFrom.x + (trainTarget.x - trainFrom.x) * k, y: trainFrom.y + (trainTarget.y - trainFrom.y) * k },
      )
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [activeCityId, motionEnabled, motion, prefersReducedMotion])

  if (!d) return null

  // User request: make the map fully visible (no haze / no transparency).
  const bgOpacity = 1
  const markerOpacity = 1

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
          filter: 'none',
        }}
      >
        {/* Background map + routes (keep subtle, decorative). */}
        <g opacity={bgOpacity}>
          <image href={withBaseUrl('/map/map.jpg')} x={0} y={0} width={1024} height={768} />

          {/* Path */}
          <path d={d} fill="none" stroke={border} strokeWidth={10} strokeLinecap="round" opacity={0.55} />
          <path ref={pathRef} d={d} fill="none" stroke={primary} strokeWidth={4} strokeLinecap="round" opacity={0.7} />

          {/* City points */}
          {(['lisbon', 'sintra', 'lagos', 'seville', 'granada', 'madrid'] as const).map((cid) => {
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

    </div>
  )
}

