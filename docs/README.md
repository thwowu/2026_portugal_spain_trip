# Trip Planner (葡西之旅) – Web app

這個資料夾 (`docs/`) 是旅遊行程的 **靜態網站 / Trip Planner**（React + Vite）。

- **內容 SSOT**：`docs/src/content/*.md`（建議只改這裡）
- **App 使用的資料**：`docs/src/generated/*.ts`（由腳本自動產生，勿手改）
- **部署**：GitHub Pages（workflow：`.github/workflows/deploy.yml`）

相關補充：
- 內容維護細節：`docs/src/content/README.md`
- 測試說明：`docs/TESTING.md`

## 快速開始

在專案根目錄下：

```bash
cd docs
npm ci
npm run dev
```

說明：
- `npm run dev` 會先跑 `content:build`（透過 `predev`），確保 `src/generated/*` 是最新的。

## 常用指令（在 `docs/` 執行）

- **dev**：`npm run dev`
- **build**：`npm run build`（會先 `content:build`，再 `tsc -b` + `vite build`）
- **preview**：`npm run preview`
- **lint**：`npm run lint`

### 內容（Markdown → generated TS）

- **檢查內容（不寫檔）**：`npm run content:check`
- **產生資料（會寫入 `src/generated/*`）**：`npm run content:build`
- **（可選）從 master doc 拆分**：`npm run content:split`

## 我應該改哪裡？

### A. 改行程內容（推薦）

只改 `docs/src/content/*.md`：
- `attractions.<cityId>.md`（景點）
- `stays.<cityId>.md`（住宿）
- `transport.<segmentId>.md`（交通）
- `itinerary.md`（行程）

改完後：
- 最快驗證：`npm run content:check`
- 或直接 `npm run dev` / `npm run build`（都會自動先產生/驗證內容）

### B. 用 UI 改決策（給手機/家人更方便）

網站的 Dashboard 支援：
- **Planning Export JSON**：把規劃決策匯出成 JSON，之後可再匯入（手機同步用）
- **Content Patch JSON**：給 AI/維護者用來「確定性地」回寫 `src/content/*.md`

細節請看：`docs/src/content/README.md` 的「Content Patch JSON」段落。

## 測試

（詳細：`docs/TESTING.md`）

- **Smoke（建議分享/部署前）**：

```bash
cd docs
npm run test:smoke
```

- **E2E（Playwright）**：

```bash
cd docs
npx playwright install
npm run test:e2e
```

## GitHub Pages（部署與路由）

- Push 到 `main` 或 `master` 會觸發 GitHub Actions build，並把 `docs/dist` 部署到 Pages。
- Vite `base` 會依 GitHub Pages 型態自動切換（User site 用 `/`，Project site 用 `/<repo>/`），見 `docs/vite.config.ts`。
- SPA deep link / refresh：使用 `docs/public/404.html` → `/?p=...` 的 fallback，`docs/index.html` 會把路由還原。  
