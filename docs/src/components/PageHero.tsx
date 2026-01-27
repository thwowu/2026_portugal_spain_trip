import { useMemo, useState } from 'react'

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
  const [imgSrc, setImgSrc] = useState(image?.src ?? '')

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
            src={imgSrc}
            alt={image?.alt ?? '插圖'}
            loading="lazy"
            decoding="async"
            onError={() => {
              if (!image?.fallbackSrc) return
              if (imgSrc !== image.fallbackSrc) setImgSrc(image.fallbackSrc)
            }}
          />
        ) : null}
      </div>
    </div>
  )
}

