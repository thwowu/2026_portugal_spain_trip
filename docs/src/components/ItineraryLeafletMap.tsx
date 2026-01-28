import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { CityId } from '../data/core'
import { MAP_CITY_LATLNG } from '../map/geo'

type Waypoint = {
  step: number
  cityId: CityId
  title: string
}

function readCssVar(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

export function ItineraryLeafletMap({
  waypoints,
  activeStep,
  hoveredStep,
  onPickStepIndex,
}: {
  waypoints: Waypoint[]
  activeStep: number
  hoveredStep: number | null
  onPickStepIndex?: (idx: number) => void
}) {
  const mapElRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const busRef = useRef<L.Marker | null>(null)
  const onPickRef = useRef<typeof onPickStepIndex>(onPickStepIndex)

  useEffect(() => {
    onPickRef.current = onPickStepIndex
  }, [onPickStepIndex])

  const prefersReducedMotion =
    typeof window !== 'undefined' && typeof window.matchMedia !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  const latlngs = useMemo(() => waypoints.map((w) => MAP_CITY_LATLNG[w.cityId]), [waypoints])

  useEffect(() => {
    const el = mapElRef.current
    if (!el) return
    if (mapRef.current) return
    if (waypoints.length === 0) return

    const primary = readCssVar('--primary-color', '#a05d34')

    const map = L.map(el, {
      zoomControl: true,
      attributionControl: true,
      // Scrolly mode: keep page scrolling predictable; map follows the bus.
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
    })
    mapRef.current = map

    const first = latlngs[0] ?? MAP_CITY_LATLNG.lisbon
    map.setView([first.lat, first.lng], 6)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    // Trip polyline (straight segments; we keep it lightweight).
    L.polyline(
      latlngs.map((p) => [p.lat, p.lng] as [number, number]),
      { color: primary, dashArray: '12 12', weight: 4, opacity: 0.9 },
    ).addTo(map)

    // Numbered waypoint markers.
    markersRef.current = waypoints.map((w, idx) => {
      const icon = L.divIcon({
        className: 'number-icon',
        html: `<div>${idx + 1}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
      const ll = MAP_CITY_LATLNG[w.cityId]
      const marker = L.marker([ll.lat, ll.lng], { icon, keyboard: false })
        .bindPopup(`<strong>${w.title}</strong>`)
        .addTo(map)

      marker.on('click', () => {
        onPickRef.current?.(idx)
      })

      return marker
    })

    // Bus marker (the "active" indicator).
    const busIcon = L.divIcon({
      className: 'bus-icon',
      html: `
        <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" focusable="false">
          <circle cx="20" cy="20" r="18" fill="rgba(255,255,255,0.82)" stroke="rgba(0,0,0,0.12)" stroke-width="1" />
          <g transform="translate(9 12)">
            <rect x="0" y="3" width="22" height="12" rx="4" fill="currentColor" stroke="rgba(0,0,0,0.25)" stroke-width="1.2" />
            <rect x="3" y="6" width="6" height="4" rx="1" fill="rgba(255,255,255,0.86)" />
            <rect x="10" y="6" width="6" height="4" rx="1" fill="rgba(255,255,255,0.86)" />
            <rect x="17" y="6" width="3" height="8" rx="1" fill="rgba(255,255,255,0.62)" />
            <circle cx="6" cy="16" r="2.2" fill="rgba(0,0,0,0.5)" />
            <circle cx="16" cy="16" r="2.2" fill="rgba(0,0,0,0.5)" />
          </g>
        </svg>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    })

    const bus = L.marker([first.lat, first.lng], { icon: busIcon, keyboard: false, interactive: false }).addTo(map)
    busRef.current = bus

    // Fit to route bounds (with padding so it's not edge-to-edge).
    const bounds = L.latLngBounds(
      latlngs.map((p) => L.latLng(p.lat, p.lng)),
    )
    // User request: make the background map feel "closer".
    // Leaflet zoom is exponential; +1 zoom level ~= 2x closer.
    // Keep a conservative cap so 1–2 waypoint routes don't zoom into street level.
    map.fitBounds(bounds.pad(0.06), { animate: false, maxZoom: 9 })
    map.setZoom(Math.min(map.getZoom() + 1, 10), { animate: false })

    // Vite + Leaflet sometimes needs a size refresh after first paint.
    setTimeout(() => {
      map.invalidateSize()
    }, 100)

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current = []
      busRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (waypoints.length === 0) return

    const idx = Math.max(0, Math.min(waypoints.length - 1, activeStep))
    const wp = waypoints[idx]
    if (!wp) return
    const ll = MAP_CITY_LATLNG[wp.cityId]

    busRef.current?.setLatLng([ll.lat, ll.lng])

    // Toggle active class for number markers (purely visual).
    for (let i = 0; i < markersRef.current.length; i++) {
      const m = markersRef.current[i]
      const el = m.getElement()
      if (!el) continue
      if (i === idx) el.classList.add('isActive')
      else el.classList.remove('isActive')
    }

    // Keep the bus centered (not just moving the marker).
    map.setView([ll.lat, ll.lng], map.getZoom(), {
      animate: !prefersReducedMotion,
      duration: prefersReducedMotion ? 0 : 0.8,
    })
  }, [activeStep, prefersReducedMotion, waypoints])

  useEffect(() => {
    // Highlight marker when the corresponding card is hovered/focused.
    for (let i = 0; i < markersRef.current.length; i++) {
      const m = markersRef.current[i]
      const el = m.getElement()
      if (!el) continue
      if (hoveredStep != null && i === hoveredStep) el.classList.add('isHover')
      else el.classList.remove('isHover')
    }
  }, [hoveredStep])

  return (
    <div
      ref={mapElRef}
      className="itineraryLeafletMap"
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 0,
      }}
      aria-label="Leaflet map"
    />
  )
}

