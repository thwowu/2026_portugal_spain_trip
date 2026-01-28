import { withBaseUrl } from '../utils/asset'

export type IllustrationKey =
  | 'cover3d'
  | 'elderly'
  | 'map'
  | 'suitcase'
  | 'signpost'
  | 'safety'
  | 'heroDashboard'
  | 'heroTransport'
  | 'heroAttractions'
  | 'heroNotFound'

/**
 * Illustration consistency rule:
 * - Only `cover3d` is 3D and should be used ONLY on the itinerary cover.
 * - Everything else is flat and can be used across pages.
 *
 * Assets are served from `docs/public/illustrations/*`.
 */
export const ILLUSTRATION: Record<IllustrationKey, { src: string; alt: string; style: '3d' | 'flat' }> =
  {
    cover3d: {
      src: withBaseUrl('/illustrations/cover-3d.jpg'),
      alt: '旅程封面插圖（飛機與行李）',
      style: '3d',
    },
    elderly: {
      src: withBaseUrl('/illustrations/elderly.png'),
      alt: '長輩旅客插圖',
      style: 'flat',
    },
    map: {
      src: withBaseUrl('/illustrations/map.png'),
      alt: '地圖插圖',
      style: 'flat',
    },
    suitcase: {
      src: withBaseUrl('/illustrations/suitcase.png'),
      alt: '行李插圖',
      style: 'flat',
    },
    signpost: {
      src: withBaseUrl('/illustrations/signpost.png'),
      alt: '路標插圖',
      style: 'flat',
    },
    safety: {
      src: withBaseUrl('/illustrations/safety.png'),
      alt: '安全提醒插圖',
      style: 'flat',
    },

    // 3D hero illustrations (prefer these for page headers).
    // If you haven't copied the files into `docs/public/illustrations/` yet,
    // components should fall back to existing flat icons.
    heroDashboard: {
      src: withBaseUrl('/illustrations/3d-airplane-globe-location.jpg'),
      alt: '規劃看板（3D 插圖）',
      style: '3d',
    },
    heroTransport: {
      src: withBaseUrl('/illustrations/3d-train-on-landscape.jpg'),
      alt: '交通（3D 插圖）',
      style: '3d',
    },
    heroAttractions: {
      src: withBaseUrl('/illustrations/3d-around-the-world.jpg'),
      alt: '景點（3D 插圖）',
      style: '3d',
    },
    heroNotFound: {
      src: withBaseUrl('/illustrations/3d-nomad-working-on-chair.jpg'),
      alt: '找不到頁面（3D 插圖）',
      style: '3d',
    },
  }

