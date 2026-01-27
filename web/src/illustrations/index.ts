export type IllustrationKey =
  | 'cover3d'
  | 'elderly'
  | 'map'
  | 'suitcase'
  | 'signpost'
  | 'safety'
  | 'heroDashboard'
  | 'heroTransport'
  | 'heroStays'
  | 'heroAttractions'
  | 'heroNotFound'

/**
 * Illustration consistency rule:
 * - Only `cover3d` is 3D and should be used ONLY on the itinerary cover.
 * - Everything else is flat and can be used across pages.
 *
 * Assets are served from `web/public/illustrations/*`.
 */
export const ILLUSTRATION: Record<IllustrationKey, { src: string; alt: string; style: '3d' | 'flat' }> =
  {
    cover3d: {
      src: '/illustrations/cover-3d.png',
      alt: '旅程封面插圖（飛機與行李）',
      style: '3d',
    },
    elderly: {
      src: '/illustrations/elderly.png',
      alt: '長輩旅客插圖',
      style: 'flat',
    },
    map: {
      src: '/illustrations/map.png',
      alt: '地圖插圖',
      style: 'flat',
    },
    suitcase: {
      src: '/illustrations/suitcase.png',
      alt: '行李插圖',
      style: 'flat',
    },
    signpost: {
      src: '/illustrations/signpost.png',
      alt: '路標插圖',
      style: 'flat',
    },
    safety: {
      src: '/illustrations/safety.png',
      alt: '安全提醒插圖',
      style: 'flat',
    },

    // 3D hero illustrations (prefer these for page headers).
    // If you haven't copied the files into `web/public/illustrations/` yet,
    // components should fall back to existing flat icons.
    heroDashboard: {
      src: '/illustrations/3d-airplane-globe-location.png',
      alt: '規劃看板（3D 插圖）',
      style: '3d',
    },
    heroTransport: {
      src: '/illustrations/3d-train-on-landscape.png',
      alt: '交通（3D 插圖）',
      style: '3d',
    },
    heroStays: {
      src: '/illustrations/3d-hotel-building-isometric.png',
      alt: '住宿（3D 插圖）',
      style: '3d',
    },
    heroAttractions: {
      src: '/illustrations/3d-around-the-world.png',
      alt: '景點（3D 插圖）',
      style: '3d',
    },
    heroNotFound: {
      src: '/illustrations/3d-nomad-working-on-chair.png',
      alt: '找不到頁面（3D 插圖）',
      style: '3d',
    },
  }

