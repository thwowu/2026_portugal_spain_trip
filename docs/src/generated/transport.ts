/**
 * AUTO-GENERATED FILE. DO NOT EDIT.
 * Source: src/content/transport.granada-madrid.md
 */
import type { TransportSegment } from '../data/transport'

export const TRANSPORT_DATA: TransportSegment[] = [
  {
    "id": "granada-madrid",
    "label": "格拉納達 → 馬德里",
    "tldr": {
      "recommended": "train",
      "because": "省時間（3.5h 左右）且路線清楚，適合規劃期先定。",
      "reminders": [
        "若要省錢可看巴士但會更久",
        "注意抵達站（含機場 T4 的班次差異）",
        "確認行李與座位"
      ]
    },
    "options": [
      {
        "mode": "train",
        "title": "火車（AVE）",
        "summary": "約 3.5 小時，直達為主。",
        "steps": [
          "Granada → Madrid（AVE）"
        ],
        "bookingLinks": [
          {
            "label": "Renfe",
            "href": "https://www.renfe.com/es/en"
          }
        ],
        "luggageNotes": [
          "直達較省事",
          "行李放置區確認"
        ],
        "riskNotes": [
          "票價浮動，提前買較穩"
        ],
        "ratings": {
          "simplicity": 5,
          "luggage": 4,
          "risk": 4,
          "comfort": 4,
          "cost": 2,
          "flexibility": 3
        },
        "screenshots": [
          {
            "label": "火車（示意）",
            "src": "/images/transport/granada-madrid-train.png"
          }
        ]
      },
      {
        "mode": "bus",
        "title": "巴士（較久、部分班次到機場）",
        "summary": "約 4.5–5 小時（示意）。",
        "steps": [
          "Granada → Madrid（南站或機場 T4）"
        ],
        "bookingLinks": [
          {
            "label": "Alda",
            "href": "https://www.alsa.com/en"
          }
        ],
        "luggageNotes": [
          "班次與到站點差異要看清楚",
          "行李上下車搬運"
        ],
        "riskNotes": [
          "長途誤點風險",
          "到站點不同會影響後續轉乘"
        ],
        "ratings": {
          "simplicity": 4,
          "luggage": 4,
          "risk": 3,
          "comfort": 3,
          "cost": 4,
          "flexibility": 4
        },
        "screenshots": [
          {
            "label": "巴士（示意）",
            "src": "/images/transport/granada-madrid-bus.png"
          }
        ]
      }
    ],
    "planB": [
      "火車滿位 → 看巴士到南站/機場",
      "若到機場 T4 → 同步調整後續交通安排"
    ]
  },
  {
    "id": "lagos-seville",
    "label": "Lagos → 塞維爾",
    "tldr": {
      "recommended": "bus",
      "because": "跨境以巴士最直覺（可直達 Plaza de Armas）。",
      "reminders": [
        "確認上車點與終點站",
        "提早到站",
        "留意跨境時間與護照"
      ]
    },
    "options": [
      {
        "mode": "bus",
        "title": "巴士（直達、時間較短）",
        "summary": "約 4h25m（示意）。",
        "steps": [
          "Lagos → Sevilla Plaza de Armas"
        ],
        "bookingLinks": [
          {
            "label": "巴士平台查班次（請自行搜尋路線）",
            "href": "https://shop.flixbus.de/"
          }
        ],
        "luggageNotes": [
          "直達較省事",
          "跨境段避免時間抓太緊"
        ],
        "riskNotes": [
          "誤點風險（塞車/邊境）",
          "提早到站避免錯過"
        ],
        "ratings": {
          "simplicity": 5,
          "luggage": 5,
          "risk": 4,
          "comfort": 3,
          "cost": 4,
          "flexibility": 3
        },
        "screenshots": [
          {
            "label": "巴士（示意）",
            "src": "/images/transport/lagos-seville-bus.png"
          }
        ]
      },
      {
        "mode": "train",
        "title": "（暫）火車/替代方案",
        "summary": "此段多以巴士為主；若要走火車通常更繞或需多段轉乘。",
        "steps": [
          "（以巴士為主，火車當備案再補）"
        ],
        "bookingLinks": [],
        "luggageNotes": [
          "多段轉乘搬行李風險較高"
        ],
        "riskNotes": [
          "方案不穩定，先不建議"
        ],
        "ratings": {
          "simplicity": 2,
          "luggage": 2,
          "risk": 2,
          "comfort": 3,
          "cost": 2,
          "flexibility": 2
        },
        "screenshots": [
          {
            "label": "Alda/Alsa（示意）",
            "src": "/images/transport/lagos-seville-bus-alt.png"
          }
        ]
      }
    ],
    "planB": [
      "巴士滿位 → 看其他班次/其他巴士",
      "若當天誤點 → 到站後改把行程排輕一點"
    ]
  },
  {
    "id": "lisbon-lagos",
    "label": "里斯本 → Lagos",
    "tldr": {
      "recommended": "bus",
      "because": "直達、少轉乘，帶大行李比較省事。",
      "reminders": [
        "出發站點確認（Oriente）",
        "提早到站 20–30 分鐘",
        "若想更舒服可改火車但要轉車"
      ]
    },
    "options": [
      {
        "mode": "train",
        "title": "火車（較舒適，但可能需要轉乘）",
        "summary": "約 3h46m（需轉 2 次車，依班表）。",
        "steps": [
          "Lisboa → Tunes",
          "Tunes 轉乘 → Lagos"
        ],
        "bookingLinks": [
          {
            "label": "CP 火車官網",
            "href": "https://www.cp.pt/passageiros/en"
          }
        ],
        "luggageNotes": [
          "轉乘時搬行李（樓梯/電梯不確定）",
          "保守抓轉乘緩衝時間"
        ],
        "riskNotes": [
          "轉乘時間太緊會增加風險",
          "班表/票價會隨日期變動"
        ],
        "ratings": {
          "simplicity": 3,
          "luggage": 3,
          "risk": 3,
          "comfort": 4,
          "cost": 3,
          "flexibility": 3
        },
        "screenshots": [
          {
            "label": "火車班次（示意）",
            "src": "/images/transport/lisbon-lagos-train.png"
          }
        ]
      },
      {
        "mode": "bus",
        "title": "巴士（直達、最省事）",
        "summary": "約 3h50m，直達，班次多。",
        "steps": [
          "Lisboa Oriente → Lagos（直達）"
        ],
        "bookingLinks": [
          {
            "label": "巴士平台查班次（請自行搜尋路線）",
            "href": "https://shop.global.flixbus.com/search"
          }
        ],
        "luggageNotes": [
          "直達不用轉乘搬運",
          "上車前把行李標記好"
        ],
        "riskNotes": [
          "主要風險是塞車/誤點",
          "上車點要提前確認"
        ],
        "ratings": {
          "simplicity": 5,
          "luggage": 5,
          "risk": 4,
          "comfort": 3,
          "cost": 4,
          "flexibility": 4
        },
        "screenshots": [
          {
            "label": "巴士班次/票價（示意）",
            "src": "/images/transport/lisbon-lagos-bus.png"
          }
        ]
      }
    ],
    "planB": [
      "火車票太貴/太麻煩 → 改直達巴士（查鄰近班次）",
      "巴士滿位 → 往前/往後找鄰近班次"
    ]
  },
  {
    "id": "seville-granada",
    "label": "塞維爾 → 格拉納達",
    "tldr": {
      "recommended": "train",
      "because": "更穩、更舒適；到站後直接入住休息。",
      "reminders": [
        "若要省錢可改巴士（但更久）",
        "帶行李避免轉太多次",
        "把 check-in 時間一起考量"
      ]
    },
    "options": [
      {
        "mode": "train",
        "title": "火車（較舒適）",
        "summary": "約 2h40m～3h30m（班次依日期）。",
        "steps": [
          "Seville → Granada（火車）"
        ],
        "bookingLinks": [
          {
            "label": "Renfe",
            "href": "https://www.renfe.com/es/en"
          }
        ],
        "luggageNotes": [
          "行李上車放置較容易",
          "到站後交通相對直覺"
        ],
        "riskNotes": [
          "票價可能較高",
          "熱門時段需提前買"
        ],
        "ratings": {
          "simplicity": 4,
          "luggage": 4,
          "risk": 4,
          "comfort": 4,
          "cost": 2,
          "flexibility": 3
        },
        "screenshots": [
          {
            "label": "火車（示意）",
            "src": "/images/transport/seville-granada-train.png"
          }
        ]
      },
      {
        "mode": "bus",
        "title": "巴士（較便宜、較久）",
        "summary": "約 3 小時（示意）",
        "steps": [
          "Seville (Plaza de Armas) → Granada Station"
        ],
        "bookingLinks": [
          {
            "label": "Alsa",
            "href": "https://www.alsa.com/en"
          }
        ],
        "luggageNotes": [
          "上車點固定，提早到站",
          "行李上下車搬運"
        ],
        "riskNotes": [
          "誤點風險",
          "旺季可能滿位"
        ],
        "ratings": {
          "simplicity": 4,
          "luggage": 4,
          "risk": 3,
          "comfort": 3,
          "cost": 4,
          "flexibility": 4
        },
        "screenshots": [
          {
            "label": "巴士（示意）",
            "src": "/images/transport/seville-granada-bus.png"
          }
        ]
      }
    ],
    "planB": [
      "火車票太貴 → 改 Alsa 巴士",
      "若選早班巴士 → 注意寄放行李與 check-in"
    ]
  }
]
