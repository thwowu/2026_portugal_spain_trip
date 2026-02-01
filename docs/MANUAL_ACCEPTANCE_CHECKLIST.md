## Manual acceptance checklist (DoD)

- **Readability**
  - **Line length**: body text stays roughly \(65–75ch\) on desktop; no ultra-wide paragraphs.
  - **Rhythm**: paragraphs and lists have consistent spacing; no “wall of text”.
  - **Headings**: clear hierarchy; “Key takeaways” callout appears where authored.

- **Layout / overflow**
  - **No horizontal scroll** on common pages (except intentional carousels): `/itinerary`, `/transport`, `/stays`, `/attractions`.
  - **Long tokens** (URLs / code) wrap instead of overflowing.
  - **Breakout media**: inline images can widen (no negative-margin hacks), captions remain readable.

- **TOC / anchors**
  - **TOC**: long-read modal shows a collapsible TOC and clicking items scrolls correctly.
  - **Anchor offset**: heading jumps don’t hide under the sticky top bar.

- **Cards / responsiveness**
  - **Card grids degrade**: within narrow containers, card lists fall back to 1-column / horizontal scroll; widen to 2–3 columns without layout breakage.
  - **Touch**: carousels/toolbox rows scroll smoothly on mobile.

- **Accessibility**
  - **Keyboard**: tab order makes sense; modals trap focus and ESC closes.
  - **Contrast**: highlighted `::...::` text is still readable inside muted blocks.
  - **Semantics**: each route has an H1; header/main/nav landmarks exist.

- **Motion / zoom**
  - **Reduced motion**: with “低動態” mode, transitions don’t distract; no janky scroll animations.
  - **Zoom**: at 125%/150% browser zoom, nothing overlaps or becomes unusable (especially bottom nav).

- **Local verification commands**
  - **Smoke**: `npm run test:smoke`
  - **Visual regression**: `npm run test:visual` (or `npm run test:visual:update` to refresh baselines)
  - **A11y**: `npm run test:a11y`
  - **Lighthouse baseline**: `npm run test:lighthouse`

