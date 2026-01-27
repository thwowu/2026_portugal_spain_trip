import { useMemo, useState } from 'react'
import { withBaseUrl } from '../utils/asset'

export type HeroImage = {
  /** Primary src (prefer local `/illustrations/...`) */
  src: string
  /** Fallback src if primary 404s */
  fallbackSrc?: string
  alt: string
}

export function PageHero({
  title,
  subtitle,
  image,
  rightSlot,
}: {
  title: string
  subtitle?: React.ReactNode
  image?: HeroImage
  rightSlot?: React.ReactNode
}) {
  const [imgSrc, setImgSrc] = useState(withBaseUrl(image?.src ?? ''))

  const canShowImg = useMemo(() => !!image?.src, [image?.src])

  return (
    <div className="pageHero">
      <div className="pageHeroText">
        <div className="pageHeroTitle">{title}</div>
        {subtitle ? <div className="pageHeroSubtitle muted">{subtitle}</div> : null}
      </div>

      <div className="pageHeroRight">
        {rightSlot}
        {canShowImg ? (
          <img
            className="pageHeroImg"
            src={withBaseUrl(imgSrc)}
            alt={image?.alt ?? '插圖'}
            loading="lazy"
            decoding="async"
            onError={() => {
              if (!image?.fallbackSrc) return
              const next = withBaseUrl(image.fallbackSrc)
              if (imgSrc !== next) setImgSrc(next)
            }}
          />
        ) : null}
      </div>
    </div>
  )
}

