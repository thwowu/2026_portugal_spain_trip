# 內容 SSOT（單一真實來源）

這個資料夾是旅遊內容的 **單一真實來源（SSOT）**。

## 你應該改哪裡？

- **SSOT（只改這些 Markdown 檔）**：`src/content/*.md`
  - 景點：`src/content/attractions.<cityId>.md` → `ATTRACTIONS_DATA`
  - 住宿：`src/content/stays.<cityId>.md` → `STAYS_DATA`
  - 交通：`src/content/transport.<segmentId>.md` → `TRANSPORT_DATA`
  - 行程：`src/content/itinerary.md` → `ITINERARY_PHASES`

較舊/雜記型的長文可以放在 `*.legacy.md`（build 會忽略它們）。

App **不會在 runtime 直接渲染整份 Markdown 文件**；而是先把內容轉成 `src/generated/` 下的 TypeScript 資料，前端再用資料去 render。

為了讓內容好寫、UI 好讀，部分欄位支援 **小範圍 Markdown 子集**：

- `**粗體**`
- `` `行內 code` ``
- `[文字](https://example.com)` 連結（以及直接寫 `https://...`）
- 清單：`- item`、`1. item`
- 勾選清單：`- [ ] item`、`- [x] item`
- 引言：`> quoted text`

## 工作流程

- **（可選）從主文件拆分**：`npm run content:split`
  - 會產生/更新 `src/content/*.md` 的長文版本（用於整理初稿）
- **產生給 App 用的資料**：`npm run content:build`
  - 讀取 `src/content/*.md`
  - 寫入 `src/generated/*.ts`
- **啟動開發伺服器**：`npm run dev`（會先跑 `predev` 產生資料）

## 驗證與錯誤訊息

產生過程會用 schema（zod）驗證內容；如果內容格式不符合，build 會失敗，並提示錯誤的檔案與行數。

## Markdown 範本（直接複製貼上）

### Attractions (per city)

```md
---
schema: v1
cityId: lisbon
title: 里斯本（Lisbon）
---

# 里斯本（Lisbon）

## must
- ...

## easy
- ...

## rain
- ...

## views
- ...

## routes
- ...

## skip
- ...

## practical
- ...

## food
- ...

## photo
- ...

## safety
- ...
```

### Stays (per city)

```md
---
schema: v1
cityId: lisbon
title: 里斯本（Lisbon）住宿
---

# 里斯本（Lisbon）住宿

## options
- Hotel name | status=primary
  - why: ...
  - risk: ...
  - link: Google Maps | https://maps.app.goo.gl/...

## publicTransportHowToBuy
- ...

## moneySavingTips
- ...

## scoringModel
### weights
- 抵達日穩定性（長途交通後/第一晚） | weight=0.3
- 交通便利與爬坡風險 | weight=0.2
- 房間品質 | weight=0.2
- 評論一致性 | weight=0.15
- 成本效率 | weight=0.15

### table
| 住宿 | 抵達日穩定性（長途交通後/第一晚） | 交通便利與爬坡風險 | 房間品質 | 評論一致性 | 成本效率 | 加權積分 |
| --- | --- | --- | --- | --- | --- | --- |
| Option A | 5 | 5 | 5 | 4 | 3 | 4.35 |
| Option B | 4 | 5 | 4 | 4 | 3 | 4.05 |
```

### Transport (per segment)

```md
---
schema: v1
segmentId: lisbon-lagos
title: 里斯本（Lisbon）→ 拉各斯（Lagos）
---

# 里斯本（Lisbon）→ 拉各斯（Lagos）

## tldr
- recommended: bus
- reminders:
  - ...

## options
### bus | Title
- summary: ...
- steps:
  - ...
- bookingLinks:
  - Provider | https://example.com
- luggageNotes:
  - ...
- riskNotes:
  - ...
- ratings: simplicity=5 luggage=5 risk=4 comfort=3 cost=4 flexibility=4
- screenshots:
  - Label | /images/transport/example.png
```

### Itinerary

```md
---
schema: v1
---

# Itinerary

## phase phase-lisbon | 里斯本 + 辛特拉（Sintra）（5 天）

### day 1 | 里斯本 | 抵達日（時差回收）
- tags: easy
- summary:
  - morning: ...
  - noon: ...
  - evening: ...
```

## For family / non-engineers (optional)

如果你不想直接改 Markdown 檔：

- 可以直接在網站 UI 上補充/更新一些決策與備註
- 但主要內容仍以 `src/content/*.md` 為準（建議回到 repo 內統一維護）

