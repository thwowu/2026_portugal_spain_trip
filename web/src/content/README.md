# Content SSOT

This folder is the **single source of truth** for trip content.

## What you should edit

- **SSOT (edit these Markdown files)**: `src/content/*.md`
  - Attractions: `src/content/attractions.<cityId>.md` → `ATTRACTIONS_DATA`
  - Stays: `src/content/stays.<cityId>.md` → `STAYS_DATA`
  - Transport: `src/content/transport.<segmentId>.md` → `TRANSPORT_DATA`
  - Itinerary: `src/content/itinerary.md` → `ITINERARY_PHASES`

Legacy long-form notes may be kept as `*.legacy.md` (these are ignored by the build).

The app does **not** render Markdown directly at runtime. Instead, we generate TypeScript data under `src/generated/`.

## Workflow

- **One-time split from master doc** (optional): `npm run content:split`
  - Produces `src/content/*.md` for long-form notes
- **Generate data for the app**: `npm run content:build`
  - Reads `src/content/*.md`
  - Writes `src/generated/*.ts`
- **Run the app**: `npm run dev` (runs generation first via `predev`)

## Validation & errors

Generation validates parsed Markdown with schemas (zod). If something is wrong, the build step will fail and point to the file and line number.

## Content Patch JSON (for AI-assisted updates)

The Dashboard has two exports:

- **Planning Export JSON**: for syncing decisions on phones (import back into the website).
- **Content Patch JSON**: for AI to update Markdown SSOT (`src/content/*.md`) deterministically.

In the Dashboard:

- Click **「匯出內容更新 JSON（給 AI）」**.
- Send the `.json` file to the person/LLM who maintains the repo.
- The JSON includes `targets[]` (domain/id → md file + anchors) and `payload.planning` (decisions/reasons).

## Markdown templates (copy/paste)

### Attractions (per city)

```md
---
schema: v1
cityId: lisbon
title: 里斯本 Lisbon
---

# 里斯本 Lisbon

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
title: 里斯本住宿
---

# 里斯本住宿

## options
- Hotel name | status=primary
  - why: ...
  - risk: ...
  - link: Google Maps | https://maps.app.goo.gl/...

## publicTransportHowToBuy
- ...

## moneySavingTips
- ...

## riskMatrix
| 項目 | Option A | Option B |
| --- | --- | --- |
| 電梯 | ✅ | ✅ |
| 櫃檯服務 | 24H | 24H |

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
title: 里斯本 → Lagos
---

# 里斯本 → Lagos

## tldr
- recommended: bus
- because: ...
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

## planB
- ...
```

### Itinerary

```md
---
schema: v1
---

# Itinerary

## phase phase-lisbon | 里斯本 + Sintra（5 天）

### day 1 | 里斯本 | 抵達日（時差回收）
- tags: easy
- summary:
  - morning: ...
  - noon: ...
  - evening: ...
```

## For family / non-engineers (optional)

If you don't want to edit Markdown files:

- Open the website on your phone
- Update decisions/notes in the UI (Dashboard)
- Use the **Export JSON** button to download a `.json` file
- Send that file to me on LINE (as a file attachment)

