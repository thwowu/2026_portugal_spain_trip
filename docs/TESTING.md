# Testing

This project supports both **manual testing** and **automated smoke tests**.

## Quick commands (smoke)

From `web/`:

- `npm run content:check`
- `npm run lint`
- `npm run build`
- `npm run preview`
- `npm run test:smoke` (runs check + lint + build)

### When to run what

- **After editing any `web/src/content/*.md`**: `npm run content:check` (or `npm run build`, since `prebuild` regenerates content).
- **Before sharing/deploying**: `npm run test:smoke`.
- **Before major changes/releases**: `npm run test:e2e` (covers routing + persistence + import/export).

## Automated E2E (Playwright, headless)

### One-time setup

From `web/`:

- `npm install`
- `npx playwright install`

### Run

From `web/`:

- `npm run test:e2e` (build + preview + headless tests)
- `npm run test:e2e:headed` (headed mode)
- `npm run test:e2e:ui` (Playwright UI runner)

Notes:
- The tests start `vite preview` on `127.0.0.1:4173` via `web/playwright.config.ts`.
- The smoke suite covers:
  - Routing + bottom nav
  - 404 page
  - GitHub Pages fallback-style restore via `/?p=...`
  - Dashboard persistence (localStorage)
  - Export JSON download + import back

## Manual test checklist (high priority)

### A. Routing & navigation (incl. GitHub Pages behavior)

- **Bottom nav** (`web/src/App.tsx`)
  - Tap/click: 看板 / 行程 / 交通 / 住宿 / 景點 → correct page content is visible.
- **GitHub Pages SPA fallback**
  - On Pages, open a deep link like `/itinerary`, refresh, and confirm it stays on the same page.
  - Mechanism: `web/public/404.html` redirects to `/?p=...`, and `web/index.html` restores the route.
- **404**
  - Visit unknown path → `找不到這個頁面`, link back to `規劃看板` works.

### B. State persistence (localStorage) & import/export

- **Keys**
  - Settings: `tripPlanner.settings.v1` (`web/src/state/settings.tsx`)
  - Planning: `tripPlanner.planning.v1` (`web/src/state/planning.tsx`)
- **Persistence**
  - Change transport decision + reason; add checklist item; add changelog; adjust weights → reload page → state remains.
- **Export/Import**
  - Export JSON triggers a download.
  - Import the exported JSON restores state and shows success message.
  - Import invalid JSON shows error and does not break existing state.
- **Reset**
  - Clear the 2 keys in localStorage → reload → returns to initial state (`web/src/main.tsx`).

### C. Content correctness (md → generated)

- `npm run content:check` passes.
- If itinerary day numbers are not contiguous, `content:check` fails (see `web/scripts/build-content.mjs` `validateItinerary()`).
- App pages render without runtime errors using `web/src/generated/*`.

### D. Mobile UX

- Bottom nav is not obstructing content; tap targets feel large enough.
- Itinerary sticky mini nav works; jump-to-day works.
- Transport screenshots carousel scrolls horizontally; lightbox opens and closes.
- Stays tables scroll horizontally on small screens.
- Attractions extension modal scrolls and closes on mobile.

### E. Accessibility & reduced motion

- Keyboard reachable controls: nav, buttons, selects, details/summary, modal close.
- Attractions extension modal uses `role="dialog" aria-modal="true"` and is closable.
- Motion toggle:
  - `prefers-reduced-motion` should result in reduced animation behavior.
  - Switching to “低動態” should avoid smooth scrolling where possible.

