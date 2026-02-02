export const SECTION_TAB_LABEL: Record<string, string> = {
  must: '必去',
  easy: '輕鬆',
  rain: '雨備',
  views: '視角',
  routes: '路線',
  skip: '跳過',
  practical: '實用',
  food: '吃',
  photo: '拍照',
  safety: '安全',
}

export const TOOLBOX_KINDS = new Set(['food', 'safety', 'practical'])

export const SECTION_HUE: Record<string, { accent: string; accent2: string }> = {
  must: { accent: '#5d5fff', accent2: '#2c2e9b' },
  easy: { accent: '#1f7a3f', accent2: '#15512a' },
  rain: { accent: '#1c9bd0', accent2: '#0f3d52' },
  views: { accent: '#165b7a', accent2: '#0f3d52' },
  routes: { accent: '#0f6c8a', accent2: '#0f3d52' },
  skip: { accent: '#b42318', accent2: '#7a1610' },
  practical: { accent: '#165b7a', accent2: '#0f3d52' },
  food: { accent: '#b75c00', accent2: '#6a3400' },
  photo: { accent: '#7c3aed', accent2: '#4c1d95' },
  safety: { accent: '#b42318', accent2: '#7a1610' },
}

export function sectionHueVars(kind: string | undefined): React.CSSProperties {
  const k = (kind ?? '').trim()
  const v = SECTION_HUE[k]
  if (!v) return {}
  return {
    ['--rc-sec-accent' as never]: v.accent,
    ['--rc-sec-accent-2' as never]: v.accent2,
  } as React.CSSProperties
}

// If a section is extremely long, offer a dedicated reading modal.
// (2500 chars ~= a few screens on mobile; tuned for our current content.)
export const LONG_SECTION_MODAL_THRESHOLD_CHARS = 2500

