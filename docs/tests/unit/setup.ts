import '@testing-library/jest-dom/vitest'

// -------- Test environment shims (jsdom) --------
// Keep these minimal and behaviorally safe: they should unblock rendering without
// pretending to implement browser layout.

// Some components use matchMedia for reduced-motion checks.
if (typeof window !== 'undefined' && typeof window.matchMedia === 'undefined') {
  window.matchMedia = ((query: string) => {
    // Default test viewport: keep components in "mobile/tablet-ish" layouts unless
    // a test explicitly overrides. This keeps carousel-style UIs testable in jsdom.
    const width = (globalThis as unknown as { __VITEST_VIEWPORT_WIDTH__?: number }).__VITEST_VIEWPORT_WIDTH__ ?? 800

    const max = /max-width:\s*(\d+)px/i.exec(query)
    const min = /min-width:\s*(\d+)px/i.exec(query)

    let matches = false
    if (/prefers-reduced-motion:\s*reduce/i.test(query)) matches = false
    else if (max) matches = width <= Number(max[1])
    else if (min) matches = width >= Number(min[1])

    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList
  }) as typeof window.matchMedia
}

// Many components rely on scrollIntoView; jsdom doesn't implement layout.
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = function scrollIntoView() {}
}

// IntersectionObserver is used for reveal animations and "seen" tracking.
if (typeof window !== 'undefined' && typeof window.IntersectionObserver === 'undefined') {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null
    readonly rootMargin: string = '0px'
    readonly thresholds: ReadonlyArray<number> = []
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  }
  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
}

// ResizeObserver is used in App layout to set CSS vars.
if (typeof window !== 'undefined' && typeof window.ResizeObserver === 'undefined') {
  class MockResizeObserver implements ResizeObserver {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_callback: ResizeObserverCallback) {}
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
}

