# 內容 SSOT（單一真實來源）

這個資料夾是旅遊內容的 {{bi:單一真實來源|SSOT}}。

### Key takeaways
- **只改 `src/content/*.md`**：App 會把內容編譯成 `src/generated/*.ts`，runtime 不直接讀 Markdown。
- **改完先跑 `npm run content:build`**：確保 schema 與輸出資料同步。
- **格式出錯會直接讓 build 失敗**：錯誤訊息會指到檔案與行號，照提示修就好。

## 你應該改哪裡？

- **SSOT（只改這些 Markdown 檔）**：`src/content/*.md`
  - 景點：`src/content/attractions.<cityId>.md` → `ATTRACTIONS_DATA`
  - 住宿：`src/content/stays.<cityId>.md` → `STAYS_DATA`
  - 交通：`src/content/transport.<segmentId>.md` → `TRANSPORT_DATA`
  - 行程：`src/content/itinerary.md` → `ITINERARY_PHASES`

較舊/雜記型的長文可以放在 `*.legacy.md`（build 會忽略它們）。

App 不會在 runtime 直接渲染整份 Markdown 文件；而是先把內容轉成 `src/generated/` 下的 TypeScript 資料，前端再用資料去 render。

為了讓內容好寫、UI 好讀，部分欄位支援 小範圍 Markdown 子集：

- `**粗體**`
- `` `行內 code` ``
- `[文字](https://example.com)` 連結（以及直接寫 `https://...`）
- 清單：`- item`、`1. item`
- 勾選清單：`- [ ] item`、`- [x] item`
- 引言：`> quoted text`

## 雙語寫法（中文為主 + 英文提示）

- **不可點雙語詞（term）**：`{{bi:中文|English}}`
  - 例：`這裡主要是 {{bi:石灰岩|limestone}}`
- **可點雙語連結（link）**：`{{bilink:中文|English|https://...}}`
  - 例：`#### {{bilink:石灰岩|Limestone|https://example.com}}`
- **重要限制**：避免在「用 | 分欄」的列表裡使用 `bi/bilink`
  - 像 `transport.*.md` 的 `bookingLinks:` / `screenshots:` 用 `- Label | url` 解析
  - 因為 `bi/bilink` 本身含 `|`，會把欄位切壞
  - **做法**：改寫成 `Label（English） | https://...`（不要用 `{{bi:...}}`）

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
title: {{bi:里斯本|Lisbon}}
---

# {{bi:里斯本|Lisbon}}

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
title: {{bi:里斯本|Lisbon}}住宿
---

# {{bi:里斯本|Lisbon}}住宿

## options
- Hotel name | status=primary
  - why: ...
  - risk: ...
  - link: Google Maps | https://maps.app.goo.gl/...

  # （可選）讓 why/risk 能分段：用縮排續寫（會保留換行）
  - why: 第一段第一行
    第一段第二行

    第二段（中間留空行）

## publicTransportHowToBuy
- ...

## moneySavingTips
- ...
```

### Transport (per segment)

```md
---
schema: v1
segmentId: lisbon-lagos
title: {{bi:里斯本|Lisbon}}→ {{bi:拉各斯|Lagos}}
---

# {{bi:里斯本|Lisbon}}→ {{bi:拉各斯|Lagos}}

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

## phase phase-lisbon | 里斯本 + {{bi:辛特拉|Sintra}}（5 天）

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

