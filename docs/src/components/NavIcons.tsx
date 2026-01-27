import calendarEventUrl from '../assets/tabler/calendar-event.svg?url'
import trainUrl from '../assets/tabler/train.svg?url'
import bedUrl from '../assets/tabler/bed.svg?url'
import mapPinUrl from '../assets/tabler/map-pin.svg?url'

type IconProps = {
  /** px */
  size?: number
  title?: string
}

function MaskIcon({ src, size = 22, title }: { src: string } & IconProps) {
  return (
    <span
      className="navIconSvg"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      style={{
        width: size,
        height: size,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
      }}
    />
  )
}

export function IconItinerary(props: IconProps) {
  return <MaskIcon {...props} src={calendarEventUrl} />
}

export function IconTransport(props: IconProps) {
  return <MaskIcon {...props} src={trainUrl} />
}

export function IconStays(props: IconProps) {
  return <MaskIcon {...props} src={bedUrl} />
}

export function IconAttractions(props: IconProps) {
  return <MaskIcon {...props} src={mapPinUrl} />
}

