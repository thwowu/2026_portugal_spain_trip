import type { ReactNode } from 'react'

type IconProps = {
  /** px */
  size?: number
  title?: string
}

function SvgIcon({
  size = 22,
  title,
  children,
}: IconProps & {
  children: ReactNode
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

export function IconItinerary(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M4 5m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
      <path d="M16 3l0 4" />
      <path d="M8 3l0 4" />
      <path d="M4 11l16 0" />
      <path d="M8 15h2v2h-2z" />
    </SvgIcon>
  )
}

export function IconTransport(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M21 13c0 -3.87 -3.37 -7 -10 -7h-8" />
      <path d="M3 15h16a2 2 0 0 0 2 -2" />
      <path d="M3 6v5h17.5" />
      <path d="M3 11v4" />
      <path d="M8 11v-5" />
      <path d="M13 11v-4.5" />
      <path d="M3 19h18" />
    </SvgIcon>
  )
}

export function IconStays(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M7 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M22 17v-3h-20" />
      <path d="M2 8v9" />
      <path d="M12 14h10v-2a3 3 0 0 0 -3 -3h-7v5z" />
    </SvgIcon>
  )
}

export function IconAttractions(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
      <path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z" />
    </SvgIcon>
  )
}

export function IconGoogleMaps(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      {/* simple map icon */}
      <path d="M9 18l-6 3v-15l6 -3l6 3l6 -3v15l-6 3l-6 -3z" />
      <path d="M9 3v15" />
      <path d="M15 6v15" />
    </SvgIcon>
  )
}

