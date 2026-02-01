export function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

